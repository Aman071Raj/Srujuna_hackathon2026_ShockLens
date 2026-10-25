import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { UpdateHoldingSchema } from '@shocklens/shared';
import * as portfolioService from '../services/portfolio.service';

const router = Router();

// PATCH /api/holdings/:id
router.patch('/:id', requireAuth, validate(UpdateHoldingSchema), async (req, res, next) => {
  try {
    const body = req.body;
    const updateData: Record<string, unknown> = { ...body };

    // Recompute valueInPortfolioCurrency if currentValue or exchangeRateUsed changed
    if (body.currentValue !== undefined || body.exchangeRateUsed !== undefined) {
      // We need the current holding to get existing values
      // For simplicity, pass through — service will handle merging
    }

    const holding = await portfolioService.updateHolding(req.params.id, req.session.userId!, updateData);
    if (!holding) { res.status(404).json({ error: 'Holding not found' }); return; }
    res.json({ holding });
  } catch (err) { next(err); }
});

// DELETE /api/holdings/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await portfolioService.deleteHolding(req.params.id, req.session.userId!);
    if (!deleted) { res.status(404).json({ error: 'Holding not found' }); return; }
    res.json({ message: 'Holding deleted' });
  } catch (err) { next(err); }
});

export default router;
