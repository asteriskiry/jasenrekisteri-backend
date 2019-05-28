const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');
const mail = require('../../../config/mail');

// Remove member

function remove(request, response) {
    const accessTo = request.body.access.toLowerCase();

    if (accessTo === 'admin' || accessTo === 'board') {
        utils.checkUserControl(request.body.id).then(admin => {
            Member.deleteOne({ _id: request.body.memberID }, function(err) {
                if (err) response.json(err);

                response.json({ success: true, message: 'Jäsen poistettu.' });

                let memberMailOptions = {
                    from: mail.mailSender,
                    to: request.body.email,
                    subject: 'Asteriski ry:n jäsenyys päättynyt.',
                    text:
                        'Asteriski ry:n jäsentietosi on poistettu. Tämän myötä jäsenyytesi on päättynyt.'
                };

                mail.transporter.sendMail(memberMailOptions);
            });
        });
    } else {
        return response.json(httpResponses.clientAdminFailed);
    }
}

module.exports = {
    remove: remove,
};
