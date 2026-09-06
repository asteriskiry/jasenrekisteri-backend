import validator from 'validator'

export type ValidationErrors = Record<string, string>

export function validatePersonFields(body: Record<string, unknown>, includeMembership = false): ValidationErrors {
  const errors: ValidationErrors = {}
  const firstName = body.firstName
  const lastName = body.lastName
  const email = body.email
  const hometown = body.hometown

  if (typeof firstName !== 'string' || !validator.matches(firstName, /^[a-zA-Z\u00c0-\u017e- ]{2,20}$/)) {
    errors.firstName = 'First name must contain 2-20 letters.'
  }
  if (typeof lastName !== 'string' || !validator.matches(lastName, /^[a-zA-Z\u00c0-\u017e- ]{2,25}$/)) {
    errors.lastName = 'Last name must contain 2-25 letters.'
  }
  if (typeof email !== 'string' || !validator.isEmail(email)) errors.email = 'Email address is invalid.'
  if (typeof hometown !== 'string' || !validator.matches(hometown, /^[a-zA-Z\u00c0-\u017e- ]{2,25}$/)) {
    errors.hometown = 'Hometown must contain 2-25 letters.'
  }

  if (includeMembership) {
    if (typeof body.tyyMember !== 'boolean') errors.tyyMember = 'TYy membership must be a boolean.'
    if (typeof body.tiviaMember !== 'boolean') errors.tiviaMember = 'Tivia membership must be a boolean.'
    if (typeof body.accessRights !== 'boolean') errors.accessRights = 'Access rights must be a boolean.'
    if (typeof body.accepted !== 'boolean') errors.accepted = 'Accepted must be a boolean.'
    if (typeof body.role !== 'string' || !validator.isIn(body.role, ['Admin', 'Board', 'Member', 'Functionary'])) {
      errors.role = 'Role is invalid.'
    }
    if (typeof body.membershipStarts !== 'string' || !validator.isISO8601(body.membershipStarts)) {
      errors.membershipStarts = 'Membership start date is invalid.'
    }
    if (typeof body.membershipEnds !== 'string' || !validator.isISO8601(body.membershipEnds)) {
      errors.membershipEnds = 'Membership end date is invalid.'
    }
  } else if (typeof body.tyyMember !== 'boolean') {
    errors.tyyMember = 'TYy membership must be a boolean.'
  }

  return errors
}

export function validatePassword(body: Record<string, unknown>, required = false): ValidationErrors {
  const errors: ValidationErrors = {}
  const password = body.password
  const passwordAgain = body.passwordAgain

  if ((required && typeof password !== 'string') || (required && typeof passwordAgain !== 'string')) {
    errors.password = 'Password is required.'
  } else if (password !== undefined && password !== null && password !== '' && typeof password === 'string' && password.length < 6) {
    errors.password = 'Password must be at least 6 characters.'
  }
  if (password !== undefined && password !== passwordAgain) errors.passwordAgain = 'Passwords do not match.'
  return errors
}

export function validateEmail(body: Record<string, unknown>): ValidationErrors {
  return typeof body.email === 'string' && validator.isEmail(body.email)
    ? {}
    : { email: 'Email address is invalid.' }
}
