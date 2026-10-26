import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = (result.error as ZodError).errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ error: 'Validation failed', errors });
      return;
    }
    // Replace the source with the parsed (and type-coerced) value
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
