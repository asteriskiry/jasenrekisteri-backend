const Member = require('../../models/Member')

// Check if membership valid

function isMembershipValid(request, response) {
  const memberID = request.query.memberID

  Member.findOne({ _id: memberID }, (error, member) => {
    if (error) response.json(error)
    if (!member) return response.json({ memberNotFound: true })
    let currentDate = new Date()
    let memberData = {
      accepted: member.accepted,
      membershipStarts: member.membershipStarts,
      membershipEnds: member.membershipEnds,
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      accessRights: member.accessRights,
    }
    if (member.accepted) {
      if (currentDate > new Date(member.membershipStarts) && currentDate < new Date(member.membershipEnds)) {
        return response.json({
          success: true,
          message: 'Jäsenyys voimassa.',
          isValid: true,
          memberData,
        })
      }
    }
    return response.json({
      success: true,
      message: 'Jäsenyys ei voimassa.',
      isValid: false,
      memberData,
    })
  })
}

module.exports = {
  isMembershipValid,
}
