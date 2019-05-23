const mongoose = require('mongoose');

const ResetPasswordSchema = new mongoose.Schema({
    userID: {
        type: String,
    },
    resetPasswordToken: {
        type: String,
    },
    expire: {
        type: Date,
    },
});

module.exports = mongoose.model('ResetPassword', ResetPasswordSchema);
