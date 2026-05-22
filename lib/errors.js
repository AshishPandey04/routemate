/**
 * Unified error handling system for RouteMATE
 * All API errors should use this class
 */

export class AppError extends Error {
  constructor(message, code, status = 500, details = {}) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
    this.timestamp = new Date().toISOString()
    this.name = 'AppError'
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        status: this.status,
        ...(process.env.NODE_ENV === 'development' && { details: this.details })
      }
    }
  }
}

/**
 * Predefined error codes for consistency
 */
export const ErrorCode = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNVERIFIED_ACCOUNT: 'UNVERIFIED_ACCOUNT',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  PHONE_EXISTS: 'PHONE_EXISTS',

  // Booking errors
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  SEATS_UNAVAILABLE: 'SEATS_UNAVAILABLE',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  TRIP_NOT_FOUND: 'TRIP_NOT_FOUND',
  INVALID_BOOKING_STATUS: 'INVALID_BOOKING_STATUS',
  REFUND_FAILED: 'REFUND_FAILED',

  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Rate limit errors
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
}

/**
 * Common error responses
 */
export const CommonErrors = {
  invalidCredentials: () =>
    new AppError('Invalid email or password', ErrorCode.INVALID_CREDENTIALS, 401),
  unverifiedAccount: () =>
    new AppError('Please verify your phone number first', ErrorCode.UNVERIFIED_ACCOUNT, 403),
  accountSuspended: () =>
    new AppError('Account suspended. Contact support', ErrorCode.ACCOUNT_SUSPENDED, 403),
  unauthorized: () =>
    new AppError('Unauthorized access', ErrorCode.UNAUTHORIZED, 401),
  forbidden: () =>
    new AppError('Forbidden', ErrorCode.FORBIDDEN, 403),
  notFound: (resource = 'Resource') =>
    new AppError(`${resource} not found`, `${resource.toUpperCase()}_NOT_FOUND`, 404),
  seatsUnavailable: () =>
    new AppError('Requested seats are not available', ErrorCode.SEATS_UNAVAILABLE, 400),
  validationError: (message) =>
    new AppError(message, ErrorCode.VALIDATION_ERROR, 400),
  tooManyRequests: () =>
    new AppError('Too many requests. Please try again later', ErrorCode.TOO_MANY_REQUESTS, 429),
  internalError: () =>
    new AppError('Internal server error', ErrorCode.INTERNAL_SERVER_ERROR, 500),
  externalServiceError: (service) =>
    new AppError(`${service} service unavailable. Please try again later`, ErrorCode.EXTERNAL_SERVICE_ERROR, 503),
}
