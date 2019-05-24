const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');

function save(request, response) {
    const {
        firstName,
        lastName,
        utuAccount,
        email,
        hometown,
        tyyMember,
        tiviaMember,
        role,
        accessRights,
        membershipStarts,
        membershipEnds,
        accepted,
        password,
        passwordAgain,
    } = request.body;

    const accessTo = request.body.access.toLowerCase();

    if (accessTo === 'admin' || accessTo === 'board') {
        if (password !== passwordAgain) {
            return response.json(httpResponses.onNotSamePasswordError);
        }

        if (
            !firstName ||
            !lastName ||
            !utuAccount ||
            !email ||
            !hometown ||
            !role ||
            !membershipStarts ||
            !membershipEnds ||
            !password ||
            !passwordAgain
        ) {
            return response.json(httpResponses.onAllFieldEmpty);
        }

        utils
            .checkUserControl(request.body.id)
            .then(user => {
                let newMember = new Member();
                newMember.firstName = firstName;
                newMember.lastName = lastName;
                newMember.utuAccount = utuAccount;
                newMember.email = email;
                newMember.hometown = hometown;
                newMember.tyyMember = !!tyyMember;
                newMember.tiviaMember = !!tiviaMember;
                newMember.role = role;
                newMember.accessRights = !!accessRights;
                newMember.membershipStarts = membershipStarts;
                newMember.membershipEnds = membershipEnds;
                newMember.accountCreated = new Date();
                newMember.accepted = !!accepted;
                newMember.password = password;

                newMember.save(error => {
                    if (error) return response.json(error);

                    return response.json(httpResponses.memberAddedSuccessfully);
                });
            })
            .catch(error => {
                return response.json(error);
            });
    } else {
        return response.json(httpResponses.clientAdminFailed);
    }
}

module.exports = {
    save: save,
};
