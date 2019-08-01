// Script for creating default database entries

let mongoose = require('mongoose');
let moment = require('moment');
let Product = require('../server/models/Product');
let Member = require('../server/models/Member');
let config = require('../config/config');

console.log('\x1b[36m%s\x1b[0m', 'Skripti luo 4 tietokantamerkintää: 1 käyttäjätunnus ja 3 jäsenyystuotetta.');
console.log('\x1b[36m%s\x1b[0m', 'Kun skripti on valmis voit sulkea yhteyden Ctrl-c:llä.');
console.log('');
console.log('\x1b[33m%s\x1b[0m', 'Tuotannossa: Poista luotu käyttätunnus kun saat tehtyä oikean käyttäjätunnuksen tilalle.');
console.log('');

mongoose.connect(config.mongoUrl, { useNewUrlParser: true });
let db = mongoose.connection;

db.once('open', async function() {
    let adminUser = new Member();
    adminUser.firstName = 'Admin';
    adminUser.lastName = 'Riski';
    adminUser.utuAccount = 'admin';
    adminUser.email = 'admin@example.com';
    adminUser.hometown = 'Turku';
    adminUser.tyyMember = true;
    adminUser.tiviaMember = true;
    adminUser.role = 'Admin';
    adminUser.accessRights = true;
    adminUser.membershipStarts = new Date();
    adminUser.membershipEnds = moment()
        .add(1, 'y')
        .toDate();
    adminUser.accountCreated = new Date();
    adminUser.password = 'password';
    adminUser.accepted = true;

    let membership1 = new Product();
    membership1.productId = '1111';
    membership1.name = 'Jäsenyys 1 vuosi';
    membership1.category = 'Membership';
    membership1.priceSnt = 500;
    membership1.membershipDuration = 1;

    let membership5 = new Product();
    membership5.productId = '1555';
    membership5.name = 'Jäsenyys 5 vuotta';
    membership5.category = 'Membership';
    membership5.priceSnt = 2000;
    membership5.membershipDuration = 5;

    let membership2 = new Product();
    membership2.productId = '1222';
    membership2.name = 'Jäsenyys 1,5 vuotta (pilttitarjous)';
    membership2.category = 'Membership';
    membership2.priceSnt = 700;
    membership2.membershipDuration = 1.5;

    adminUser.save(function(err) {
        if (err) return console.error(err);
        console.log('\x1b[32m%s\x1b[0m', '    admin@example.com -käyttäjän tallennus onnistui (salasana: password).');
    });
    membership1.save(function(err) {
        if (err) return console.error(err);
        console.log('\x1b[32m%s\x1b[0m', '    1 vuoden jäsenyys -tuotteen tallennus onnistui (tuotekoodi: 1111).');
    });
    membership5.save(function(err) {
        if (err) return console.error(err);
        console.log('\x1b[32m%s\x1b[0m', '    5 vuoden jäsenyys -tuotteen tallennus onnistui (tuotekoodi: 1555).');
    });
    membership2.save(function(err) {
        if (err) return console.error(err);
        console.log('\x1b[32m%s\x1b[0m', '    Pilttitarjous -tuotteen tallennus onnistui. (tuotekoodi: 1222)');
    });
});
