'use strict'

require('dotenv').config()

const CheckoutFinland = require('checkout-finland')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const generator = require('generate-password')

const httpResponses = require('./')
const cryptoRandomString = require('crypto-random-string')
const mail = require('../../../config/mail')
const emails = require('../../utils/emails')
const config = require('../../../config/config')

const Member = require('../../models/Member')
const TempMember = require('../../models/TempMember')
const Payment = require('../../models/Payment')
const Product = require('../../models/Product')

// Initialize Checkout API
const client = new CheckoutFinland(process.env.MERCHANT_ID, process.env.MERCHANT_SECRET)

// Create payment
async function createPayment(request, response) {
  let memberId = request.body.memberId
  let productId = request.body.productId

  // Find the member whose payment it is
  const memberQuery = Member.findOne({ _id: memberId })
  let member = await memberQuery.exec()
  // If not found try tempMembers (just joined)
  if (!member) {
    const tempMemberQuery = TempMember.findOne({ _id: memberId })
    member = await tempMemberQuery.exec()
  }
  const memberObj = member.toObject()

  // Find product
  Product.findOne({ productId: productId }, (error, product) => {
    if (error || !product) return response.json(httpResponses.onError)
    const productObj = product.toObject()

    // Generate stamp (this is how payment is identified)
    const stamp = cryptoRandomString({ length: 30 })

    // Generate order reference
    const reference = uuidv1()

    // Create payment record
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
    newPayment.stamp = stamp
    newPayment.status = 'Pending'
    newPayment.reference = reference
    newPayment.processed = false

    // Save new payment record
    newPayment.save(async function(error) {
      if (error) return response.json(httpResponses.onError)

      // Payment request data
      const payment = {
        stamp: stamp,
        reference: reference,
        amount: productObj.priceSnt,
        currency: 'EUR',
        language: 'FI',
        items: [
          {
            unitPrice: productObj.priceSnt,
            units: 1,
            vatPercentage: 0,
            productCode: productObj.productId,
            deliveryDate: moment(productObj.timestamp).format('YYYY-MM-DD'),
            merchant: process.env.MERCHANT_ID,
            reference: reference,
            description: productObj.name,
            category: productObj.category,
          },
        ],
        customer: {
          email: memberObj.email,
          firstName: memberObj.firstName,
          lastName: memberObj.lastName,
        },
        redirectUrls: {
          success: process.env.CLIENTURL + '/member/pay/return',
          cancel: process.env.CLIENTURL + '/member/pay/return',
        },
      }

      // Create paymnet request to Checkout API
      const checkoutResponse = await client.createPayment(payment)

      // Return banks to frontend
      return response.json(checkoutResponse.providers)
    })
  })
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

  // Validations

  // Check if all needed parameters are provided
  if (
    !account ||
    !algorithm ||
    !amount ||
    !stamp ||
    !reference ||
    !transactionId ||
    !status ||
    !provider ||
    !signature
  ) {
    return response.json(httpResponses.onPaymentError)
  }

  // Validate signature
  const sigValidationData = {
    'checkout-account': account,
    'checkout-algorithm': algorithm,
    'checkout-amount': amount,
    'checkout-stamp': stamp,
    'checkout-reference': reference,
    'checkout-transaction-id': transactionId,
    'checkout-status': status,
    'checkout-provider': provider,
  }
  const calculatedSignature = client.calculateHmac(sigValidationData, '')

  if (calculatedSignature !== signature) {
    return response.json(httpResponses.onPaymentError)
  }

  // Success / Cancel handling

  // Success
  if (status === 'ok') {
    // Find payment by stamp and update record
    const paymentFilter = { stamp: stamp, processed: false }
    const paymentUpdate = { status: 'Success', processed: true }

    Payment.findOneAndUpdate(paymentFilter, paymentUpdate, { new: true }, (error, payment) => {
      if (error) return response.json(httpResponses.onPaymentError)
      if (!payment) return response.json(httpResponses.onPaymentNotFoundOrAlredyProcessed)
      const memberId = payment.memberId
      const memberFilter = { _id: memberId }

      // Find member whose payment it is and take current membership ending date
      Member.findOne(memberFilter, (error, member) => {
        if (error) return response.json(httpResponses.onPaymentError)

        const currentYear = moment().year()

        // If member not found (==new member) find temporary record and create new member based on it
        if (!member) {
          TempMember.findOne(memberFilter, (error, tempMember) => {
            if (error || !tempMember) return response.json(httpResponses.onPaymentError)
            let membershipEnds = null

            // Figure out new membership ending date
            // 1 year mebership (5€)
            if (payment.productId === '1111') {
              membershipEnds = moment(currentYear + '-12-31').toDate()
              // 5 year mebership (20€)
            } else if (payment.productId === '1555') {
              membershipEnds = moment(currentYear + '-12-31')
                .add(4, 'y')
                .toDate()
              // "Piltti"-offer: to the end of current year + 1 year (7€)
            } else if (payment.productId === '1222') {
              membershipEnds = moment(currentYear + '-12-31')
                .add(1, 'y')
                .toDate()
            } else {
              return response.json(httpResponses.onPaymentError)
            }

            // Generate password for new user
            const password = generator.generate({
              length: 8,
              numbers: true,
            })

            let newMember = new Member()
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
            newMember.save(error => {
              if (error) return response.json(httpResponses.onPaymentError)

              // Email to new member

              let newMemberMemberMail = emails.newMemberMemberMail(
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

              let newMemberMailOptions = {
                from: mail.mailSender,
                to: newMember.email,
                subject: newMemberMemberMail.subject,
                text: newMemberMemberMail.text,
              }

              mail.transporter.sendMail(newMemberMailOptions)

              // Inform board of new member by email

              let newMemberBoardMail = emails.newMemberBoardMail(
                newMember.firstName,
                newMember.lastName,
                newMember.email,
                newMember.utuAccount,
                newMember.hometown,
                newMember.tyyMember ? 'Kyllä' : 'Ei',
                newMember.tiviaMember ? 'Kyllä' : 'Ei',
                payment.productName
              )

              let boardMailOptions = {
                from: mail.mailSender,
                to: mail.boardMailAddress,
                subject: newMemberBoardMail.subject,
                text: newMemberBoardMail.text,
              }

              mail.transporter.sendMail(boardMailOptions)

              // Payment response body
              const responseBody = {
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

              // Send payment success response to front
              return response.json(responseBody)
            })
          })

          // If member found
        } else {
          let currentEndYear = moment(member.membershipEnds).year()

          let memberUpdate = null

          // Figure out membership ending date
          // 1 year mebership (5€)
          if (payment.productId === '1111') {
            let endYear = currentYear
            console.log('currentendyear: ' + currentEndYear)
            console.log('currentyear: ' + currentYear)
            if (currentEndYear < currentYear) {
              endYear = currentYear
            } else {
              endYear = currentEndYear + 1
            }
            console.log('endyear: ' + endYear)
            memberUpdate = {
              membershipEnds: moment(endYear + '-12-31').toDate(),
            }
            // 5 year mebership (20€)
          } else if (payment.productId === '1555') {
            let endYear = currentYear
            if (currentEndYear < currentYear) {
              endYear = currentYear + 4
            } else {
              endYear = currentEndYear + 5
            }
            memberUpdate = {
              membershipEnds: moment(endYear + '-12-31').toDate(),
            }
          } else {
            return response.json(httpResponses.onPaymentError)
          }

          // Update the new membership ending date
          Member.findOneAndUpdate(memberFilter, memberUpdate, { new: true }, (error, updatedMember) => {
            if (error || !updatedMember) return response.json(httpResponses.onPaymentError)

            // Email receipt to member

            let receiptMail = emails.receiptMail(
              updatedMember.firstName,
              updatedMember.lastName,
              updatedMember.utuAccount,
              updatedMember.email,
              payment.productName,
              payment.amountSnt / 100,
              moment(payment.timestamp).format('DD.MM.YYYY HH:mm:ss'),
              moment(updatedMember.membershipEnds).format('DD.MM.YYYY')
            )

            let receiptMailOptions = {
              from: mail.mailSender,
              to: updatedMember.email,
              subject: receiptMail.subject,
              text: receiptMail.text,
            }

            mail.transporter.sendMail(receiptMailOptions)

            // Payment response body

            const responseBody = {
              success: true,
              message: 'Maksun käsittely onnistui.',
              paymentData: {
                firstName: updatedMember.firstName,
                lastName: updatedMember.lastName,
                email: updatedMember.email,
                membershipEnds: updatedMember.membershipEnds,
                amount: payment.amountSnt,
                timestamp: payment.timestamp,
                product: payment.productName,
              },
            }

            // Send payment success response to front
            return response.json(responseBody)
          })
        }
      })
    })

    // Cancel
  } else if (status === 'fail') {
    // Find payment by stamp and update record
    const paymentFilter = { stamp: stamp, processed: false }
    const paymentUpdate = { status: 'Canceled', processed: true }

    Payment.findOneAndUpdate(paymentFilter, paymentUpdate, { new: true }, (error, payment) => {
      if (error) return response.json(httpResponses.onPaymentError)
      if (!payment) return response.json(httpResponses.onPaymentNotFoundOrAlredyProcessed)
      return response.json(httpResponses.onPaymentCancel)
    })

    // Something else (should not happen)
  } else {
    return response.json(httpResponses.onPaymentError)
  }
}

module.exports = {
  createPayment: createPayment,
  paymentReturn: paymentReturn,
}
