import { badRequest } from './errors.js';

/**
 * Validates one part of the request with a zod schema and replaces it with the
 * parsed result, so handlers only ever see known-good, coerced data.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(badRequest('Some fields are invalid.', details));
    }

    if (source === 'query') {
      // req.query is a getter on Express 5, so assign onto a writable property.
      Object.defineProperty(req, 'validatedQuery', { value: result.data, writable: true });
    } else {
      req[source] = result.data;
    }
    return next();
  };
}

/** Reads whichever of query/validatedQuery is populated. */
export function queryOf(req) {
  return req.validatedQuery ?? req.query;
}
