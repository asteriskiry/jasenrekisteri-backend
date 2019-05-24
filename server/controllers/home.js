'use strict';

function index(request, response) {
    response.json('Jäsenrekisteri API');
}

module.exports = {
    index: index,
};
