// Script for creating users

var prompt = require('prompt');
var mongoose = require('mongoose');
var User = require('../models/user');
var config = require('../utils/config');

var schema = {
    properties: {
        firstName: {
            description: 'Etunimi',
            required: true
        },
        lastName: {
            description: 'Sukunimi',
            required: true
        },
        utuAccount: {
            description: 'UTU-tunnus',
            required: true
        },
        email: {
            description: 'Sähköpostiosoite',
            required: true
        },
        hometown: {
            description: 'Kotikunta',
            required: true
        },
        tyyMember: {
            description: 'TYYn jäsen (true/false)',
            type: 'boolean',
            required: true
        },
        tiviaMember: {
            description: 'TIVIAn jäsen (true/false)',
            type: 'boolean',
            required: true
        },
        board: {
            description: 'Hallituksen jäsen (true/false)',
            type: 'boolean',
            required: true
        },
        admin: {
            description: 'Admin (true/false)',
            type: 'boolean',
            required: true
        },
        password: {
            description: 'Salasana',
            hidden: true,
            required: true
        }
    }
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
    console.log('  Hallituksen jäsen: ' + result.board);
    console.log('  Admin: ' + result.admin);

    mongoose.connect(config.mongoUrl, { useNewUrlParser: true });
    var db = mongoose.connection;

    db.once('open', function() {

        var newUser = new User();

        newUser.firstName = result.firstName;
        newUser.lastName = result.lastName;
        newUser.utuAccount = result.utuAccount;
        newUser.email = result.email;
        newUser.hometown = result.hometown;
        newUser.tyyMember = result.tyyMember;
        newUser.tiviaMember = result.tiviaMember;
        newUser.board = result.board;
        newUser.admin = result.admin;
        newUser.accountCreated = new Date();
        newUser.password = newUser.generateHash(result.password);

        newUser.save(function(err) {
            if (err) return console.error(err);
            console.log('Tallennus tietokantaan onnistui. Voit sulkea yhteyden (Ctrl-c).');
        });
    });
});
