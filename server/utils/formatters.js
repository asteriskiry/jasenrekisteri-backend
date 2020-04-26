// Field formatters

function capitalizeFirstLetter(name) {
  let lowercase = name.toLowerCase()
  return lowercase.charAt(0).toUpperCase() + lowercase.slice(1)
}

function roleSwitchCase(role) {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'Admin'
    case 'board':
      return 'Hallitus'
    case 'functionary':
      return 'Toimihenkilö'
    case 'member':
      return 'Jäsen'
    default:
      return 'Jäsen'
  }
}

module.exports = {
  capitalizeFirstLetter,
  roleSwitchCase,
}
