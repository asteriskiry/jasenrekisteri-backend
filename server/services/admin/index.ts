import { failure, success } from '../../utils/responses.js'

export default {
  clientAdminFailed: failure('FORBIDDEN', 'Client ei ole admin.'),
  onServerAdminFail: failure('FORBIDDEN', 'Tämä alue on vain hallituslaisille.'),
  memberAddedSuccessfully: success('Uusi jäsen lisätty onnistuneesti.'),
  onProfileUpdateSuccess: success('Tiedot päivitetty onnistuneesti.'),
  onFieldEmpty: failure('VALIDATION_ERROR', 'Kaikki paitsi salasanakentät ovat pakollisia.'),
  onAllFieldEmpty: failure('VALIDATION_ERROR', 'Kaikki kentät ovat pakollisia.'),
  onNotSamePasswordError: failure('VALIDATION_ERROR', 'Salasanat ei täsmää.'),
  onTooShortPassword: failure('VALIDATION_ERROR', 'Salasanan minimipituus on 6 merkkiä.'),
  onMustBeUnique: failure('DUPLICATE_RESOURCE', 'Sähköpostiosoitteen ja UTU-tunnuksen oltava uniikkeja.'),
  onValidationError: failure('VALIDATION_ERROR', 'Jossakin kentässä on vikaa.'),
}
