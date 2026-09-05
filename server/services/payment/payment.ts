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

function runQuery(query, callback) {
  query
    .exec()
    .then((result) => callback(null, result))
    .catch((error) => callback(error))
}

function runSave(document, callback) {
  document
    .save()
    .then(() => callback(null))
    .catch((error) => callback(error))
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

// Create payment
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

    let stripePrice
    if (product.stripePriceId) {
      stripePrice = await stripe.prices.retrieve(product.stripePriceId)
    }

    if (!product.stripeProductId) {
      const stripeProduct = await stripe.products.create({
        name: productObj.name,
        default_price_data: {
          currency: 'eur',
          unit_amount: productObj.priceSnt,
        },
      })
      product.stripeProductId = stripeProduct.id
      product.stripePriceId =
        typeof stripeProduct.default_price === 'string' ? stripeProduct.default_price : stripeProduct.default_price?.id
      await product.save()
      productObj = product.toObject()
    } else if (!stripePrice || stripePrice.currency !== 'eur' || stripePrice.unit_amount !== productObj.priceSnt) {
      stripePrice = await stripe.prices.create({
        currency: 'eur',
        unit_amount: productObj.priceSnt,
        product: product.stripeProductId,
      })
      await stripe.products.update(product.stripeProductId, {
        default_price: stripePrice.id,
      })
      product.stripePriceId = stripePrice.id
      await product.save()
      productObj = product.toObject()
    }

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    let payment = await Payment.findOne({ stripeCheckoutSessionId: session.id }).exec()
    if (!payment && session.metadata && session.metadata.paymentId) {
      payment = await Payment.findById(session.metadata.paymentId).exec()
    }
    if (!payment) return response.sendStatus(404)
    payment.stripePaymentIntentId = session.payment_intent
    await payment.save()
    request.body = {
      stripeVerified: true,
      status: 'ok',
      stamp: payment.stamp,
      account: 'stripe',
      algorithm: 'stripe',
      amount: payment.amountSnt,
      reference: payment.reference,
      transactionId: session.payment_intent || session.id,
      provider: 'stripe',
      signature: 'stripe',
    }
    return paymentReturn(request, response)
  }
  return response.sendStatus(200)
}

async function getPaymentStatus(request, response) {
  const sessionId = request.query.session_id
  if (!sessionId) return response.json(httpResponses.onPaymentError)

  try {
    let payment = await Payment.findOne({ stripeCheckoutSessionId: sessionId }).exec()
    if (!payment) return response.json(httpResponses.onPaymentNotFoundOrAlredyProcessed)

    if (!payment.processed && stripe) {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.payment_status === 'paid') {
        request.body = {
          stripeVerified: true,
          status: 'ok',
          stamp: payment.stamp,
          account: 'stripe',
          algorithm: 'stripe',
          amount: payment.amountSnt,
          reference: payment.reference,
          transactionId: session.payment_intent || session.id,
          provider: 'stripe',
          signature: 'stripe',
        }
        return paymentReturn(request, response)
      }
    }

    if (!payment.processed || payment.status !== 'Success') {
      return response.json({ success: false, message: 'Maksua käsitellään.' })
    }

    const member = await Member.findById(payment.memberId).exec()
    if (!member) return response.json(httpResponses.onPaymentError)
    return response.json({
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
    })
  } catch (error) {
    log.error('Get Stripe payment status error: ' + error)
    return response.json(httpResponses.onPaymentError)
  }
}

// When payment is made frontend calls this endpoint
function paymentReturn(request, response) {
  const account = request.body.account
  const algorithm = request.body.algorithm
  const amount = request.body.amount
  const stamp = request.body.stamp
  const reference = request.body.reference
  const transactionId = request.body.transactionId
  const status = request.body.status
  const provider = request.body.provider
  const signature = request.body.signature

  const stripeVerified = request.body.stripeVerified === true

  // Validations

  // Check if all needed parameters are provided
  if (
    !stripeVerified &&
    (!account || !algorithm || !amount || !stamp || !reference || !transactionId || !status || !provider || !signature)
  ) {
    return response.json(httpResponses.onPaymentError)
  }

  // Validate signature
  const calculatedSignature = stripeVerified ? signature : null

  if (!stripeVerified && calculatedSignature !== signature) {
    return response.json(httpResponses.onPaymentError)
  }

  // Success / Cancel handling

  // Success
  if (status === 'ok') {
    // Find payment by stamp and update record
    const paymentFilter = { stamp: stamp, processed: false }
    const paymentUpdate = { status: 'Success', processed: true }

    runQuery(Payment.findOneAndUpdate(paymentFilter, paymentUpdate, { new: true }), (error, payment) => {
      if (error) return response.json(httpResponses.onPaymentError)
      if (!payment) return response.json(httpResponses.onPaymentNotFoundOrAlredyProcessed)
      const memberId = payment.memberId
      const memberFilter = { _id: memberId }

      // Find member whose payment it is and take current membership ending date
      runQuery(Member.findOne(memberFilter), (error, member) => {
        if (error) return response.json(httpResponses.onPaymentError)

        const currentYear = moment().year()
        const nextYear = currentYear + 1
        const currentMonth = moment().month()

        // If member not found (==new member) find temporary record and create new member based on it
        if (!member) {
          runQuery(TempMember.findOne(memberFilter), (error, tempMember) => {
            if (error || !tempMember) return response.json(httpResponses.onPaymentError)
            let membershipEnds = null

            // Figure out new membership ending date
            // 1 year membership (5€)
            if (payment.productId === '1111') {
              if (currentMonth < 7) {
                membershipEnds = moment(currentYear + '-07-31').toDate()
              } else {
                membershipEnds = moment(nextYear + '-07-31').toDate()
              }
              // 5 year membership (20€)
            } else if (payment.productId === '1555') {
              if (currentMonth < 7) {
                membershipEnds = moment(currentYear + '-07-31')
                  .add(4, 'y')
                  .toDate()
              } else {
                membershipEnds = moment(nextYear + '-07-31')
                  .add(4, 'y')
                  .toDate()
              }
            } else {
              return response.json(httpResponses.onPaymentError)
            }

            // Generate password for new user
            const password = generator.generate({
              length: 8,
              numbers: true,
            })

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
