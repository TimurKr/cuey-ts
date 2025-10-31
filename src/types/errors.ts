/**
 * Error codes that can be returned by the API
 */
export type CueyErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR";

/**
 * Base error class for Cuey API errors
 */
export class CueyError extends Error {
  constructor(
    message: string,
    public readonly code: CueyErrorCode,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CueyError";
    Object.setPrototypeOf(this, CueyError.prototype);
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends CueyError {
  constructor(
    message = "Unauthorized. Invalid or missing API key.",
    details?: unknown,
  ) {
    super(message, "UNAUTHORIZED", 401, details);
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends CueyError {
  constructor(message = "Resource not found.", details?: unknown) {
    super(message, "NOT_FOUND", 404, details);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends CueyError {
  constructor(message: string, details?: unknown) {
    super(message, "BAD_REQUEST", 400, details);
    this.name = "BadRequestError";
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends CueyError {
  constructor(
    message: string,
    public readonly validationErrors: unknown,
  ) {
    super(message, "VALIDATION_ERROR", 400, validationErrors);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends CueyError {
  constructor(
    message = "An internal server error occurred.",
    details?: unknown,
  ) {
    super(message, "INTERNAL_SERVER_ERROR", 500, details);
    this.name = "InternalServerError";
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
