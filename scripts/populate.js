// Script for importing JSON:s

const axios = require('axios');

// Here JSON that you want to import to database
const jsondata = require('../jsondata/users.json');

console.log(jsondata);

const jotain = jsondata.map(n =>
    axios.post('http://localhost:3001/signup', n
    ).then((response) => {
        console.log(response);
    })
);
