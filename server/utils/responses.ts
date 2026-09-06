export function success<T>(message: string, data?: T) {
  return {
    success: true,
    ...(data === undefined ? {} : { data }),
    message,
  }
}

export function failure(code: string, message: string, details?: Record<string, string>) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  }
}
