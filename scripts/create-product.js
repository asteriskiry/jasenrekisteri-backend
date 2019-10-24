// Script for creating products

var prompt = require('prompt');
var mongoose = require('mongoose');
var Product = require('../server/models/Product');
var config = require('../config/config');

var schema = {
    properties: {
        productId: {
            description: 'Tuotteen koodi (esim. 1234)',
            required: true,
        },
        name: {
            description: 'Tuotteen nimi',
            required: true,
        },
        category: {
            description: 'Tuotteen kategoria (Membership/Other)',
            required: true,
        },
        priceSnt: {
            description: 'Tuotten hinta sentteinä (esim. 5€ = 500)',
            required: true,
        },
        membershipDuration: {
            description: 'Jos kyseessä on jäsenyys niin jäsenyyden pituus vuosina',
        },
    },
};

prompt.start();

prompt.get(schema, function(err, result) {
    if (err) {
        throw err;
    }
    console.log('Uusi tuote:');
    console.log('  Tuotteen koodi: ' + result.productId);
    console.log('  Tuotteen nimi: ' + result.name);
    console.log('  Tuotteen kategoria: ' + result.category);
    console.log('  Tuotteen hinta sentteinä: ' + result.priceSnt);
    console.log('  Jäsenyyden pituus: ' + result.membershipDuration);

    mongoose.connect(config.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    var db = mongoose.connection;

    db.once('open', function() {
        var newProduct = new Product();

        newProduct.productId = result.productId;
        newProduct.name = result.name;
        newProduct.category = result.category;
        newProduct.priceSnt = result.priceSnt;
        newProduct.membershipDuration = result.membershipDuration;

        newProduct.save(function(err) {
            if (err) return console.error(err);
            console.log(
                'Tallennus tietokantaan onnistui. Voit sulkea yhteyden (Ctrl-c).'
            );
        });
    });
});
