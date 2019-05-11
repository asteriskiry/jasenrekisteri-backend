const Member = require('../../models/Member');

const utils = require('../../utils');
const httpResponses = require('./');

function remove(request, response) {
    if (request.body.admin.access.toLowerCase() !== 'admin' | 'board') {
        return response.json(httpResponses.clientAdminFailed);
    }

    utils.checkUserControl(request.body.admin.id)
        .then(admin => {
            Member.remove({ _id: request.body.id }, function(err) {
                if (err) response.json(err);
                response.json({ success: true, message: 'Jäsen poistettu.' });
            });
        });
}

module.exports = {
    remove: remove
};
