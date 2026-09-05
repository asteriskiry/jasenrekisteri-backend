// Script for sending mail for all members

const mongoose = require('mongoose')
const Member = require('../server/models/Member')
const mail = require('../config/mail')
const config = require('../config/config')
const args = require('minimist')(process.argv.slice(2), {
  alias: {
    h: 'help',
    s: 'subject',
    e: 'email',
  },
})

function help() {
  console.log('Script for sending mail for all members')
  console.log('Usage: npm run mass-mailer -- -s <subject> -e <path to file that contains email body>')
  console.log('-h for help')
}

if (args.h) {
  help()
  process.exit()
} else if (!args.s || !args.e) {
  help()
  process.exit()
}

let subject = args.s
let emailFilePath = args.e

mongoose.connect(config.mongoUrl)
let db = mongoose.connection

db.once('open', async function () {
  const members = await Member.find({})
  await Promise.all(
    members.map((user) => {
      let mailOptions = {
        from: mail.mailSender,
        to: user.email,
        subject: subject,
        text: { path: emailFilePath },
      }
      return new Promise(function (resolve, reject) {
        mail.transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.log('error: ', err)
            reject(err)
          } else {
            console.log('Mail to ' + user.email + ' sent')
            resolve(info)
          }
        })
      })
    })
  )
  await db.close()
})
