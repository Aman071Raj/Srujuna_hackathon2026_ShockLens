/**
 * Express router for PortfolioIQ Copilot API
 * POST /api/copilot/chat
 */
import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { portfolioIQCopilotService } from '../services/portfolioIQCopilotService';
import * as portfolioService from '../services/portfolio.service';
import { logger } from '../logger';

const router = Router();

router.post('/chat', optionalAuth, async (req, res, next) => {
  try {
    const { message, portfolioId } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const userId = req.session?.userId;
    let portfolioContext: any = undefined;

    // Secure ownership: If user is authenticated and portfolioId is passed or available, fetch holdings
    if (userId) {
      if (portfolioId) {
        const port = await portfolioService.getPortfolio(portfolioId, userId);
        if (port) {
          const totalVal = port.holdings.reduce((s, h) => s + (h.valueInPortfolioCurrency || 0), 0);
          portfolioContext = {
            name: port.name,
            totalValue: totalVal,
            currency: port.currency,
            holdings: port.holdings,
          };
        }
      } else {
        const ports = await portfolioService.getPortfolios(userId);
        if (ports.length > 0) {
          const defaultPort = ports[0];
          const totalVal = defaultPort.holdings.reduce((s, h) => s + (h.valueInPortfolioCurrency || 0), 0);
          portfolioContext = {
            name: defaultPort.name,
            totalValue: totalVal,
            currency: defaultPort.currency,
            holdings: defaultPort.holdings,
          };
        }
      }
    }

    const response = await portfolioIQCopilotService.handleUserQuery({
      message,
      portfolioId,
      userId,
      portfolioContext,
    });

    res.json(response);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Copilot chat execution error');
    next(err);
  }
});

export default router;
