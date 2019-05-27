// Member responses

module.exports = {
    onUpdateSuccess: {
        success: true,
        message: 'Tiedot päivitetty onnistuneesti.',
    },
    onFieldEmpty: {
        success: false,
        message: 'Kaikki paitsi salasanakentät ovat pakollisia.',
    },
    onPasswordNotMatch: {
        success: false,
        message: 'Salasanat eivät täsmää.',
    },
    onClientAdminFail: {
        success: false,
        message: 'Asiakas ei ole admin.',
    },
    onServerAdminFail: {
        success: false,
        message: 'Tämä alue vain vain hallituslaisille.',
    },
    onTooShortPassword: {
        success: false,
        message: 'Salasanan minimipituus on 6 merkkiä.',
    },
    onMustBeUnique: {
        success: false,
        message: 'Sähköpostiosoitteen ja UTU-tunnuksen oltava uniikkeja.',
    },
};
