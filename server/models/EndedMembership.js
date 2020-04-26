const mongoose = require('mongoose')

const EndedMembershipSchema = new mongoose.Schema({
  userID: {
    type: String,
  },
  mailSent: {
    type: Date,
  },
})

module.exports = mongoose.model('EndedMembership', EndedMembershipSchema)
