import { failure, success } from '../../utils/responses.js'

export default {
  onUpdateSuccess: success('Tiedot päivitetty onnistuneesti.'),
  onFieldEmpty: failure('VALIDATION_ERROR', 'Kaikki paitsi salasanakentät ovat pakollisia.'),
  onPasswordNotMatch: failure('VALIDATION_ERROR', 'Salasanat eivät täsmää.'),
  onClientAdminFail: failure('FORBIDDEN', 'Asiakas ei ole admin.'),
  onServerAdminFail: failure('FORBIDDEN', 'Tämä alue vain vain hallituslaisille.'),
  onTooShortPassword: failure('VALIDATION_ERROR', 'Salasanan minimipituus on 6 merkkiä.'),
  onMustBeUnique: failure('DUPLICATE_RESOURCE', 'Sähköpostiosoitteen ja UTU-tunnuksen oltava uniikkeja.'),
  onValidationError: failure('VALIDATION_ERROR', 'Jossakin kentässä on vikaa.'),
}
