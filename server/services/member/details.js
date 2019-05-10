const Member = require('../../models/Member');
const utils = require('../../utils');
const httpResponses = require('./');

function fetchDetails(request, response) {
    const memberID = request.query.memberID;

    Member.findOne({ _id: memberID }, (error, doc) => {
        if (error) response.json(error);

        const member = doc.toObject();

        delete member.password;

        response.json(member);
    });
}

function updateDetails(request, response) {
    utils.getUser(request.body._id)
        .then(user => {
            let query = {
                _id: request.body._id
            };

            let record = {
                firstName: request.body.firstName,
                lastName: request.body.lastName,
                utuAccount: request.body.utuAccount,
                email: request.body.email,
                hometown: request.body.hometown,
                tyyMember: request.body.tyyMember,
                tiviaMember: request.body.tiviaMember,
                password: request.body.password
            };

            if (request.body.password === '') {
                delete record.password;
            }

            Member.findOneAndUpdate(query, record, { new: true }, (error, doc) => {
                if (error) return response.json(error);
                return response.json(httpResponses.onUpdateSuccess);
            });
        })
        .catch(error => {
            return response.json(error);
        });
}

module.exports = {
    fetchDetails: fetchDetails,
    updateDetails: updateDetails
};
