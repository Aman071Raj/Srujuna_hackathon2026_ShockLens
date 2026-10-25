import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { RegisterSchema, LoginSchema, UpdateProfileSchema } from '@shocklens/shared';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(RegisterSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body as { email: string; password: string; name: string };

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), name, passwordHash },
    });

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.name;

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.name;

    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('shocklens.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: 'Session invalid' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, validate(UpdateProfileSchema), async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const { name, email, currentPassword, newPassword } = req.body as {
      name?: string; email?: string; currentPassword?: string; newPassword?: string;
    };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const updateData: { name?: string; email?: string; passwordHash?: string } = {};

    if (name) updateData.name = name;
    if (email && email !== user.email) {
      const conflict = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (conflict) { res.status(409).json({ error: 'Email already in use' }); return; }
      updateData.email = email.toLowerCase();
    }
    if (newPassword && currentPassword) {
      if (!user.passwordHash) {
        res.status(400).json({ error: 'This account password is managed by Supabase Auth.' });
        return;
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData });
    req.session.userName = updated.name;
    req.session.userEmail = updated.email;

    res.json({ user: { id: updated.id, email: updated.email, name: updated.name } });
  } catch (err) {
    next(err);
  }
});

export default router;
