'use strict';

function index(request, response) {
    response.json('Jäsenrekisteri API home');
}

module.exports = {
    index: index
};
