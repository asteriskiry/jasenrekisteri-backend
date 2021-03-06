// Payment responses

module.exports = {
  onError: {
    success: false,
    message: 'Jotain meni vikaan.',
  },
  onPaymentError: {
    success: false,
    message: 'Jotain meni vikaan. Ota yhteyttä Asteriskin hallitukseen.',
  },
  onPaymentSuccess: {
    success: true,
    message: 'Maksun käsittely onnistui.',
  },
  onPaymentCancel: {
    success: true,
    message: 'Maksu peruutettu.',
  },
  onPaymentNotFoundOrAlredyProcessed: {
    success: false,
    message: 'Kyseinen maksu on jo käsitelty tai sitä ei löytynyt.',
  },
}
