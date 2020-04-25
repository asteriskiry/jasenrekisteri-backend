const config = require('../../config/config')
const footer = '\n\n Tähän sähköpostiin ei voi vastata. Kysymyksissä ota yhteyttä osoitteeseen asteriski@utu.fi.'

function endedMembershipMail() {
  return {
    subject: 'Asteriski ry:n jäsenyytesi on päättynyt',
    text:
      'Jäsenyytesi Asteriski ry:lle on päättynyt.\n\n' +
      'Maksa jäsenmaksusi osoitteessa ' +
      config.clientUrl +
      ' tai käteisenä Asteriski ry:n hallitukselle.' +
      footer,
  }
}

function memberDeletedMail() {
  return {
    subject: 'Asteriski ry:n jäsenyys päättynyt.',
    text: 'Asteriski ry:n jäsentietosi on poistettu. Tämän myötä jäsenyytesi on päättynyt.' + footer,
  }
}

function membershipApprovedMail() {
  return {
    subject: 'Jäsenyytesi Asteriski ry:lle hyväksytty',
    text:
      'Jäsenyytesi Asteriski ry:lle hyväksytty.\n\n' +
      'Pääset tarkastelemaan jäsentietojasi osoitteessa ' +
      config.clientUrl +
      footer,
  }
}
module.exports = {
  endedMembershipMail,
  memberDeletedMail,
  membershipApprovedMail,
}
