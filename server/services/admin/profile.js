const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');
const mail = require('../../../config/mail');
const config = require('../../../config/config');

// Get member details

function get(request, response) {
    const memberID = request.query.memberID;

    const accessTo = request.query.access.toLowerCase();

    // Check access and return member details

    if (accessTo === 'admin' || accessTo === 'board') {
        utils
            .checkUserControl(request.query.id)
            .then(admin => {
                Member.findOne({ _id: memberID })
                    .lean()
                    .exec((error, doc) => {
                        if (error) return response.json(error);
                        delete doc.password;
                        return response.json(doc);
                    });
            })
            .catch(error => {
                return response.json(httpResponses.onServerAdminFail);
            });
    } else {
        return response.json(httpResponses.clientAdminFailed);
    }
}

// Update member details

function update(request, response) {
    const memberID = request.body.memberID;

    const adminProfile = {
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        utuAccount: request.body.utuAccount,
        email: request.body.email,
        hometown: request.body.hometown,
        tyyMember: request.body.tyyMember,
        tiviaMember: request.body.tiviaMember,
        role: request.body.role,
        accessRights: request.body.accessRights,
        membershipStarts: request.body.membershipStarts,
        membershipEnds: request.body.membershipEnds,
        accepted: request.body.accepted,
        password: request.body.password,
    };

    // Validations

    if (
        !request.body.firstName ||
        !request.body.lastName ||
        !request.body.utuAccount ||
        !request.body.email ||
        !request.body.hometown
    ) {
        return response.json(httpResponses.onFieldEmpty);
    }

    if (request.body.password !== request.body.passwordAgain) {
        return response.json(httpResponses.onNotSamePasswordError);
    }

    // Check client side access

    const accessTo = request.body.access.toLowerCase();

    if (accessTo === 'admin' || accessTo === 'board') {
        if (request.body.password === '' || request.body.password === null) {
            delete adminProfile.password;
        } else if (request.body.password.length < 6) {
            return response.json(httpResponses.onTooShortPassword);
        }

        // Send mail to member if member is just accepted

        utils
            .checkUserControl(request.body.id)
            .then(admin => {
                Member.findOne({ _id: memberID })
                    .lean()
                    .exec((error, doc) => {
                        if (error) return response.json(error);
                        if (!doc.accepted && adminProfile.accepted) {
                            let mailOptions = {
                                from: mail.mailSender,
                                to: adminProfile.email,
                                subject:
                                    'Jäsenyytesi Asteriski ry:lle hyväksytty',
                                text:
                                    'Jäsenyytesi Asteriski ry:lle hyväksytty\n\n' +
                                    'Pääset tarkastelemaan jäsentietojasi osoitteessa ' +
                                    config.clientUrl,
                            };
                            mail.transporter.sendMail(mailOptions);
                        }
                    });
            })
            .catch(error => {
                return response.json(httpResponses.onServerAdminFail);
            });

        // Save member details

        utils
            .checkUserControl(request.body.id)
            .then(admin => {
                Member.findOneAndUpdate({ _id: memberID }, adminProfile)
                    .lean()
                    .exec((error, doc) => {
                        if (error) return response.json(httpResponses.onMustBeUnique);
                        return response.json(
                            httpResponses.onProfileUpdateSuccess
                        );
                    });
            })
            .catch(error => {
                return response.json(httpResponses.onServerAdminFail);
            });
    } else {
        return response.json(httpResponses.clientAdminFailed);
    }
}

module.exports = {
    get: get,
    update: update,
};
