/** Errors the transport layer maps to HTTP status codes / socket error acks. */
export class NotFoundError extends Error {
  readonly status = 404;
}
export class ValidationError extends Error {
  readonly status = 400;
}
export class ForbiddenError extends Error {
  readonly status = 403;
}
export class ConflictError extends Error {
  readonly status = 409;
}
