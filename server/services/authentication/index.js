module.exports = {
    onEmailEmpty: {
        success: false,
        message: 'Syötä sähköpostiosoite.',
    },
    onEmailOrPasswordEmpty: {
        success: false,
        message: 'Syötä sähköpostiosoite ja salasana.',
    },
    onPasswordUpdateSuccess: {
        success: true,
        message: 'Salasana päivitetty onnistuneesti.',
    },
    onUserNotFound: {
        success: false,
        message: 'Tällä sähköpostiosoitteella ei löytynyt jäsentietoja.',
    },
    onAuthenticationFail: {
        success: false,
        message: 'Väärä salasana.',
    },
    onValidationError: {
        success: false,
        message: 'Kaikki kentät ovat pakollisia.',
    },
    onUserSaveError: {
        success: false,
        message: 'Sähköpostiosoite on jo käytössä.',
    },
    onNotSamePasswordError: {
        success: false,
        message: 'Salasanat eivät täsmää.',
    },
    onUserSaveSuccess: {
        success: true,
        message: 'Käyttäjätunnus luotu onnistuneesti.',
    },
    onResetFail: {
        success: false,
        message: 'Ongelma palautuksessa.',
    },
    onMailSent: {
        success: true,
        message: 'Salasanan palautuslinkki lähetetty sähköpostiisi.',
    },
    onMailFail: {
        success: false,
        message: 'Sähköpostin lähetys epäonnistui.',
    },
    onInvalidToken: {
        success: false,
        message: 'Linkki vanhentunut.',
    },
};
