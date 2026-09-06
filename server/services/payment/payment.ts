'use strict'

import Stripe from 'stripe'
import { v1 as uuidv1 } from 'uuid'
import moment from 'moment'
import generator from 'generate-password'

import httpResponses from './index.js'
import cryptoRandomString from 'crypto-random-string'
import * as mail from '../../../config/mail.js'
import * as emails from '../../utils/emails.js'

import Member from '../../models/Member.js'
import TempMember from '../../models/TempMember.js'
import Payment from '../../models/Payment.js'
import Product from '../../models/Product.js'
import { log } from '../../utils/logger.js'
import { failure, success } from '../../utils/responses.js'

// Pinned so a future SDK upgrade or Stripe account-level default change can't
// silently alter request/response shapes. Update deliberately.
const STRIPE_API_VERSION = '2026-08-26.dahlia'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION })
  : null

function sendMail(options) {
  mail.transporter.sendMail(options, mail.callback)
  mail.logMessage(options)
}

// Membership year runs Aug 1 - Jul 31.
function anchorMembershipYear() {
  const now = moment()
  return now.month() < 7 ? now.year() : now.year() + 1
}

// Anchors to today instead of a stale stored date when there's no
// currently-active membership, so a lapsed member renewing today can't end
// up with a membershipEnds date still in the past.
function computeMembershipEndDate(membershipDuration, currentMembershipEnds) {
  const now = moment()
  const hasActiveMembership =
    currentMembershipEnds && moment(currentMembershipEnds).isValid() && moment(currentMembershipEnds).isAfter(now)

  const endYear = hasActiveMembership
    ? moment(currentMembershipEnds).year() + membershipDuration
    : anchorMembershipYear() + membershipDuration - 1

  return moment(endYear + '-07-31').toDate()
}

// The money is real even if we can't tell what it should grant - flag it and
// alert the board instead of returning an error that discards the payment.
async function flagForManualReview(payment, reason) {
  payment.needsManualReview = true
  await payment.save()
  log.error('Payment ' + payment._id + ' flagged for manual review: ' + reason)

  sendMail({
    from: mail.mailSender,
    to: mail.boardMailAddress,
    subject: 'Maksu vaatii käsittelyn: ' + payment._id,
    text:
      'Maksu (id: ' +
      payment._id +
      ', stamp: ' +
      payment.stamp +
      ') meni läpi Stripessä, mutta sitä ei voitu käsitellä automaattisesti. Syy: ' +
      reason +
      '. Tarkista maksu manuaalisesti.',
  })
}

function sendReceiptAndRespond(member, payment) {
  const receiptMail = emails.receiptMail(
    member.firstName,
    member.lastName,
    member.utuAccount,
    member.email,
    payment.productName,
    payment.amountSnt / 100,
    moment(payment.timestamp).format('DD.MM.YYYY HH:mm:ss'),
    moment(member.membershipEnds).format('DD.MM.YYYY')
  )
  sendMail({
    from: mail.mailSender,
    to: member.email,
    subject: receiptMail.subject,
    text: receiptMail.text,
  })

  return {
    success: true,
    message: 'Maksun käsittely onnistui.',
    paymentData: {
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      membershipEnds: member.membershipEnds,
      amount: payment.amountSnt,
      timestamp: payment.timestamp,
      product: payment.productName,
    },
  }
}

// Fallback for products not yet provisioned by `npm run create-product`, or
// edited without updating Stripe. Guarded with an atomic findOneAndUpdate so
// two concurrent checkouts for the same stale product can't both create a
// new Stripe Price and race to write it back.
async function ensureStripeProduct(product, productObj) {
  if (product.stripeProductId && product.stripePriceId) {
    const stripePrice = await stripe.prices.retrieve(product.stripePriceId)
    if (stripePrice.currency === 'eur' && stripePrice.unit_amount === productObj.priceSnt) {
      return productObj
    }
  }

  let stripeProductId = product.stripeProductId
  let stripePriceId

  if (!stripeProductId) {
    const stripeProduct = await stripe.products.create({
      name: productObj.name,
      default_price_data: { currency: 'eur', unit_amount: productObj.priceSnt },
    })
    stripeProductId = stripeProduct.id
    stripePriceId =
      typeof stripeProduct.default_price === 'string' ? stripeProduct.default_price : stripeProduct.default_price?.id
  } else {
    const stripePrice = await stripe.prices.create({
      currency: 'eur',
      unit_amount: productObj.priceSnt,
      product: stripeProductId,
    })
    await stripe.products.update(stripeProductId, { default_price: stripePrice.id })
    stripePriceId = stripePrice.id
  }

  const updated = await Product.findOneAndUpdate(
    { _id: product._id, stripePriceId: product.stripePriceId },
    { stripeProductId: stripeProductId, stripePriceId: stripePriceId },
    { new: true }
  ).exec()

  // If someone else won the race, use their saved values instead of the
  // (now-orphaned) ones we just created.
  const finalProduct = updated || (await Product.findById(product._id).exec())
  return finalProduct.toObject()
}

async function createPayment(request, response) {
  let memberId = request.user._id
  let productId = request.body.productId

  const memberQuery = Member.findOne({ _id: memberId })
  const member = await memberQuery.exec()
  // If not found try tempMembers (just joined)
  const tempMember = member ? null : await TempMember.findOne({ _id: memberId }).exec()
  if (!member && !tempMember) return response.json(httpResponses.onError)
  const memberObj = (member ?? tempMember).toObject()

  try {
    if (!stripe) return response.json(httpResponses.onError)
    const product = await Product.findOne({ productId: productId }).exec()
    if (!product) return response.json(httpResponses.onError)

    // Fail before charging, not after - once Stripe has the money we can no
    // longer just reject the request.
    if (product.category === 'Membership' && !product.membershipDuration) {
      log.error('Product ' + product.productId + ' is a Membership product with no membershipDuration set')
      return response.json(httpResponses.onError)
    }

    // Reuse an open checkout instead of creating a duplicate on a
    // double-submitted request.
    const recentPending = await Payment.findOne({
      memberId: memberObj._id,
      productId: productId,
      status: 'Pending',
      processed: false,
      timestamp: { $gte: moment().subtract(30, 'minutes').toDate() },
    }).exec()

    if (recentPending && recentPending.stripeCheckoutSessionId) {
      const existingSession = await stripe.checkout.sessions.retrieve(recentPending.stripeCheckoutSessionId)
      if (existingSession.status === 'open') {
        return response.json({ url: existingSession.url, stamp: recentPending.stamp })
      }
    }

    let productObj = await ensureStripeProduct(product, product.toObject())

    // Also the only value besides the Stripe session id that ties a browser
    // to its own payment - see getPaymentStatus, which requires a matching
    // stamp before returning member details for a session_id.
    const stamp = cryptoRandomString({ length: 30 })

    const reference = uuidv1()

    let newPayment = new Payment()
    newPayment.memberId = memberObj._id
    newPayment.firstName = memberObj.firstName
    newPayment.lastName = memberObj.lastName
    newPayment.email = memberObj.email
    newPayment.hometown = memberObj.hometown
    newPayment.timestamp = new Date()
    newPayment.productId = productObj.productId
    newPayment.productName = productObj.name
    newPayment.amountSnt = productObj.priceSnt
    // Snapshot so a later Product edit can't retroactively change this grant.
    newPayment.membershipDuration = productObj.membershipDuration
    newPayment.stamp = stamp
    newPayment.status = 'Pending'
    newPayment.reference = reference
    newPayment.processed = false

    const savedPayment = await newPayment.save()
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: productObj.stripePriceId, quantity: 1 }],
      mode: 'payment',
      customer_email: memberObj.email,
      success_url: process.env.CLIENTURL + '/member/pay/return?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.CLIENTURL + '/member/pay/return?canceled=true',
      metadata: { paymentId: savedPayment._id.toString() },
    })
    savedPayment.stripeCheckoutSessionId = session.id
    await savedPayment.save()
    return response.json({ url: session.url, stamp: stamp })
  } catch (error) {
    log.error('Create Stripe Checkout Session error: ' + error)
    return response.json(httpResponses.onError)
  }
}

// Returns a plain result object rather than writing to a response - callers
// (webhook, status poll) decide separately what to expose to whoever they're
// responding to.
async function processPaymentReturn(status, stamp) {
  if (!stamp) return httpResponses.onPaymentError

  if (status === 'fail') {
    const payment = await Payment.findOneAndUpdate(
      { stamp: stamp, processed: false },
      { status: 'Canceled', processed: true },
      { new: true }
    ).exec()
    if (!payment) return httpResponses.onPaymentNotFoundOrAlredyProcessed
    return httpResponses.onPaymentCancel
  }

  if (status !== 'ok') return httpResponses.onPaymentError

  const payment = await Payment.findOneAndUpdate(
    { stamp: stamp, processed: false },
    { status: 'Success', processed: true },
    { new: true }
  ).exec()
  if (!payment) return httpResponses.onPaymentNotFoundOrAlredyProcessed

  try {
    const member = await Member.findOne({ _id: payment.memberId }).exec()

    if (member) {
      if (!payment.membershipDuration) {
        return sendReceiptAndRespond(member, payment)
      }

      const membershipEnds = computeMembershipEndDate(payment.membershipDuration, member.membershipEnds)
      const updatedMember = await Member.findOneAndUpdate(
        { _id: member._id },
        { membershipEnds: membershipEnds },
        { new: true }
      ).exec()
      if (!updatedMember) return httpResponses.onPaymentError
      return sendReceiptAndRespond(updatedMember, payment)
    }

    const tempMember = await TempMember.findOne({ _id: payment.memberId }).exec()
    if (!tempMember) return httpResponses.onPaymentError

    if (!payment.membershipDuration) {
      await flagForManualReview(
        payment,
        'Uusi jäsen maksoi tuotteesta (' + payment.productId + '), jolle ei ole määritelty jäsenyyden pituutta.'
      )
      return httpResponses.onPaymentSuccess
    }

    const membershipEnds = computeMembershipEndDate(payment.membershipDuration, null)
    const password = generator.generate({ length: 8, numbers: true })

    const newMember = new Member()
    newMember._id = tempMember._id
    newMember.firstName = tempMember.firstName
    newMember.lastName = tempMember.lastName
    newMember.utuAccount = tempMember.utuAccount
    newMember.email = tempMember.email
    newMember.hometown = tempMember.hometown
    newMember.tyyMember = !!tempMember.tyyMember
    newMember.tiviaMember = !!tempMember.tiviaMember
    newMember.accessRights = false
    newMember.role = 'Member'
    newMember.membershipStarts = new Date()
    newMember.membershipEnds = membershipEnds
    newMember.accountCreated = new Date()
    newMember.accepted = false
    newMember.password = password

    await newMember.save()

    const newMemberMemberMail = emails.newMemberMemberMail(
      newMember.firstName,
      newMember.lastName,
      newMember.email,
      newMember.utuAccount,
      newMember.hometown,
      newMember.tyyMember ? 'Kyllä' : 'Ei',
      newMember.tiviaMember ? 'Kyllä' : 'Ei',
      password,
      payment.productName,
      payment.amountSnt / 100,
      moment(payment.timestamp).format('DD.MM.YYYY HH:mm:ss'),
      moment(newMember.membershipEnds).format('DD.MM.YYYY')
    )
    sendMail({
      from: mail.mailSender,
      to: newMember.email,
      subject: newMemberMemberMail.subject,
      text: newMemberMemberMail.text,
    })

    const newMemberBoardMail = emails.newMemberBoardMail(
      newMember.firstName,
      newMember.lastName,
      newMember.email,
      newMember.utuAccount,
      newMember.hometown,
      newMember.tyyMember ? 'Kyllä' : 'Ei',
      newMember.tiviaMember ? 'Kyllä' : 'Ei',
      payment.productName
    )
    sendMail({
      from: mail.mailSender,
      to: mail.boardMailAddress,
      subject: newMemberBoardMail.subject,
      text: newMemberBoardMail.text,
    })

    return {
      success: true,
      message: 'Maksun käsittely onnistui.',
      paymentData: {
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        email: newMember.email,
        membershipEnds: newMember.membershipEnds,
        amount: payment.amountSnt,
        timestamp: payment.timestamp,
        product: payment.productName,
      },
    }
  } catch (error) {
    log.error('Payment ' + payment._id + ' fulfillment failed after being marked processed: ' + error)
    await flagForManualReview(payment, 'Jäsenyyden käsittely epäonnistui maksun jälkeen: ' + error.message)
    return httpResponses.onPaymentSuccess
  }
}

async function stripeWebhook(request, response) {
  if (!stripe) return response.sendStatus(500)
  let event
  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      request.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    log.error('Stripe webhook signature verification failed: ' + error)
    return response.sendStatus(400)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      let payment = await Payment.findOne({ stripeCheckoutSessionId: session.id }).exec()
      if (!payment && session.metadata && session.metadata.paymentId) {
        payment = await Payment.findById(session.metadata.paymentId).exec()
      }
      if (!payment) return response.sendStatus(404)
      payment.stripePaymentIntentId = session.payment_intent
      await payment.save()
      await processPaymentReturn('ok', payment.stamp)
    }
    return response.sendStatus(200)
  } catch (error) {
    log.error('Stripe webhook processing error: ' + error)
    // 5xx so Stripe retries the delivery later instead of giving up.
    return response.sendStatus(500)
  }
}

async function getPaymentStatus(request, response) {
  const sessionId = request.query.session_id
  const stamp = request.query.stamp
  if (!sessionId) return response.json(httpResponses.onPaymentError)

  try {
    const payment = await Payment.findOne({ stripeCheckoutSessionId: sessionId }).exec()
    if (!payment) return response.json(httpResponses.onPaymentNotFoundOrAlredyProcessed)

    let result
    if (!payment.processed && stripe) {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      result =
        session.payment_status === 'paid'
          ? await processPaymentReturn('ok', payment.stamp)
          : { success: false, message: 'Maksua käsitellään.' }
    } else if (payment.processed && payment.status === 'Success') {
      const member = await Member.findById(payment.memberId).exec()
      if (!member) return response.json(httpResponses.onPaymentError)
      result = {
        success: true,
        message: 'Maksun käsittely onnistui.',
        paymentData: {
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          membershipEnds: member.membershipEnds,
          amount: payment.amountSnt,
          timestamp: payment.timestamp,
          product: payment.productName,
        },
      }
    } else {
      result = { success: false, message: 'Maksua käsitellään.' }
    }

    // This endpoint has no auth, so gate PII on `stamp` - it's never embedded
    // in the Stripe redirect URL, unlike session_id, which can leak via a
    // Referer header or browser history.
    if (stamp !== payment.stamp) {
      return response.json({ success: result.success, message: result.message })
    }
    return response.json(result)
  } catch (error) {
    log.error('Get Stripe payment status error: ' + error)
    return response.json(httpResponses.onPaymentError)
  }
}

export default {
  createPayment: createPayment,
  stripeWebhook: stripeWebhook,
  getPaymentStatus: getPaymentStatus,
}
