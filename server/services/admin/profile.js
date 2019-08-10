const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');
const mail = require('../../../config/mail');
const config = require('../../../config/config');
const formatters = require('../../utils/formatters');
const validator = require('validator');

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
                        if (!doc) return response.json({ memberNotFound: true });
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

    // Validations

    console.log(typeof request.body.membershipEnds);
    if (
        !request.body.firstName ||
        !request.body.lastName ||
        !request.body.utuAccount ||
        !request.body.email ||
        !request.body.hometown
    ) {
        return response.json(httpResponses.onFieldEmpty);
    } else if (
        !validator.matches(request.body.firstName, /[a-zA-Z\u00c0-\u017e-]{2,20}$/g) ||
        !validator.matches(request.body.lastName, /[a-zA-Z\u00c0-\u017e-]{2,25}$/g) ||
        !validator.matches(request.body.utuAccount, /[a-öA-Ö]{4,8}$/g) ||
        !validator.isEmail(request.body.email) ||
        !validator.matches(request.body.hometown, /[a-zA-Z\u00c0-\u017e-]{2,25}$/g) ||
        !typeof request.body.tyyMember === 'boolean' ||
        !typeof request.body.tiviaMember === 'boolean' ||
        !typeof request.body.accessRights === 'boolean' ||
        !typeof request.body.accepted === 'boolean' ||
        !validator.isIn(request.body.role, ['Admin', 'Board', 'Member', 'Functionary']) ||
        !validator.isISO8601(request.body.membershipStarts) ||
        !validator.isISO8601(request.body.membershipEnds)
    ) {
        return response.json(httpResponses.onValidationError);
    }

    if (request.body.password !== request.body.passwordAgain) {
        return response.json(httpResponses.onNotSamePasswordError);
    }

    // Updated member data

    const adminProfile = {
        firstName: formatters.capitalizeFirstLetter(request.body.firstName),
        lastName: formatters.capitalizeFirstLetter(request.body.lastName),
        utuAccount: request.body.utuAccount.toLowerCase(),
        email: request.body.email.toLowerCase(),
        hometown: formatters.capitalizeFirstLetter(request.body.hometown),
        tyyMember: !!request.body.tyyMember,
        tiviaMember: !!request.body.tiviaMember,
        role: request.body.role,
        accessRights: !!request.body.accessRights,
        membershipStarts: request.body.membershipStarts,
        membershipEnds: request.body.membershipEnds,
        accepted: !!request.body.accepted,
        password: request.body.password,
    };


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
                                subject: 'Jäsenyytesi Asteriski ry:lle hyväksytty',
                                text:
                                    'Jäsenyytesi Asteriski ry:lle hyväksytty.\n\n' +
                                    'Pääset tarkastelemaan jäsentietojasi osoitteessa ' +
                                    config.clientUrl +
                                    '\n\n' +
                                    'Tähän sähköpostiin ei voi vastata. Kysymyksissä ota yhteyttä osoitteeseen asteriski@utu.fi.',
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
                        return response.json(httpResponses.onProfileUpdateSuccess);
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
