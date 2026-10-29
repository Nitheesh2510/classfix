/** An error carrying an HTTP status, thrown by services and routes. */
export class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, message, details);
export const unauthorized = (message = 'Authentication required.') => new AppError(401, message);
export const forbidden = (message = 'You are not allowed to do that.') => new AppError(403, message);
export const notFound = (message = 'Not found.') => new AppError(404, message);
export const conflict = (message, details) => new AppError(409, message, details);

/** Catch-all for unmatched routes. */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { message: `No route matches ${req.method} ${req.originalUrl}` },
  });
}

/**
 * Single error responder. Known errors keep their status and message; anything
 * unexpected becomes a 500 with the detail logged rather than returned, so
 * internals are never leaked to a client.
 */
export function errorHandler(error, req, res, _next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: { message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
  }

  // Database constraint failures map to meaningful statuses.
  const code = error?.code ?? '';
  if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return res.status(409).json({ error: { message: 'That record already exists.' } });
  }
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res
      .status(400)
      .json({ error: { message: 'That record refers to something which does not exist.' } });
  }
  if (code === 'SQLITE_CONSTRAINT_TRIGGER' || code === 'SQLITE_CONSTRAINT_CHECK') {
    return res.status(409).json({ error: { message: error.message } });
  }
  if (code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: { message: 'That file is too large.' } });
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  }

  return res.status(500).json({ error: { message: 'Something went wrong on the server.' } });
}

/** Wraps an async handler so rejections reach the error handler. */
export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
