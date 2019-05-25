const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');
const mail = require('../../../config/mail');

function get(request, response) {
    const memberID = request.query.memberID;

    const accessTo = request.query.access.toLowerCase();

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
                                from:
                                    'Asteriski jäsenrekisteri <jasenrekisteri@asteriski.fi>',
                                to: adminProfile.email,
                                subject:
                                    'Jäsenyytesi Asteriski ry:lle hyväksytty',
                                text:
                                    'Jäsenyytesi Asteriski ry:lle hyväksytty\n\n' +
                                    'Pääset tarkastelemaan jäsentietojasi osoitteessa https://rekisteri.asteriski.fi',
                            };
                            mail.transporter.sendMail(mailOptions);
                        }
                    });
            })
            .catch(error => {
                return response.json(httpResponses.onServerAdminFail);
            });

        // Save member info
        utils
            .checkUserControl(request.body.id)
            .then(admin => {
                Member.findOneAndUpdate({ _id: memberID }, adminProfile)
                    .lean()
                    .exec((error, doc) => {
                        if (error) return response.json(error);
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
