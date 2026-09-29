import Stripe from 'stripe'
import mongoose from 'mongoose'
import { randomBytes, randomUUID } from 'node:crypto'
import moment from 'moment'
import config from '../../../config/config.js'
import * as mail from '../../../config/mail.js'
import * as emails from '../../utils/emails.js'
import Member from '../../models/Member.js'
import TempMember from '../../models/TempMember.js'
import Payment from '../../models/Payment.js'
import Product from '../../models/Product.js'
import { log } from '../../utils/logger.js'
import { failure, success } from '../../utils/responses.js'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-08-26.dahlia' })
  : null

// Membership years end on July 31 in Finland, including that entire day.
export function computeMembershipEndDate(duration: number, current?: Date, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year').value)
  const month = Number(parts.find((part) => part.type === 'month').value)
  const endYear =
    current && current > now ? current.getUTCFullYear() + duration : year + (month >= 8 ? 1 : 0) + duration - 1
  return new Date(Date.UTC(endYear, 6, 31, 20, 59, 59, 999))
}

export function createPaymentService({ stripeClient = stripe, sendMail = mail.sendMailWithLogging } = {}) {
  async function createPayment(request, response) {
    if (!stripeClient) return response.status(503).json(failure('PAYMENTS_DISABLED', 'Maksaminen ei ole käytössä.'))
    const { productId, checkoutId } = request.body
    if (
      typeof productId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(productId) ||
      typeof checkoutId !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(checkoutId)
    ) {
      return response.status(400).json(failure('INVALID_CHECKOUT', 'Virheelliset maksutiedot.'))
    }
    const member = request.user
    const product = await Product.findOne({ productId })
    if (
      !product ||
      !Number.isSafeInteger(product.priceSnt) ||
      product.priceSnt <= 0 ||
      (product.category === 'Membership' &&
        (!Number.isSafeInteger(product.membershipDuration) || product.membershipDuration < 1)) ||
      (member instanceof TempMember && product.category !== 'Membership')
    ) {
      return response.status(400).json(failure('INVALID_PRODUCT', 'Tuotetta ei voi maksaa.'))
    }
    const checkoutKey = `${member._id}:${checkoutId}`
    let payment
    try {
      payment = await Payment.findOneAndUpdate(
        { checkoutKey },
        {
          $setOnInsert: {
            checkoutKey,
            memberId: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            hometown: member.hometown,
            timestamp: new Date(),
            productId,
            productName: product.name,
            amountSnt: product.priceSnt,
            membershipDuration: product.category === 'Membership' ? product.membershipDuration : undefined,
            stamp: randomBytes(32).toString('hex'),
            reference: randomUUID(),
            status: 'Pending',
            processed: false,
            livemode: /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || ''),
          },
        },
        { upsert: true, returnDocument: 'after', runValidators: true }
      )
    } catch (error) {
      if (error.code !== 11000) throw error
      payment = await Payment.findOne({ checkoutKey })
    }
    if (payment.productId !== productId)
      return response.status(409).json(failure('CHECKOUT_CONFLICT', 'Aloita uusi maksu.'))
    try {
      let session
      if (payment.stripeCheckoutSessionId) {
        session = await stripeClient.checkout.sessions.retrieve(payment.stripeCheckoutSessionId)
      } else {
        session = await stripeClient.checkout.sessions.create(
          {
            line_items: [
              {
                price_data: {
                  currency: 'eur',
                  unit_amount: payment.amountSnt,
                  product_data: { name: payment.productName },
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            adaptive_pricing: { enabled: false },
            customer_email: payment.email,
            success_url: config.clientUrl.replace(/\/$/, '') + '/member/pay/return?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: config.clientUrl.replace(/\/$/, '') + '/member/pay/return?canceled=true',
            client_reference_id: payment._id.toString(),
            metadata: { paymentId: payment._id.toString() },
            integration_identifier: 'jasenrekisteri-checkout-qmzntrwp',
          },
          { idempotencyKey: `checkout-${payment._id}` }
        )
        await Payment.updateOne({ _id: payment._id }, { stripeCheckoutSessionId: session.id })
      }
      if (session.status !== 'open' || !session.url) {
        return response.status(409).json(failure('CHECKOUT_CLOSED', 'Maksu on jo käsitelty tai vanhentunut.'))
      }
      response.cookie(`payment_${session.id}`, payment.stamp, {
        httpOnly: true,
        secure: config.env === 'production' || request.secure,
        sameSite: 'lax',
        path: '/api/pay/session-status',
        maxAge: 24 * 60 * 60 * 1000,
      })
      response.set('Cache-Control', 'no-store')
      return response.json(
        success('Siirrytään maksamaan.', { url: session.url, stamp: payment.stamp, sessionId: session.id })
      )
    } catch (error) {
      log.error('Stripe Checkout request failed: ' + (error.type || 'unknown'))
      return response.status(502).json(failure('CHECKOUT_UNAVAILABLE', 'Maksun aloitus epäonnistui. Yritä uudelleen.'))
    }
  }

  async function fulfillSession(checkout: Stripe.Checkout.Session) {
    if (checkout.payment_status !== 'paid') return
    const paymentId = checkout.metadata?.paymentId
    if (!paymentId) return
    if (!mongoose.isValidObjectId(paymentId)) throw new Error('Missing payment reference')
    await mongoose.connection.transaction(async (session) => {
      const payment = await Payment.findById(paymentId).session(session)
      if (!payment) throw new Error('Payment record missing')
      if (payment.processed) return
      const mismatch =
        (payment.stripeCheckoutSessionId && payment.stripeCheckoutSessionId !== checkout.id) ||
        checkout.mode !== 'payment' ||
        checkout.currency !== 'eur' ||
        checkout.amount_total !== payment.amountSnt ||
        (payment.livemode !== undefined && checkout.livemode !== payment.livemode)
      if (mismatch) {
        payment.needsManualReview = true
        payment.reviewReason = 'Stripe session does not match the local payment.'
        await payment.save({ session })
        return
      }
      payment.stripeCheckoutSessionId = checkout.id
      payment.stripePaymentIntentId =
        typeof checkout.payment_intent === 'string' ? checkout.payment_intent : checkout.payment_intent?.id
      let member = await Member.findById(payment.memberId).session(session)
      if (!member) {
        const temp = await TempMember.findById(payment.memberId).session(session)
        if (!temp || !payment.membershipDuration) {
          payment.needsManualReview = true
          payment.reviewReason = 'Member or membership duration missing.'
          await payment.save({ session })
          return
        }
        member = new Member({
          ...temp.toObject(),
          role: 'Member',
          accessRights: false,
          accepted: false,
          accountCreated: new Date(),
          membershipStarts: new Date(),
          password: randomBytes(32).toString('hex'),
        })
        payment.newMember = true
      }
      if (payment.membershipDuration)
        member.membershipEnds = computeMembershipEndDate(payment.membershipDuration, member.membershipEnds)
      await member.save({ session })
      await TempMember.deleteOne({ _id: member._id }).session(session)
      payment.membershipEnds = member.membershipEnds
      payment.status = 'Success'
      payment.processed = true
      if (payment.needsManualReview) payment.notifiedAt = undefined
      payment.needsManualReview = false
      payment.reviewReason = undefined
      await payment.save({ session })
    })
    await notifyPayment(paymentId)
  }

  async function notifyPayment(paymentId: string) {
    const payment = await Payment.findOneAndUpdate(
      {
        _id: paymentId,
        notifiedAt: { $exists: false },
        $or: [{ notificationLease: { $exists: false } }, { notificationLease: { $lt: new Date() } }],
      },
      { notificationLease: new Date(Date.now() + 60000) },
      { returnDocument: 'after' }
    )
    if (!payment) {
      const existing = await Payment.findById(paymentId)
      if (existing && !existing.notifiedAt) throw new Error('Notification in progress')
      return
    }
    try {
      if (payment.needsManualReview) {
        await sendMail(
          {
            from: mail.mailSender,
            to: mail.boardMailAddress,
            subject: 'Maksu vaatii käsittelyn',
            text: `Maksu ${payment._id}: ${payment.reviewReason}`,
          },
          'payment-review'
        )
      } else if (payment.processed) {
        const receipt = emails.receiptMail(
          payment.firstName,
          payment.lastName,
          '',
          payment.email,
          payment.productName,
          payment.amountSnt / 100,
          moment(payment.timestamp).format('DD.MM.YYYY HH:mm:ss'),
          moment(payment.membershipEnds).format('DD.MM.YYYY')
        )
        if (payment.newMember) {
          receipt.text += `\n\nTervetuloa jäseneksi! Aseta salasanasi sähköpostiosoitteellasi: ${config.clientUrl}/forgot\nHallitus hyväksyy jäsenyytesi erikseen.`
          await sendMail(
            {
              from: mail.mailSender,
              to: mail.boardMailAddress,
              subject: 'Uusi jäsen odottaa hyväksyntää',
              text: `Uusi maksettu jäsenyys: ${payment.memberId}. Tarkista tiedot jäsenrekisterissä.`,
            },
            'new-member'
          )
        }
        await sendMail({ from: mail.mailSender, to: payment.email, ...receipt }, 'payment-receipt')
      } else {
        throw new Error('Payment is not fulfilled')
      }
      await Payment.updateOne(
        { _id: paymentId },
        { $set: { notifiedAt: new Date() }, $unset: { notificationLease: 1, notificationError: 1 } }
      )
    } catch (error) {
      await Payment.updateOne(
        { _id: paymentId },
        { $set: { notificationError: 'Notification delivery failed.' }, $unset: { notificationLease: 1 } }
      )
      throw error
    }
  }

  async function stripeWebhook(request, response) {
    if (!stripeClient || !process.env.STRIPE_WEBHOOK_SECRET) return response.sendStatus(503)
    let event: Stripe.Event
    try {
      event = stripeClient.webhooks.constructEvent(
        request.body,
        request.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch {
      return response.sendStatus(400)
    }
    try {
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        await fulfillSession(event.data.object)
      } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
        await Payment.updateOne(
          { stripeCheckoutSessionId: event.data.object.id, processed: false },
          { status: event.type === 'checkout.session.expired' ? 'Expired' : 'Failed' }
        )
      }
      return response.sendStatus(200)
    } catch {
      log.error('Stripe webhook fulfillment failed; delivery will be retried.')
      return response.sendStatus(500)
    }
  }

  async function getPaymentStatus(request, response) {
    response.set('Cache-Control', 'no-store')
    const { session_id: sessionId } = request.query
    if (typeof sessionId !== 'string' || !/^cs_[a-zA-Z0-9_-]{1,200}$/.test(sessionId)) {
      return response.status(400).json(failure('INVALID_PAYMENT', 'Maksun tunniste puuttuu.'))
    }
    const stamp = request.query.stamp ?? request.cookies?.[`payment_${sessionId}`]
    if (typeof stamp !== 'string' || stamp.length < 30) {
      return response.status(400).json(failure('INVALID_PAYMENT', 'Maksun tunniste puuttuu.'))
    }
    const payment = await Payment.findOne({ stripeCheckoutSessionId: sessionId, stamp })
    if (!payment) return response.status(404).json(failure('PAYMENT_NOT_FOUND', 'Maksua ei löytynyt.'))
    if (payment.needsManualReview) {
      return response.json(success('Maksu vastaanotettu. Hallitus tarkistaa jäsenyyden.', { state: 'review' }))
    }
    if (payment.processed && payment.status === 'Success') {
      return response.json(
        success('Maksun käsittely onnistui.', {
          state: 'complete',
          paymentData: {
            firstName: payment.firstName,
            lastName: payment.lastName,
            email: payment.email,
            membershipEnds: payment.membershipEnds,
            amount: payment.amountSnt,
            timestamp: payment.timestamp,
            product: payment.productName,
            newMember: !!payment.newMember,
          },
        })
      )
    }
    return response.json(
      success(payment.status === 'Pending' ? 'Maksua käsitellään.' : 'Maksu ei valmistunut.', {
        state: payment.status.toLowerCase(),
      })
    )
  }
  return { createPayment, stripeWebhook, getPaymentStatus, fulfillSession, notifyPayment }
}

export default createPaymentService()
