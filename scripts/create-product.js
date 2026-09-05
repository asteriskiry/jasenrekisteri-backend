// Script for creating products

var prompt = require('prompt')
var mongoose = require('mongoose')
var Stripe = require('stripe')
var Product = require('../server/models/Product')
var config = require('../config/config')

var stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null

var schema = {
  properties: {
    productId: {
      description: 'Tuotteen koodi (esim. 1234)',
      required: true,
    },
    name: {
      description: 'Tuotteen nimi',
      required: true,
    },
    category: {
      description: 'Tuotteen kategoria (Membership/Other)',
      required: true,
    },
    priceSnt: {
      description: 'Tuotten hinta sentteinä (esim. 5€ = 500)',
      required: true,
    },
    membershipDuration: {
      description: 'Jos kyseessä on jäsenyys niin jäsenyyden pituus vuosina',
    },
  },
}

prompt.start()

prompt.get(schema, async function (err, result) {
  if (err) {
    throw err
  }

  if (result.category === 'Membership' && !result.membershipDuration) {
    console.error('Jäsenyystuotteelle on pakko antaa jäsenyyden pituus (membershipDuration).')
    process.exit(1)
  }

  console.log('Uusi tuote:')
  console.log('  Tuotteen koodi: ' + result.productId)
  console.log('  Tuotteen nimi: ' + result.name)
  console.log('  Tuotteen kategoria: ' + result.category)
  console.log('  Tuotteen hinta sentteinä: ' + result.priceSnt)
  console.log('  Jäsenyyden pituus: ' + result.membershipDuration)

  mongoose.connect(config.mongoUrl)
  var db = mongoose.connection

  db.once('open', async function () {
    var newProduct = new Product()

    newProduct.productId = result.productId
    newProduct.name = result.name
    newProduct.category = result.category
    newProduct.priceSnt = Number(result.priceSnt)
    if (result.membershipDuration) {
      newProduct.membershipDuration = Number(result.membershipDuration)
    }

    // Provision the Stripe Product/Price up front so a member's first
    // checkout doesn't have to do it inline (see ensureStripeProduct in
    // server/services/payment/payment.js, which still exists there as a
    // fallback for products created before this script did this).
    if (stripe) {
      try {
        var stripeProduct = await stripe.products.create({
          name: newProduct.name,
          default_price_data: {
            currency: 'eur',
            unit_amount: newProduct.priceSnt,
          },
        })
        newProduct.stripeProductId = stripeProduct.id
        newProduct.stripePriceId = stripeProduct.default_price
        console.log('Stripe-tuote luotu (id: ' + stripeProduct.id + ').')
      } catch (stripeErr) {
        console.warn(
          'Stripe-tuotteen luonti epäonnistui, tuote tallennetaan silti ilman Stripe-liitosta: ' + stripeErr.message
        )
      }
    } else {
      console.warn('STRIPE_SECRET_KEY ei ole asetettu - tuote tallennetaan ilman Stripe-liitosta.')
    }

    newProduct
      .save()
      .then(() => console.log('Tallennus tietokantaan onnistui. Voit sulkea yhteyden (Ctrl-c).'))
      .catch((err) => console.error(err))
  })
})
