import 'dotenv/config'

import prompt from 'prompt'
import mongoose from 'mongoose'
import Product from '../server/models/Product.js'
import config from '../config/config.js'

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

    try {
      await newProduct.save()
      console.log('Tuote tallennettu.')
    } finally {
      await mongoose.disconnect()
    }
  })
})
