// Field formatters

function capitalizeFirstLetter(name) {
    let lowercase = name.toLowerCase();
    return lowercase.charAt(0).toUpperCase() + lowercase.slice(1);
}

module.exports = {
    capitalizeFirstLetter
};
