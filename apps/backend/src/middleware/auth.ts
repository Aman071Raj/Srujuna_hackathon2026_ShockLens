import type { Request, Response, NextFunction } from 'express';

// Augment session type
declare module 'express-session' {
  interface SessionData {
    userId: string;
    userEmail: string;
    userName: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  // Passes through regardless; routes can check req.session.userId themselves
  next();
}
