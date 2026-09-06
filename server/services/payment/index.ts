import { failure, success } from '../../utils/responses.js'

export default {
  onError: failure('PAYMENT_ERROR', 'Jotain meni vikaan.'),
  onPaymentError: failure('PAYMENT_ERROR', 'Jotain meni vikaan. Ota yhteyttä Asteriskin hallitukseen.'),
  onPaymentSuccess: success('Maksun käsittely onnistui.'),
  onPaymentCancel: success('Maksu peruutettu.'),
  onPaymentNotFoundOrAlredyProcessed: failure('PAYMENT_NOT_FOUND', 'Kyseinen maksu on jo käsitelty tai sitä ei löytynyt.'),
}
