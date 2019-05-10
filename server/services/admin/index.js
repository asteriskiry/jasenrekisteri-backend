module.exports = {
    clientAdminFailed: {
        success: false,
        message: 'Client ei ole admin.'
    },
    onServerAdminFail: {
        success: false,
        message: 'Tämä alue on vain hallituslaisille.'
    },
    memberAddedSuccesfully: {
        success: true,
        message: 'Uusi jäsen lisätty onnistuneesti.'
    },
    onProfileUpdateSuccess: {
        success: true,
        message: 'Tiedot päivitetty onnistuneesti.'
    },
    onProfileUpdatePasswordEmpty: {
        success: false,
        message: 'Syötä salasana.'
    },
    onProfileUpdateUsernameEmpty: {
        success: false,
        message: 'Syötä sähköpostiosoite.'
    },
    onProfileUpdatePasswordUserEmpty: {
        success: false,
        message: 'Syötä sähköpostiosoite ja salasana.'
    },
    onNotSamePasswordError: {
        success: true,
        message: 'Salasanat ei täsmää.'
    }
};
