const Member = require('../../models/Member');
const ResetPassword = require('../../models/ResetPassword');
const httpResponses = require('./');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const config = require('../../../config/config');
const mail = require('../../../config/mail');

function forgotPassword(request, response) {
    const { email } = request.body;

    // Validations

    if (!email) {
        return response.json(httpResponses.onEmailEmpty);
    }

    // Find member by email

    Member.findOne({ email: email })
        .lean()
        .exec((error, user) => {
            if (error) return response.json({ success: false, message: error });
            if (!user) return response.json(httpResponses.onUserNotFound);

            // If alredy asked for new password, delete last temporary record

            ResetPassword.findOneAndDelete({ userID: user._id }, function(err) {
                if (err) console.log(err);
            });

            // Generate token and expire date and save to temporary database

            const token = crypto.randomBytes(32).toString('hex');
            bcrypt.genSalt(5, function(err, salt) {
                if (err) console.log(err);
                bcrypt.hash(token, salt, function(err, hash) {
                    if (err) console.log(err);
                    ResetPassword.create({
                        userID: user._id,
                        resetPasswordToken: hash,
                        expire: Date.now() + 3600000,
                    }).then(function(item) {
                        if (!item)
                            return response.json(httpResponses.onResetFail);

                        // Send generated link to email

                        let mailOptions = {
                            from: mail.mailSender,
                            to: user.email,
                            subject: 'Jäsenrekisterin salasanan nollaus',
                            text:
                                'Jäsenrekisterin salasanan nollaus\n\n' +
                                'Voit nollata jäsenrekisterin salasanan seuraavasta linkistä:\n\n' +
                                config.clientUrl +
                                '/reset/' +
                                user._id +
                                '/' +
                                token,
                        };
                        let mailSent = mail.transporter.sendMail(mailOptions);
                        if (mailSent) {
                            return response.json(httpResponses.onMailSent);
                        } else {
                            return response.json(httpResponses.onMailFail);
                        }
                    });
                });
            });
        });
}

module.exports = {
    forgotPassword: forgotPassword,
};
