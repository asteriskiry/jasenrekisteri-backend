const cron = require('cron');

const Member = require('../models/Member');
const EndedMembership = require('../models/EndedMembership');
const ResetPassword = require('../models/ResetPassword');

const mail = require('../../config/mail');

function startCronJobs() {
    // Check every day for ended memberships and send email
    const checkMembershipEnding = cron.job('0 0 0 * * *', function() {
        const currentDate = new Date();
        Member.find({ membershipEnds: { $lte: currentDate } }, function(
            err,
            members
        ) {
            if (err) console.log(err);
            members.map(user => {
                // Check if mail alredy sent
                EndedMembership.findOne({ userID: user._id }, function(
                    err,
                    ended
                ) {
                    if (err) console.log(err);
                    if (!ended) {
                        EndedMembership.create({ userID: user._id }).then(
                            function() {
                                console.log(user.email);
                                let endingMailOptions = {
                                    from:
                                        'Asteriski jäsenrekisteri <jasenrekisteri@asteriski.fi>',
                                    to: user.email,
                                    subject:
                                        'Asteriski ry:n jäsenyytesi päättynyt',
                                    text:
                                        'Jäsenyytesi Asteriski ry:lle on päättynyt\n\n' +
                                        'Maksa jäsenmaksusi osoitteessa https://rekisteri.asteriski.fi',
                                };
                                mail.transporter.sendMail(endingMailOptions);
                            }
                        );
                    }
                });
            });
        });
        console.log('Cron');
    });

    // Clean temporary databases every 3rd month
    const cleanDatabases = cron.job('0 4 5 */3 * *', function() {
        EndedMembership.deleteMany({}, function() {});
        ResetPassword.deleteMany({}, function() {});
    });

    // Start jobs
    cleanDatabases.start();
    checkMembershipEnding.start();
}

module.exports = {
    startCronJobs: startCronJobs,
};
