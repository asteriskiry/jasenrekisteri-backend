import mongoose from 'mongoose'
import moment from 'moment'
import Product from '../server/models/Product.js'
import Member from '../server/models/Member.js'
import config from '../config/config.js'

if (config.env === 'production')
  throw new Error('Demo data cannot be created in production. Use create-user and create-product.')

console.log('Luodaan paikallinen testikäyttäjä ja kaksi jäsenyystuotetta.')
console.log('')
mongoose.connect(config.mongoUrl)
let db = mongoose.connection

db.once('open', async function () {
  let adminUser = new Member()
  adminUser.firstName = 'Admin'
  adminUser.lastName = 'Riski'
  adminUser.utuAccount = 'admin'
  adminUser.email = 'admin@example.com'
  adminUser.hometown = 'Turku'
  adminUser.tyyMember = true
  adminUser.tiviaMember = true
  adminUser.role = 'Admin'
  adminUser.accessRights = true
  adminUser.membershipStarts = new Date()
  adminUser.membershipEnds = moment().add(1, 'y').toDate()
  adminUser.accountCreated = new Date()
  adminUser.password = 'password'
  adminUser.accepted = true

  let membership1 = new Product()
  membership1.productId = '1111'
  membership1.name = 'Jäsenyys 1 vuosi'
  membership1.category = 'Membership'
  membership1.priceSnt = 500
  membership1.membershipDuration = 1

  let membership5 = new Product()
  membership5.productId = '1555'
  membership5.name = 'Jäsenyys 5 vuotta'
  membership5.category = 'Membership'
  membership5.priceSnt = 2000
  membership5.membershipDuration = 5

  if (!(await Member.exists({ email: adminUser.email })))
    await adminUser
      .save()
      .then(() =>
        console.log('\x1b[32m%s\x1b[0m', '    admin@example.com -käyttäjän tallennus onnistui (salasana: password).')
      )
      .catch((err) => console.warn(err.message))
  if (!(await Product.exists({ productId: membership1.productId })))
    await membership1
      .save()
      .then(() =>
        console.log('\x1b[32m%s\x1b[0m', '    1 vuoden jäsenyys -tuotteen tallennus onnistui (tuotekoodi: 1111).')
      )
      .catch((err) => console.warn(err.message))
  if (!(await Product.exists({ productId: membership5.productId })))
    await membership5
      .save()
      .then(() =>
        console.log('\x1b[32m%s\x1b[0m', '    5 vuoden jäsenyys -tuotteen tallennus onnistui (tuotekoodi: 1555).')
      )
      .catch((err) => console.warn(err.message))
  await db.close()
  console.log('\x1b[32m%s\x1b[0m', '    Skripti valmistui!')
})
