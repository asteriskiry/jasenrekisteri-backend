module.exports = {
    onUpdateSuccess: {
        success: true,
        message: 'Tiedot päivitetty onnistuneesti.'
    },
    onClientAdminFail: {
        success: false,
        message: 'Asiakas ei ole admin.'
    },
    onServerAdminFail: {
        success: false,
        message: 'Tämä alue vain vain hallituslaisille.'
    }
};
