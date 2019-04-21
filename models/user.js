// Membership database schema

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  idx: Number,
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
  passwordHash: String,
});

userSchema.statics.format = (user) => {
  return {
    idx: user.idx,
    firstName: user.firstName,
    lastName: user.lastName,
    utuAccount: String,
    email: user.email,
    membershipApproved: Date,
    membershipEnds: Date,
    hometown: String,
    tyyMember: Boolean,
    tiviaMember: Boolean,
    board: Boolean,
    admin: Boolean,
    accountCreated: Date,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
