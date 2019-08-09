// Admin responses

module.exports = {
    clientAdminFailed: {
        success: false,
        message: 'Client ei ole admin.',
    },
    onServerAdminFail: {
        success: false,
        message: 'Tämä alue on vain hallituslaisille.',
    },
    memberAddedSuccessfully: {
        success: true,
        message: 'Uusi jäsen lisätty onnistuneesti.',
    },
    onProfileUpdateSuccess: {
        success: true,
        message: 'Tiedot päivitetty onnistuneesti.',
    },
    onFieldEmpty: {
        success: false,
        message: 'Kaikki paitsi salasanakentät ovat pakollisia.',
    },
    onAllFieldEmpty: {
        success: false,
        message: 'Kaikki kentät ovat pakollisia.',
    },
    onNotSamePasswordError: {
        success: false,
        message: 'Salasanat ei täsmää.',
    },
    onTooShortPassword: {
        success: false,
        message: 'Salasanan minimipituus on 6 merkkiä.',
    },
    onMustBeUnique: {
        success: false,
        message: 'Sähköpostiosoitteen ja UTU-tunnuksen oltava uniikkeja.',
    },
    onValidationError: {
        success: false,
        message: 'Jossakin kentässä on vikaa.',
    },
};
