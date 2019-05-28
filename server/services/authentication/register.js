'use strict';

const Member = require('../../models/Member');
const httpResponses = require('./');
const moment = require('moment');
const mail = require('../../../config/mail');
const config = require('../../../config/config');

function registerUser(request, response) {
    let {
        firstName,
        lastName,
        utuAccount,
        email,
        hometown,
        tyyMember,
        tiviaMember,
        membershipDuration,
        password,
        passwordAgain,
    } = request.body;

    // Validations

    if (
        !firstName ||
        !lastName ||
        !utuAccount ||
        !email ||
        !hometown ||
        !membershipDuration ||
        !password ||
        !passwordAgain
    ) {
        response.json(httpResponses.onValidationError);
    } else if (password !== passwordAgain) {
        response.json(httpResponses.onNotSamePasswordError);
    } else if (password.length < 6) {
        response.json(httpResponses.onTooShortPassword);
    } else {
        // Figure out membership end date

        let membershipEnds;
        membershipDuration = Number(membershipDuration);
        if (membershipDuration === 1) {
            membershipEnds = moment(new Date()).add(1, 'y');
        } else if (membershipDuration === 5) {
            membershipEnds = moment(new Date()).add(5, 'y');
        } else if (membershipDuration === 1.5) {
            membershipEnds = moment(new Date()).add(1, 'y');
            membershipEnds = moment(membershipEnds).month(11);
            membershipEnds = moment(membershipEnds).date(31);
        } else {
            response.json(httpResponses.onValidationError);
        }

        // New member record

        let newMember = new Member();
        newMember.firstName = firstName;
        newMember.lastName = lastName;
        newMember.utuAccount = utuAccount;
        newMember.email = email;
        newMember.hometown = hometown;
        newMember.tyyMember = !!tyyMember;
        newMember.tiviaMember = !!tiviaMember;
        newMember.accessRights = false;
        newMember.role = 'Member';
        newMember.membershipStarts = new Date();
        newMember.membershipEnds = membershipEnds;
        newMember.accountCreated = new Date();
        newMember.accepted = false;
        newMember.password = password;

        // Save new member

        newMember.save(error => {
            if (error) {
                return response.json(httpResponses.onUserSaveError);
            }

            response.json(httpResponses.onUserSaveSuccess);

            // Send mails to member and board

            let boardMailOptions = {
                from: mail.mailSender,
                to: 'mjturt@utu.fi',
                subject: 'Uusi jäsen',
                text:
                    'Uusi jäsen liittynyt.\n\n' +
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
                    '\n\n' +
                    'Jäsen on maksanut jäsenmaksun ' +
                    membershipDuration +
                    ' vuoden ajalle' +
                    '\n\n' +
                    'Voitte hyväksyä jäsenen osoitteessa ' +
                    config.clientUrl,
            };

            let memberMailOptions = {
                from: 'Asteriski jäsenrekisteri <jasenrekisteri@asteriski.fi>',
                to: email,
                subject: 'Vahvistus Asteriski ry:n jäseneksi liittymisestä',
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
                    '\n\n' +
                    'Olet maksanut jäsenyytesi ' +
                    membershipDuration +
                    ' vuoden ajalle' +
                    '\n\n' +
                    'Pääset tarkastelemaan jäsentietojasi osoitteessa ' +
                    config.clientUrl,
            };

            mail.transporter.sendMail(boardMailOptions);
            mail.transporter.sendMail(memberMailOptions);
        });
    }
}

module.exports = {
    registerUser: registerUser,
};
