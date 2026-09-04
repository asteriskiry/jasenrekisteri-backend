const Member = require('../../models/Member.js')

const utils = require('../../utils')
const httpResponses = require('./')

// Member list

async function list(request, response) {
  const accessTo = request.query.access.toLowerCase()

  if (accessTo === 'admin' || accessTo === 'board') {
    try {
      await utils.checkUserControl(request.query.id)

      const docs = await Member.find({})
      if (!docs) return response.json({ memberNotFound: true })

      const updatedDocument = docs.map(doc => {
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

module.exports = {
  list: list,
}
