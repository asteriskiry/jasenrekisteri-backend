const { CronJob } = require('cron')
const fs = require('fs')
const moment = require('moment')

const Member = require('../models/Member')
const EndedMembership = require('../models/EndedMembership')

const config = require('../../config/config')
const mail = require('../../config/mail')
const emails = require('../utils/emails')
const log = require('./logger').log

function startCronJobs() {
  // Check every day for ended memberships and send email

  const checkMembershipEnding = new CronJob('0 0 0 * * *', async function () {
    const currentDate = new Date()

    try {
      const members = await Member.find({ membershipEnds: { $lte: currentDate } })

      for (const user of members) {
        const ended = await EndedMembership.findOne({ userID: user._id })
        const email = emails.endedMembershipMail()
        const endingMailOptions = {
          from: mail.mailSender,
          to: user.email,
          subject: email.subject,
          text: email.text,
        }

        if (!ended) {
          await EndedMembership.create({ userID: user._id, mailSent: currentDate })
          mail.transporter.sendMail(endingMailOptions, mail.callback)
          mail.logMessage(endingMailOptions)
        } else {
          const twoMonthsAgo = moment().subtract(2, 'months').toDate()
          if (ended.mailSent.getTime() < twoMonthsAgo.getTime()) {
            await EndedMembership.updateOne({ userID: user._id }, { mailSent: currentDate })
            mail.transporter.sendMail(endingMailOptions, mail.callback)
            mail.logMessage(endingMailOptions)
          }
        }
      }
    } catch (error) {
      console.log(error)
    }
  })

  // Export member list to CSV every hour

  const exportToCSV = new CronJob('0 0 * * * *', async function () {
    try {
      const filePath = config.CSVFilePath
      fs.writeFileSync(filePath, 'PersonId;Company;Role;RoleValidity;ValidityStart;ValidityEnd;SpecialCondition\n')
      const members = await Member.find({})
      members.map((user) => {
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
    } catch (error) {
      log.error('CSV update error: ' + error)
    }
  })

  // Start jobs

  checkMembershipEnding.start()
  exportToCSV.start()
}

module.exports = {
  startCronJobs: startCronJobs,
}
