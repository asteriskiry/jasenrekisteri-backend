import { failure, success } from '../../utils/responses.js'

export default {
  onEmailEmpty: failure('VALIDATION_ERROR', 'Syötä sähköpostiosoite.'),
  onEmailOrPasswordEmpty: failure('VALIDATION_ERROR', 'Syötä sähköpostiosoite ja salasana.'),
  onPasswordUpdateSuccess: success('Salasana päivitetty onnistuneesti.'),
  onUserNotFound: failure('AUTHENTICATION_FAILED', 'Väärä sähköposti tai salasana.'),
  onAuthenticationFail: failure('AUTHENTICATION_FAILED', 'Väärä sähköposti tai salasana.'),
  onEmptyError: failure('VALIDATION_ERROR', 'Kaikki kentät ovat pakollisia.'),
  onValidationError: failure('VALIDATION_ERROR', 'Jossakin kentässä on vikaa.'),
  onUserSaveError: failure('DUPLICATE_RESOURCE', 'Sähköpostiosoitteen ja UTU-tunnuksen oltava uniikkeja.'),
  onNotSamePasswordError: failure('VALIDATION_ERROR', 'Salasanat eivät täsmää.'),
  onUserSaveSuccess: success('Käyttäjätunnus luotu onnistuneesti.'),
  onResetFail: failure('RESET_FAILED', 'Ongelma palautuksessa.'),
  onMailSent: success('Salasanan palautuslinkki lähetetty jos sellainen sähköpostiosoite löytyi järjestelmästä.'),
  onMailFail: failure('MAIL_FAILED', 'Sähköpostin lähetys epäonnistui.'),
  onInvalidToken: failure('INVALID_TOKEN', 'Linkki vanhentunut.'),
  onTooShortPassword: failure('VALIDATION_ERROR', 'Salasanan minimipituus on 6 merkkiä.'),
  onError: failure('INTERNAL_SERVER_ERROR', 'Jotain meni vikaan.'),
}
