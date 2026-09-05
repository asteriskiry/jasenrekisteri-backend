import Member from '../models/Member.js'

// Access control utils

async function checkUserControl(id) {
  const doc = await Member.findOne({ _id: id })
  if (doc && ['admin', 'board'].includes(doc.role.toLowerCase())) return true
  throw {
    success: false,
    message: 'Tämä alue on vain hallituslaisille.',
  }
}

async function checkAdminControl(id) {
  const doc = await Member.findOne({ _id: id })
  if (doc && doc.role.toLowerCase() === 'admin') return true
  throw {
    success: false,
    message: 'Tämä alue on vain ylläpitäjille.',
  }
}

async function getUser(id) {
  const user = await Member.findOne({ _id: id })
  return user.firstName
}

export default {
  checkUserControl: checkUserControl,
  checkAdminControl: checkAdminControl,
  getUser: getUser,
}
