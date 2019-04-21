// Membership database schema

var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    utuAccount: String,
    email: String,
    membershipApproved: Date,
    membershipEnds: Date,
    hometown: String,
    tyyMember: Boolean,
    tiviaMember: Boolean,
    board: Boolean,
    admin: Boolean,
    accountCreated: Date,
    password: String,
});

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
