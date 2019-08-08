const cron = require('cron');
const fs = require('fs');
const moment = require('moment');

const Member = require('../models/Member');
const EndedMembership = require('../models/EndedMembership');
const ResetPassword = require('../models/ResetPassword');

const config = require('../../config/config');
const mail = require('../../config/mail');

function startCronJobs() {
    // Check every day for ended memberships and send email

    const checkMembershipEnding = cron.job('0 0 0 * * *', function() {
        const currentDate = new Date();
        Member.find({ membershipEnds: { $lte: currentDate } }, function(err, members) {
            if (err) console.log(err);
            members.map(user => {
                // Check if mail alredy sent

                EndedMembership.findOne({ userID: user._id }, function(err, ended) {
                    if (err) console.log(err);
                    if (!ended) {
                        EndedMembership.create({ userID: user._id }).then(function() {
                            let endingMailOptions = {
                                from: mail.mailSender,
                                to: user.email,
                                subject: 'Asteriski ry:n jäsenyytesi päättynyt',
                                text:
                                    'Jäsenyytesi Asteriski ry:lle on päättynyt.\n\n' +
                                    'Maksa jäsenmaksusi osoitteessa ' +
                                    config.clientUrl +
                                    ' tai käteisenä Asteriski ry:n hallitukselle.' +
                                    '\n\n' +
                                    'Tähän sähköpostiin ei voi vastata. Kysymyksissä ota yhteyttä osoitteeseen asteriski@utu.fi.',
                            };
                            mail.transporter.sendMail(endingMailOptions);
                        });
                    }
                });
            });
        });
    });

    // Export member list to CSV every day

    const exportToCSV = cron.job('0 0 4 * * *', function() {
        const filePath = config.CSVFilePath;
        fs.writeFileSync(filePath, 'PersonId;Company;Role;RoleValidity;ValidityStart;ValidityEnd;SpecialCondition\n');
        Member.find({}, function(err, members) {
            if (err) console.log(err);
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
                        );
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
                        );
                    }
                }
            });
        });
    });

    // Clean temporary databases every 3rd month

    const cleanDatabases = cron.job('0 4 5 */3 * *', function() {
        EndedMembership.deleteMany({}, function() {});
        ResetPassword.deleteMany({}, function() {});
    });

    // Start jobs

    // cleanDatabases.start();
    checkMembershipEnding.start();
    exportToCSV.start();
}

module.exports = {
    startCronJobs: startCronJobs,
};
