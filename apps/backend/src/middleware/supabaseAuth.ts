import type { NextFunction, Request, Response } from 'express';
import prisma from '../db';

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export interface SupabaseIdentity {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      supabaseIdentity?: SupabaseIdentity;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    supabaseId?: string;
  }
}

/** Validates bearer tokens against Supabase Auth before bridging to legacy API ownership. */
export async function supabaseAuthBridge(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    next();
    return;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(503).json({ error: 'Supabase auth is not configured on the API. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!authResponse.ok) {
      res.status(401).json({ error: 'Your session is invalid or expired. Sign in again.' });
      return;
    }

    const authUser = await authResponse.json() as {
      id?: string;
      email?: string;
      user_metadata?: { name?: string; full_name?: string };
    };
    if (!authUser.id || !authUser.email) {
      res.status(401).json({ error: 'Supabase returned an incomplete user identity.' });
      return;
    }

    const email = authUser.email.toLowerCase();
    const name = authUser.user_metadata?.name?.trim()
      || authUser.user_metadata?.full_name?.trim()
      || email.split('@')[0];

    // A signed API session keeps an already linked identity; first access links or creates it.
    let user = req.session.supabaseId === authUser.id && req.session.userId
      ? await prisma.user.findUnique({ where: { id: req.session.userId } })
      : null;

    if (!user) {
      user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
    }
    if (!user) {
      const emailUser = await prisma.user.findUnique({ where: { email } });
      if (emailUser) {
        if (emailUser.supabaseId && emailUser.supabaseId !== authUser.id) {
          res.status(409).json({ error: 'This email is already linked to another authentication account.' });
          return;
        }
        user = await prisma.user.update({
          where: { id: emailUser.id },
          data: { supabaseId: authUser.id, email, name },
        });
      } else {
        user = await prisma.user.create({
          data: { email, name, supabaseId: authUser.id, passwordHash: null },
        });
      }
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.name;
    req.session.supabaseId = authUser.id;
    req.supabaseIdentity = { id: authUser.id, email, name };
    next();
  } catch (error) {
    next(error);
  }
}
