// Script for creating users

var prompt = require('prompt');
var mongoose = require('mongoose');
var Member = require('../server/models/Member');
var config = require('../config/config');

var schema = {
    properties: {
        firstName: {
            description: 'Etunimi',
            required: true,
        },
        lastName: {
            description: 'Sukunimi',
            required: true,
        },
        utuAccount: {
            description: 'UTU-tunnus',
            required: true,
        },
        email: {
            description: 'Sähköpostiosoite',
            required: true,
        },
        hometown: {
            description: 'Kotikunta',
            required: true,
        },
        tyyMember: {
            description: 'TYYn jäsen (true/false)',
            type: 'boolean',
            required: true,
        },
        tiviaMember: {
            description: 'TIVIAn jäsen (true/false)',
            type: 'boolean',
            required: true,
        },
        role: {
            description: 'Rooli (Admin/Board/Functionary/Member)',
            type: 'String',
            required: true,
        },
        accessRights: {
            description: 'Kulkuoikeudet (true/false)',
            type: 'boolean',
            required: true,
        },
        accepted: {
            description: 'Hyväksytty jäseneksi (true/false)',
            type: 'boolean',
            required: true,
        },
        password: {
            description: 'Salasana',
            hidden: true,
            required: true,
        },
    },
};

prompt.start();

prompt.get(schema, function(err, result) {
    if (err) {
        throw err;
    }
    console.log('Uusi käyttäjä:');
    console.log('  Etunimi: ' + result.firstName);
    console.log('  Sukunimi: ' + result.lastName);
    console.log('  UTU-tunnus: ' + result.utuAccount);
    console.log('  Sähköpostiosoite: ' + result.email);
    console.log('  Kotikunta: ' + result.hometown);
    console.log('  TYYn jäsen: ' + result.tyyMember);
    console.log('  TIVIAn jäsen: ' + result.tiviaMember);
    console.log('  Rooli: ' + result.role);
    console.log('  Kulkuoikeudet: ' + result.accessRights);
    console.log('  Hyväksytty: ' + result.accepted);

    mongoose.connect(config.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    var db = mongoose.connection;

    db.once('open', function() {
        var newUser = new Member();

        newUser.firstName = result.firstName;
        newUser.lastName = result.lastName;
        newUser.utuAccount = result.utuAccount;
        newUser.email = result.email;
        newUser.hometown = result.hometown;
        newUser.tyyMember = result.tyyMember;
        newUser.tiviaMember = result.tiviaMember;
        newUser.role = result.role;
        newUser.accessRights = result.accessRights;
        newUser.membershipStarts = new Date();
        newUser.accountCreated = new Date();
        newUser.password = result.password;
        newUser.accepted = result.accepted;

        newUser.save(function(err) {
            if (err) return console.error(err);
            console.log(
                'Tallennus tietokantaan onnistui. Voit sulkea yhteyden (Ctrl-c).'
            );
        });
    });
});
