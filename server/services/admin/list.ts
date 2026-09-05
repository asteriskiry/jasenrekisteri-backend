import Member from '../../models/Member.js'

import utils from '../../utils/index.js'
import httpResponses from './index.js'

// Member list

async function list(request, response) {
  const userRole = request.user.role.toLowerCase()

  if (userRole === 'admin' || userRole === 'board') {
    try {
      await utils.checkUserControl(request.user._id)

      const docs = await Member.find({})
      if (!docs) return response.json({ memberNotFound: true })

      const updatedDocument = docs.map((doc) => {
        let documentToObject = doc.toObject()
        delete documentToObject.password
        return documentToObject
      })

      return response.json(updatedDocument)
    } catch (error) {
      console.error(error)
      return response.json(httpResponses.onServerAdminFail)
    }
  } else {
    return response.json(httpResponses.clientAdminFailed)
  }
}

export default {
  list: list,
}
