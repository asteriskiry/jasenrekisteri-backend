function endedMembershipMail(clientUrl) {
  return {
    subject: 'Asteriski ry:n jäsenyytesi on päättynyt',
    text:
      'Jäsenyytesi Asteriski ry:lle on päättynyt.\n\n' +
      'Maksa jäsenmaksusi osoitteessa ' +
      clientUrl +
      ' tai käteisenä Asteriski ry:n hallitukselle.' +
      '\n\n' +
      'Tähän sähköpostiin ei voi vastata. Kysymyksissä ota yhteyttä osoitteeseen asteriski@utu.fi.',
  }
}

module.exports = {
  endedMembershipMail,
}
