// More clear email templating system

const config = require('../../config/config')

const memberFooter =
  '\n\nTähän sähköpostiin ei voi vastata. Kysymyksissä ota yhteyttä Asteriski ry:n hallitukseen (' +
  config.boardMailAddress +
  ').\n\n' +
  '--\nAsteriski ry jäsenrekisteri\n' +
  config.clientUrl
const boardFooter = '\n\nTähän sähköpostiin ei voi vastata.\n\n--\nAsteriski ry jäsenrekisteri\n' + config.clientUrl

function endedMembershipMail() {
  return {
    subject: 'Asteriski ry:n jäsenyytesi on päättynyt',
    text:
      'Jäsenyytesi Asteriski ry:lle on päättynyt.\n\n' +
      'Maksa jäsenmaksusi osoitteessa ' +
      config.clientUrl +
      ' tai käteisenä Asteriski ry:n hallitukselle.' +
      memberFooter,
  }
}

function memberDeletedMail() {
  return {
    subject: 'Asteriski ry:n jäsenyys päättynyt.',
    text: 'Asteriski ry:n jäsentietosi on poistettu. Tämän myötä jäsenyytesi on päättynyt.' + memberFooter,
  }
}

function membershipApprovedMail() {
  return {
    subject: 'Jäsenyytesi Asteriski ry:lle hyväksytty',
    text:
      'Jäsenyytesi Asteriski ry:lle hyväksytty.\n\n' +
      'Pääset tarkastelemaan jäsentietojasi osoitteessa ' +
      config.clientUrl +
      memberFooter,
  }
}

function importMail(
  firstName,
  lastName,
  utuAccount,
  email,
  hometown,
  tyyMember,
  tiviaMember,
  role,
  accessRights,
  membershipStarts,
  membershipEnds,
  accepted,
  password
) {
  return {
    subject: 'Asteriski ry:n uusi jäsenrekisteri julkaistu',
    text:
      'Asteriski ry on julkaissut uuden jäsenrekisterin: ' +
      config.clientUrl +
      '\n\n' +
      'Uuden jäsenreksiterin avulla voit tarkistaa jäsentietosi, jäsenyytesi voimassaolon ja esimerkiksi kulkuoikeuksesi statuksen. Voit myös muuttaa jäsentietojasi suoraan nettikäyttöliittymästä. Jäsenmaksun maksaminen on myös mahdollista ja jäsenyytesi voimassaolo päivittyy reaaliaikaisesti. Kulkuoikeudet päivittyvät yliopiston järjestelmään noin vuorokauden sisällä. Maksuvaihtoehtoina on tavallisimmat verkkopankit.\n\n' +
      'Tietosi on tallennettu uuteen jäsenrekisteriisi jäsentiedoilla:\n\n' +
      'Etunimi: ' +
      firstName +
      '\n' +
      'Sukunimi: ' +
      lastName +
      '\n' +
      'UTU-tunnus: ' +
      utuAccount +
      '\n' +
      'Sähköposti: ' +
      email +
      '\n' +
      'Kotikunta: ' +
      hometown +
      '\n' +
      'TYYn jäsen: ' +
      tyyMember +
      '\n' +
      'TIVIAn jäsen: ' +
      tiviaMember +
      '\n' +
      'Rooli: ' +
      role +
      '\n' +
      '24/7 kulkuoikeudet: ' +
      accessRights +
      '\n' +
      'Jäsenyys alknut: ' +
      membershipStarts +
      '\n' +
      'Jäsenyys päättyy: ' +
      membershipEnds +
      '\n' +
      'Hyväksytty jäseneksi: ' +
      accepted +
      '\n\n' +
      'Sinulle generoitu salasana jolla pääset kirjautumaan: ' +
      '\n\n' +
      password +
      '\n\n' +
      'Käyttäjätunnuksena toimii sähköpostiosoitteesi.' +
      '\n\n' +
      'Heti ensimmäisenä kannattaa käydä tarkistamassa jäsentietosi ja vaihtamassa salasana osoitteessa ' +
      config.clientUrl +
      '\n\n' +
      'Jäsenasioissa voit ottaa yhteyttä Asteriski ry:n hallitukseen (asteriski@utu.fi)' +
      '\n' +
      'Teknisissä asioissa voit ottaa yhteyttä WWW-toimikuntaan (www-asteriski@utu.fi) tai suoraan kehittäjään Maks Turtiaiseen (mjturt@utu.fi)' +
      memberFooter,
  }
}

function memberAddedMemberMail(
  firstName,
  lastName,
  utuAccount,
  email,
  hometown,
  tyyMember,
  tiviaMember,
  role,
  accessRights,
  membershipStarts,
  membershipEnds,
  accepted,
  password
) {
  return {
    subject: 'Sinut on lisätty Asteriski ry:n jäseneksi',
    text:
      'Onneksi olkoon, sinut on lisätty Asteriski ry:n jäseneksi.\n\n' +
      'Jäsentiedot:\n\n' +
      'Etunimi: ' +
      firstName +
      '\n' +
      'Sukunimi: ' +
      lastName +
      '\n' +
      'UTU-tunnus: ' +
      utuAccount +
      '\n' +
      'Sähköposti: ' +
      email +
      '\n' +
      'Kotikunta: ' +
      hometown +
      '\n' +
      'TYYn jäsen: ' +
      tyyMember +
      '\n' +
      'TIVIAn jäsen: ' +
      tiviaMember +
      '\n' +
      'Rooli: ' +
      role +
      '\n' +
      '24/7 kulkuoikeudet: ' +
      accessRights +
      '\n' +
      'Jäsenyys alkaa: ' +
      membershipStarts +
      '\n' +
      'Jäsenyys päättyy: ' +
      membershipEnds +
      '\n' +
      'Hyväksytty jäseneksi: ' +
      accepted +
      '\n' +
      'Salasana: ' +
      password +
      '\n\n' +
      'Pääset vaihtamaan salasanasi osoitteessa ' +
      config.clientUrl +
      memberFooter,
  }
}

function memberAddedBoardMail(
  firstName,
  lastName,
  utuAccount,
  email,
  hometown,
  tyyMember,
  tiviaMember,
  role,
  accessRights,
  membershipStarts,
  membershipEnds,
  accepted
) {
  return {
    subject: 'Uusi jäsen lisätty',
    text:
      'Uusi jäsen lisätty hallintapaneelin kautta.\n\n' +
      'Jäsentiedot:\n\n' +
      'Etunimi: ' +
      firstName +
      '\n' +
      'Sukunimi: ' +
      lastName +
      '\n' +
      'UTU-tunnus: ' +
      utuAccount +
      '\n' +
      'Sähköposti: ' +
      email +
      '\n' +
      'Kotikunta: ' +
      hometown +
      '\n' +
      'TYYn jäsen: ' +
      tyyMember +
      '\n' +
      'TIVIAn jäsen: ' +
      tiviaMember +
      '\n' +
      'Rooli: ' +
      role +
      '\n' +
      '24/7 kulkuoikeudet: ' +
      accessRights +
      '\n' +
      'Jäsenyys alkaa: ' +
      membershipStarts +
      '\n' +
      'Jäsenyys päättyy: ' +
      membershipEnds +
      '\n' +
      'Hyväksytty jäseneksi: ' +
      accepted +
      '\n\n' +
      'Jäsenelle generoitu salasana on lähetetty hänelle sähköpostitse.' +
      boardFooter,
  }
}

function forgotMail(userId, token) {
  return {
    subject: 'Jäsenrekisterin salasanan palautus',
    text:
      'Sinun sähköpostiosoitteellasi on pyydetty salasanan palautusta Asteriski ry:n jäsenrekisterissä.\n\n' +
      'Voit nollata jäsenrekisterin salasanan seuraavasta linkistä (voimassa 2 tuntia):\n' +
      config.clientUrl +
      '/reset/' +
      userId +
      '/' +
      token +
      memberFooter,
  }
}

function newMemberMemberMail(
  firstName,
  lastName,
  email,
  utuAccount,
  hometown,
  tyyMember,
  tiviaMember,
  password,
  productName,
  amount,
  timestamp,
  membershipEnds
) {
  return {
    subject: 'Vahvistus Asteriski ry:n jäseneksi liittymisestä ja kuitti',
    text:
      'Onneksi olkoon Asteriski ry:n jäseneksi liittymisestä.\n' +
      'Asteriski ry:n hallitus hyväksyy jäsenyytesi mahdollisimman pian.\n\n' +
      'Jäsentiedot:\n\n' +
      'Etunimi: ' +
      firstName +
      '\n' +
      'Sukunimi: ' +
      lastName +
      '\n' +
      'UTU-tunnus: ' +
      utuAccount +
      '\n' +
      'Sähköposti: ' +
      email +
      '\n' +
      'Kotikunta: ' +
      hometown +
      '\n' +
      'TYYn jäsen: ' +
      tyyMember +
      '\n' +
      'TIVIAn jäsen: ' +
      tiviaMember +
      '\n\n' +
      'Olet maksanut tuotteesta: ' +
      productName +
      '\n\n' +
      'Sinulle generoitu salasana (suositeltua olisi vaihtaa): ' +
      password +
      '\n\n' +
      'Pääset tarkastelemaan jäsentietojasi ja vaihtamaan salasanasi osoitteessa ' +
      config.clientUrl +
      '\n\n' +
      '-----------------------------------------' +
      '\n\n' +
      'Kuitti Asteriski ry jäsenmaksusta:\n\n' +
      'Jäsenen nimi: ' +
      firstName +
      ' ' +
      lastName +
      '\n' +
      'Jäsenen UTU-tunnus: ' +
      utuAccount +
      '\n' +
      'Jäsenen sähköpostiosoite: ' +
      email +
      '\n' +
      'Tuote: ' +
      productName +
      '\n' +
      'Maksun määrä: ' +
      amount +
      ' €\n' +
      'Maksun aikaleima: ' +
      timestamp +
      '\n' +
      'Uusi jäsenyyden päättymispäivä: ' +
      membershipEnds +
      '\n\n' +
      'Maksajan tiedot ovat samat kuin jäsenen. Kiitos maksustasi.' +
      memberFooter,
  }
}

function newMemberBoardMail(firstName, lastName, email, utuAccount, hometown, tyyMember, tiviaMember, productName) {
  return {
    subject: 'Asteriski ry:n uusi jäsen',
    text:
      'Uusi jäsen liittynyt.\n\n' +
      'Jäsentiedot:\n\n' +
      'Etunimi: ' +
      firstName +
      '\n' +
      'Sukunimi: ' +
      lastName +
      '\n' +
      'UTU-tunnus: ' +
      utuAccount +
      '\n' +
      'Sähköposti: ' +
      email +
      '\n' +
      'Kotikunta: ' +
      hometown +
      '\n' +
      'TYYn jäsen: ' +
      tyyMember +
      '\n' +
      'TIVIAn jäsen: ' +
      tiviaMember +
      '\n\n' +
      'Jäsen on maksanut tuotteesta: ' +
      productName +
      '\n\n' +
      'Voitte hyväksyä jäsenen osoitteessa ' +
      config.clientUrl +
      boardFooter,
  }
}

function receiptMail(firstName, lastName, utuAccount, email, productName, amount, timestamp, membershipEnds) {
  return {
    subject: 'Kuitti Asteriski ry jäsenmaksusta',
    text:
      'Kuitti Asteriski ry jäsenmaksusta:\n\n' +
      'Jäsenen nimi: ' +
      firstName +
      ' ' +
      lastName +
      '\n' +
      'Jäsenen UTU-tunnus: ' +
      utuAccount +
      '\n' +
      'Jäsenen sähköpostiosoite: ' +
      email +
      '\n' +
      'Tuote: ' +
      productName +
      '\n' +
      'Maksun määrä: ' +
      amount +
      ' €\n' +
      'Maksun aikaleima: ' +
      timestamp +
      '\n' +
      'Uusi jäsenyyden päättymispäivä: ' +
      membershipEnds +
      '\n\n' +
      'Maksajan tiedot ovat samat kuin jäsenen. Kiitos maksustasi.' +
      memberFooter,
  }
}

module.exports = {
  endedMembershipMail,
  memberDeletedMail,
  membershipApprovedMail,
  importMail,
  memberAddedMemberMail,
  memberAddedBoardMail,
  forgotMail,
  newMemberMemberMail,
  newMemberBoardMail,
  receiptMail,
}
