const cron = require('cron')
const fs = require('fs')
const moment = require('moment')

const Member = require('../models/Member')
const EndedMembership = require('../models/EndedMembership')

const config = require('../../config/config')
const mail = require('../../config/mail')
const emails = require('../utils/emails')

function startCronJobs() {
  // Check every day for ended memberships and send email

  const checkMembershipEnding = cron.job('0 0 0 * * *', function() {
    const currentDate = new Date()
    Member.find({ membershipEnds: { $lte: currentDate } }, function(err, members) {
      if (err) console.log(err)
      if (members) {
        members.map(user => {
          // Check if mail alredy sent within two months

          EndedMembership.findOne({ userID: user._id }, function(err, ended) {
            if (err) console.log(err)
            let email = emails.endedMembershipMail()
            let endingMailOptions = {
              from: mail.mailSender,
              to: user.email,
              subject: email.subject,
              text: email.text,
            }
            if (!ended) {
              EndedMembership.create({ userID: user._id, mailSent: currentDate }).then(function() {
                mail.transporter.sendMail(endingMailOptions, mail.callback)
              })
            } else {
              let twoMonthsAgo = moment()
                .subtract(2, 'months')
                .toDate()
              if (ended.mailSent.getTime() < twoMonthsAgo.getTime()) {
                EndedMembership.updateOne({ userID: user._id }, { mailSent: currentDate }).then(function() {})
                mail.transporter.sendMail(endingMailOptions, mail.callback)
              }
            }
          })
        })
      }
    })
  })

  // Export member list to CSV every hour

  const exportToCSV = cron.job('0 0 * * * *', function() {
    const filePath = config.CSVFilePath
    fs.writeFileSync(filePath, 'PersonId;Company;Role;RoleValidity;ValidityStart;ValidityEnd;SpecialCondition\n')
    Member.find({}, function(err, members) {
      if (err) console.log(err)
      members.map(user => {
        if (user.accepted && user.membershipStarts && user.membershipEnds) {
          if (user.accessRights) {
            fs.appendFileSync(
              filePath,
              'U_' +
                user.utuAccount +
                ';0245896-3;A_AJ_Asteriski_hallitus;R;' +
                moment(user.membershipStarts).format('YYYYMMDD') +
                ';' +
                moment(user.membershipEnds).format('YYYYMMDD') +
                ';\n'
            )
          } else {
            fs.appendFileSync(
              filePath,
              'U_' +
                user.utuAccount +
                ';0245896-3;A_AJ_Asteriski_jäsen;R;' +
                moment(user.membershipStarts).format('YYYYMMDD') +
                ';' +
                moment(user.membershipEnds).format('YYYYMMDD') +
                ';\n'
            )
          }
        }
      })
    })
  })

  // Start jobs

  checkMembershipEnding.start()
  exportToCSV.start()
}

module.exports = {
  startCronJobs: startCronJobs,
}
