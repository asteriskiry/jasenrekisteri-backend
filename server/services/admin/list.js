const Member = require('../../models/Member.js');

const utils = require('../../utils');
const httpResponses = require('./');

function list(request, response) {
    if (request.query.access.toLowerCase() !== 'admin' | 'board') {
        return response.json(httpResponses.clientAdminFailed);
    }

    utils.checkUserControl(request.query.id)
        .then(user => {
            Member.find({}, null)
                .exec((error, docs) => {
                    if (error) return response.json(error);

                    let updatedDocument = docs.map(doc => {
                        let documentToObject = doc.toObject();

                        delete documentToObject.password;

                        return documentToObject;
                    });

                    return response.json(updatedDocument);
                });
        })
        .catch(error => {
            return response.json(httpResponses.onServerAdminFail);
        });
}

module.exports = {
    list: list
};
