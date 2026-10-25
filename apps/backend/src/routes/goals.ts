import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { CreateGoalSchema, UpdateGoalSchema } from '@shocklens/shared';
import * as goalService from '../services/goal.service';

const router = Router();

// GET /api/goals
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const goals = await goalService.getGoals(req.session.userId!);
    res.json({ goals });
  } catch (err) { next(err); }
});

// POST /api/goals
router.post('/', requireAuth, validate(CreateGoalSchema), async (req, res, next) => {
  try {
    const goal = await goalService.createGoal(req.session.userId!, req.body);
    res.status(201).json({ goal });
  } catch (err) { next(err); }
});

// PATCH /api/goals/:id
router.patch('/:id', requireAuth, validate(UpdateGoalSchema), async (req, res, next) => {
  try {
    const goal = await goalService.updateGoal(req.params.id, req.session.userId!, req.body);
    if (!goal) { res.status(404).json({ error: 'Goal not found' }); return; }
    res.json({ goal });
  } catch (err) { next(err); }
});

// DELETE /api/goals/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await goalService.deleteGoal(req.params.id, req.session.userId!);
    if (!deleted) { res.status(404).json({ error: 'Goal not found' }); return; }
    res.json({ message: 'Goal deleted' });
  } catch (err) { next(err); }
});

export default router;
