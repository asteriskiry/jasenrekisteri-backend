module.exports = {
    onUserPassEmpty: {
        success: false,
        message: 'Syötä sähköpostiosoite ja salasana.'
    },
    onPassEmpty: {
        success: false,
        message: 'Syötä salasana.'
    },
    onUsernameEmpty: {
        success: true,
        message: 'Syötä käyttäjätunnus.'
    },
    onPasswordUpdateSuccess: {
        success: true,
        message: 'Salasana päivitetty onnistuneesti.'
    },
    onUserNotFound: {
        success: false,
        message: 'Käyttäjää ei löydy.'
    },
    onAuthenticationFail: {
        success: false,
        message: 'Väärä salasana.'
    },
    onValidationError: {
        success: false,
        message: 'Kaikki kentät ovat pakollisia.'
    },
    onPasswordError: {
        success: false,
        message: 'Salasanat eivät ole samoja.'
    },
    onUserSaveError: {
        success: false,
        message: 'Sähköpostiosoite on jo käytössä.'
    },
    onNotSamePasswordError: {
        success: false,
        message: 'Salasanat eivät täsmää.'
    },
    onUserSaveSuccess: {
        success: true,
        message: 'Käyttäjätunnus luotu onnistuneesti.'
    }
};
