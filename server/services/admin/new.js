const generator = require('generate-password');
const moment = require('moment');

const Member = require('../../models/Member');
const utils = require('../../utils');
const httpResponses = require('./');
const mail = require('../../../config/mail');
const config = require('../../../config/config');

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
                newMember.firstName = firstName;
                newMember.lastName = lastName;
                newMember.utuAccount = utuAccount;
                newMember.email = email;
                newMember.hometown = hometown;
                newMember.tyyMember = !!tyyMember;
                newMember.tiviaMember = !!tiviaMember;
                newMember.role = role;
                newMember.accessRights = !!accessRights;
                newMember.membershipStarts = membershipStarts;
                newMember.membershipEnds = membershipEnds;
                newMember.accountCreated = new Date();
                newMember.accepted = !!accepted;
                newMember.active = true;
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
                            'UTU-tunus: ' +
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
                            'UTU-tunus: ' +
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

                    mail.transporter.sendMail(boardMailOptions);
                    mail.transporter.sendMail(memberMailOptions);

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
