const Member = require('../../models/Member');
const ResetPassword = require('../../models/ResetPassword');
const httpResponses = require('./');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const config = require('../../../config/config');
const nodemailer = require('nodemailer');

function forgotPassword(request, response) {
    const { email } = request.body;

    if (!email) {
        return response.json(httpResponses.onEmailEmpty);
    }

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.gmailUser,
            pass: config.gmailPassword,
        },
    });

    Member.findOne({ email: email })
        .lean()
        .exec((error, user) => {
            if (error) return response.json({ success: false, message: error });
            if (!user) return response.json(httpResponses.onUserNotFound);
            ResetPassword.findOneAndDelete({ userID: user._id }, function(err) {
                if (err) console.log(err);
            });
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
                        let mailOptions = {
                            from:
                                '"Asteriski jäsenrekisteri" jasenrekisteri@asteriski.fi',
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
                        let mailSent = transporter.sendMail(mailOptions);
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
