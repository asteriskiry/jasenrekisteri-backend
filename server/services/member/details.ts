import Member from '../../models/Member.js'
import httpResponses from './index.js'
import formatters from '../../utils/formatters.js'
import { validatePassword, validatePersonFields } from '../../validators/common.js'

// Get member details

async function fetchDetails(request, response) {
  const memberID = request.user._id

  try {
    const doc = await Member.findOne({ _id: memberID })
    if (!doc) return response.json({ memberNotFound: true })
    const member = doc.toObject()

    delete member.password

    return response.json(member)
  } catch (error) {
    return response.json(error)
  }
}

// Update member details

function updateDetails(request, response) {
  let query = {
    _id: request.user._id,
  }

  const errors = {
    ...validatePersonFields(request.body),
    ...validatePassword(request.body),
  }
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({
      ...httpResponses.onValidationError,
      error: { ...httpResponses.onValidationError.error, details: errors },
    })
  }

  let record = {
    firstName: formatters.capitalizeFirstLetter(request.body.firstName),
    lastName: formatters.capitalizeFirstLetter(request.body.lastName),
    utuAccount: request.body.utuAccount ? request.body.utuAccount.toLowerCase() : '',
    email: request.body.email.toLowerCase(),
    hometown: formatters.capitalizeFirstLetter(request.body.hometown),
    tyyMember: request.body.tyyMember,
    password: request.body.password,
  }

  if (request.body.password === '' || request.body.password === null) {
    delete record.password
  } else if (request.body.password.length < 6) {
    return response.json(httpResponses.onTooShortPassword)
  }

  // Update member details

  Member.findOneAndUpdate(query, record, { new: true })
    .then(() => response.json(httpResponses.onUpdateSuccess))
    .catch((error) => {
      throw error
    })
}

export default {
  fetchDetails: fetchDetails,
  updateDetails: updateDetails,
}
