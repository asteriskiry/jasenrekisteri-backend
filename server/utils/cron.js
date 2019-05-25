const cron = require('cron');
const Member = require('../models/Member');
const mail = require('../../config/mail');

function startCronJobs() {
    const checkMembershipEnding = cron.job('*/15 * * * * *', function() {
        const currentDate = new Date();
        Member.find({ membershipEnds: { $lte: currentDate } }, function(
            err,
            members
        ) {
            if (err) console.log(err);
            members.map(user => {
                console.log(user.email);
                let mailOptions = {
                    from:
                        '"Asteriski jäsenrekisteri" jasenrekisteri@asteriski.fi',
                    to: user.email,
                    subject: 'Asteriski ry:n jäsenyytesi päättynyt',
                    text:
                        'Jäsenyytesi Asteriski ry:lle on päättynyt\n\n' +
                        'Maksa jäsenmaksusi osoitteessa https://rekisteri.asteriski.fi',
                };
                let mailSent = mail.transporter.sendMail(mailOptions);
                if (mailSent) {
                    console.log('Sähköpostin lähetys onnistui');
                } else {
                    console.log('Sähköpostin lähetys epäonnistui');
                }
            });
        });
        console.log('Cron');
    });
    checkMembershipEnding.start();
}

module.exports = {
    startCronJobs: startCronJobs,
};
