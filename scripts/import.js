// Script for importing CSV:s using admin/new API

const axios = require('axios');
const csv = require('fast-csv');
const fs = require('fs');

let stream = fs.createReadStream(__dirname + '/../csv/data.csv');

// Log in with admin account (with browser) and check jasenrekisteri-token and id from cookie in developer tools
const jasenrekisteriToken = '';
const id = '';

csv.fromStream(stream, { headers: false, delimiter: ';' })
    .on('data', function(data) {
        const newData = {
            firstName: data[0],
            lastName: data[1],
            utuAccount: data[2].replace(/@.*$/, ''),
            email: data[2],
            hometown: data[5],
            tyyMember: data[6] === 'kyllä',
            tiviaMember: data[7] === 'kyllä',
            role: 'Member',
            accessRights: data[8] === 'kyllä',
            membershipStarts: new Date(
                data[3].replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1')
            ),
            membershipEnds: new Date(
                data[4].replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1')
            ),
            accepted: true,
            access: 'Admin',
            id: id,
        };
        console.log(newData);
        axios.post('http://localhost:3001/api/admin/new', newData, {
            headers: {
                Authorization: jasenrekisteriToken,
                'Content-Type': 'application/json',
            },
        });
    })
    .on('end', function() {
        console.log('done');
    });
