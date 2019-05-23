const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');

function get(request, response) {
    const memberID = request.query.memberID;
    console.log(request.query);

    if (request.query.access.toLowerCase() !== 'admin' || 'board') {
        return response.json(httpResponses.clientAdminFailed);
    }

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
}

function update(request, response) {
    console.log(request.body);
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

    if (request.body.access.toLowerCase() !== 'admin' || 'board') {
        return response.json(httpResponses.clientAdminFailed);
    }

    if (request.body.password === '' || request.body.password === null) {
        delete adminProfile.password;
    }

    utils
        .checkUserControl(request.body.id)
        .then(admin => {
            Member.findOneAndUpdate({ _id: memberID }, adminProfile)
                .lean()
                .exec((error, doc) => {
                    if (error) return response.json(error);
                    return response.json(httpResponses.onProfileUpdateSuccess);
                });
        })
        .catch(error => {
            return response.json(httpResponses.onServerAdminFail);
        });
}

module.exports = {
    get: get,
    update: update,
};
