const generator = require('generate-password');
const moment = require('moment');

const Member = require('../../models/Member');
const utils = require('../../utils');
const httpResponses = require('./');
const mail = require('../../../config/mail');
const config = require('../../../config/config');
const formatters = require('../../utils/formatters');
const validator = require('validator');

// Add new member

function save(request, response) {
    const {
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
    } = request.body;

    const accessTo = request.body.access.toLowerCase();

    // Client side access check and validations

    if (accessTo === 'admin' || accessTo === 'board') {
        if (
            !firstName ||
            !lastName ||
            !utuAccount ||
            !email ||
            !hometown ||
            !role ||
            !membershipStarts ||
            !membershipEnds
        ) {
            return response.json(httpResponses.onAllFieldEmpty);
        } else if (
            !validator.matches(request.body.firstName, /[a-zA-Z\u00c0-\u017e- ]{2,20}$/g) ||
            !validator.matches(request.body.lastName, /[a-zA-Z\u00c0-\u017e- ]{2,25}$/g) ||
            !validator.matches(request.body.utuAccount, /[a-öA-Ö]{4,8}$/g) ||
            !validator.isEmail(request.body.email) ||
            !validator.matches(request.body.hometown, /[a-zA-Z\u00c0-\u017e- ]{2,25}$/g) ||
            !typeof request.body.tyyMember === 'boolean' ||
            !typeof request.body.tiviaMember === 'boolean' ||
            !typeof request.body.accessRights === 'boolean' ||
            !typeof request.body.accepted === 'boolean' ||
            !validator.isIn(request.body.role, ['Admin', 'Board', 'Member', 'Functionary']) ||
            !validator.isISO8601(request.body.membershipStarts) ||
            !validator.isISO8601(request.body.membershipEnds)
        ) {
            return response.json(httpResponses.onValidationError);
        }

        const password = generator.generate({
            length: 8,
            numbers: true,
        });

        // Server side access check and save new member

        utils
            .checkUserControl(request.body.id)
            .then(user => {
                let newMember = new Member();
                newMember.firstName = formatters.capitalizeFirstLetter(firstName);
                newMember.lastName = formatters.capitalizeFirstLetter(lastName);
                newMember.utuAccount = utuAccount.toLowerCase();
                newMember.email = email.toLowerCase();
                newMember.hometown = formatters.capitalizeFirstLetter(hometown);
                newMember.tyyMember = !!tyyMember;
                newMember.tiviaMember = !!tiviaMember;
                newMember.role = role;
                newMember.accessRights = !!accessRights;
                newMember.membershipStarts = membershipStarts;
                newMember.membershipEnds = membershipEnds;
                newMember.accountCreated = new Date();
                newMember.accepted = !!accepted;
                newMember.password = password;

                newMember.save(error => {
                    if (error) return response.json(httpResponses.onMustBeUnique);

                    // Send mail to board and member

                    let boardMailOptions = {
                        from: mail.mailSender,
                        to: mail.boardMailAddress,
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
                            (tyyMember ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'TIVIAn jäsen: ' +
                            (tiviaMember ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'Rooli: ' +
                            roleSwitchCase(role) +
                            '\n' +
                            '24/7 kulkuoikeudet: ' +
                            (accessRights ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'Jäsenyys alkaa: ' +
                            moment(membershipStarts).format('DD.MM.YYYY') +
                            '\n' +
                            'Jäsenyys päättyy: ' +
                            moment(membershipEnds).format('DD.MM.YYYY') +
                            '\n' +
                            'Hyväksytty jäseneksi: ' +
                            (accepted ? 'Kyllä' : 'Ei') +
                            '\n\n' +
                            'Jäsenelle generoitu salasana on lähetetty hänelle sähköpostitse.' +
                            '\n\n' +
                            'Tähän sähköpostiin ei voi vastata.',
                    };

                    let memberMailOptions = {
                        from: mail.mailSender,
                        to: email,
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
                            (tyyMember ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'TIVIAn jäsen: ' +
                            (tiviaMember ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'Rooli: ' +
                            roleSwitchCase(role) +
                            '\n' +
                            '24/7 kulkuoikeudet: ' +
                            (accessRights ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'Jäsenyys alkaa: ' +
                            moment(membershipStarts).format('DD.MM.YYYY') +
                            '\n' +
                            'Jäsenyys päättyy: ' +
                            moment(membershipEnds).format('DD.MM.YYYY') +
                            '\n' +
                            'Hyväksytty jäseneksi: ' +
                            (accepted ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'Salasana: ' +
                            password +
                            '\n\n' +
                            'Pääset vaihtamaan salasanasi osoitteessa ' +
                            config.clientUrl +
                            '\n\n' +
                            'Tähän sähköpostiin ei voi vastata. Kysymyksissä ota yhteyttä osoitteeseen asteriski@utu.fi.',
                    };

                    let importMailOptions = {
                        from: mail.mailSender,
                        to: email,
                        subject: 'Asteriski ry:n uusi jäsenrekisteri julkaistu',
                        text:
                            'Asteriski ry on julkaissut uuden jäsenrekisterin: ' +
                            config.clientUrl +
                            '\n\n' +
                            'Uuden jäsenreksiterin avulla voit tarkistaa jäsentietosi, jäsenyytesi voimassaolon ja esimerkiksi kulkuoikeuksesi statuksen. Voit myös muuttaa jäsentietojasi suoraan nettikäyttöliittymästä. Jäsenmaksun maksaminen on myös mahdollista ja jäsenyytesi voimassaolo päivittyy reaaliaikaisesti. Kulkuoikeudet päivittyvät yliopiston järjestelmään noin vuorokauden sisällä. Maksuvaihtoehtoja löytyy verkkopankeista Mobilepayhyn.\n\n' +
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
                            (tyyMember ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'TIVIAn jäsen: ' +
                            (tiviaMember ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'Rooli: ' +
                            roleSwitchCase(role) +
                            '\n' +
                            '24/7 kulkuoikeudet: ' +
                            (accessRights ? 'Kyllä' : 'Ei') +
                            '\n' +
                            'Jäsenyys alknut: ' +
                            moment(membershipStarts).format('DD.MM.YYYY') +
                            '\n' +
                            'Jäsenyys päättyy: ' +
                            moment(membershipEnds).format('DD.MM.YYYY') +
                            '\n' +
                            'Hyväksytty jäseneksi: ' +
                            (accepted ? 'Kyllä' : 'Ei') +
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
                            '\n\n' +
                            'Tähän sähköpostiin ei voi vastata.',
                    };

                    if (config.importMode === '1') {
                        mail.transporter.sendMail(importMailOptions);
                    } else {
                        mail.transporter.sendMail(boardMailOptions);
                        mail.transporter.sendMail(memberMailOptions);
                    }

                    return response.json(httpResponses.memberAddedSuccessfully);
                });
            })
            .catch(error => {
                return response.json(error);
            });
    } else {
        return response.json(httpResponses.clientAdminFailed);
    }
}

function roleSwitchCase(role) {
    switch (role.toLowerCase()) {
        case 'admin':
            return 'Admin';
        case 'board':
            return 'Hallitus';
        case 'functionary':
            return 'Toimihenkilö';
        case 'member':
            return 'Jäsen';
        default:
            return 'Jäsen';
    }
}

module.exports = {
    save: save,
};
