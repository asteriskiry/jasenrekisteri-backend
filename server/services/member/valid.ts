import Member from '../../models/Member.js'

// Check if membership valid

async function isMembershipValid(request, response) {
  const memberID = request.user._id

  try {
    const member = await Member.findOne({ _id: memberID })
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
  } catch (error) {
    return response.json(error)
  }
}

export default {
  isMembershipValid,
}
