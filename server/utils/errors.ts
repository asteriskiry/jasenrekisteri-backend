import mongoose from 'mongoose'
import type { NextFunction, Request, Response } from 'express'
import { failure } from './responses.js'

export class ApiError extends Error {
  statusCode: number
  code: string
  details?: Record<string, string>

  constructor(statusCode: number, code: string, message: string, details?: Record<string, string>) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function errorHandler(error: unknown, request: Request, response: Response, next: NextFunction) {
  if (response.headersSent) return next(error)

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json(failure(error.code, error.message, error.details))
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(error.errors).map(([field, fieldError]) => [field, fieldError.message])
    )
    return response.status(400).json(failure('VALIDATION_ERROR', 'Validation failed.', details))
  }

  if (error instanceof mongoose.Error.CastError) {
    return response.status(400).json(failure('INVALID_VALUE', `Invalid value for ${error.path}.`))
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    const duplicateFields = Object.keys(('keyPattern' in error && error.keyPattern) || {})
    return response
      .status(409)
      .json(failure('DUPLICATE_RESOURCE', 'A resource with the same unique value already exists.', {
        fields: duplicateFields.join(', '),
      }))
  }

  console.error(error)
  return response.status(500).json(failure('INTERNAL_SERVER_ERROR', 'Something went wrong.'))
}
