const mongoose = require('mongoose');

const EndedMembershipSchema = new mongoose.Schema({
    userID: {
        type: String,
    },
});

module.exports = mongoose.model('EndedMembership', EndedMembershipSchema);
