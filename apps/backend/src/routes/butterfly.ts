import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getAllMacroBaselines } from '../services/butterfly/marketData';
import { runButterflyEngine } from '../services/butterfly/engine';
import { runRealtimeButterflyEngine } from '../services/butterfly/realtimeEngine';
import { calculateShockImmunity } from '../services/butterfly/immunityEngine';
import * as portfolioService from '../services/portfolio.service';

const router = Router();

// GET /api/butterfly/baselines
// Returns real-time latest market indicators (Crude, USD/INR, NIFTY 50, 10Y Yield, Gold)
router.get('/baselines', async (req, res, next) => {
  try {
    const baselines = await getAllMacroBaselines();
    res.json({
      timestamp: new Date().toISOString(),
      baselines,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/butterfly/realtime-analysis
// Automatically analyzes current real-time risks based on all geopolitical, energy, currency, and sector information
router.get('/realtime-analysis', async (req, res, next) => {
  try {
    let holdingsToAnalyze: Array<{
      id: string;
      name: string;
      ticker?: string;
      assetClass: string;
      sector?: string;
      valueInPortfolioCurrency: number;
    }> = [];

    if (req.session?.userId) {
      const userPortfolios = await portfolioService.getPortfolios(req.session.userId);
      const requestedPortfolioId = req.query.portfolioId as string | undefined;
      const selected = requestedPortfolioId
        ? userPortfolios.find(p => p.id === requestedPortfolioId) ?? userPortfolios[0]
        : userPortfolios[0];

      if (selected && selected.holdings && selected.holdings.length > 0) {
        holdingsToAnalyze = selected.holdings.map((h) => ({
          id: h.id,
          name: h.name,
          ticker: h.ticker,
          assetClass: h.assetClass,
          sector: h.sector,
          valueInPortfolioCurrency: Number(h.valueInPortfolioCurrency),
        }));
      }
    }

    // Default portfolio if user hasn't added holdings yet
    if (holdingsToAnalyze.length === 0) {
      holdingsToAnalyze = [
        { id: 'h1', name: 'Reliance Industries', ticker: 'RELIANCE.NS', assetClass: 'equity', sector: 'energy', valueInPortfolioCurrency: 350000 },
        { id: 'h2', name: 'Tata Consultancy Services', ticker: 'TCS.NS', assetClass: 'equity', sector: 'it', valueInPortfolioCurrency: 280000 },
        { id: 'h3', name: 'HDFC Bank', ticker: 'HDFCBANK.NS', assetClass: 'equity', sector: 'banking', valueInPortfolioCurrency: 240000 },
        { id: 'h4', name: 'Asian Paints', ticker: 'ASIANPAINT.NS', assetClass: 'equity', sector: 'consumer', valueInPortfolioCurrency: 130000 },
      ];
    }

    const result = await runRealtimeButterflyEngine({
      portfolioHoldings: holdingsToAnalyze,
    });

    res.json({ result });
  } catch (err) {
    next(err);
  }
});

// POST /api/butterfly/simulate
// Runs the quantitative butterfly effect propagation model
router.post('/simulate', async (req, res, next) => {
  try {
    const {
      scenarioType,
      shockMagnitudePct,
      customTriggerName,
      portfolioId,
    } = req.body;

    let holdingsToAnalyze: Array<{
      id: string;
      name: string;
      ticker?: string;
      assetClass: string;
      sector?: string;
      valueInPortfolioCurrency: number;
    }> = [];

    // If user is authenticated and portfolioId specified, load their actual holdings
    if (req.session?.userId) {
      const userPortfolios = await portfolioService.getPortfolios(req.session.userId);
      const selected = portfolioId
        ? userPortfolios.find(p => p.id === portfolioId)
        : userPortfolios[0];

      if (selected && selected.holdings && selected.holdings.length > 0) {
        holdingsToAnalyze = selected.holdings.map(h => ({
          id: h.id,
          name: h.name,
          ticker: h.ticker,
          assetClass: h.assetClass,
          sector: h.sector,
          valueInPortfolioCurrency: Number(h.valueInPortfolioCurrency),
        }));
      }
    }

    // If no portfolio configured yet, use representative Indian demo holdings
    if (holdingsToAnalyze.length === 0) {
      holdingsToAnalyze = [
        { id: 'h1', name: 'Reliance Industries', ticker: 'RELIANCE.NS', assetClass: 'equity', sector: 'energy', valueInPortfolioCurrency: 350000 },
        { id: 'h2', name: 'Tata Consultancy Services', ticker: 'TCS.NS', assetClass: 'equity', sector: 'it', valueInPortfolioCurrency: 280000 },
        { id: 'h3', name: 'HDFC Bank', ticker: 'HDFCBANK.NS', assetClass: 'equity', sector: 'banking', valueInPortfolioCurrency: 240000 },
        { id: 'h4', name: 'Asian Paints', ticker: 'ASIANPAINT.NS', assetClass: 'equity', sector: 'consumer', valueInPortfolioCurrency: 130000 },
      ];
    }

    const result = await runButterflyEngine({
      scenarioType: scenarioType || 'CRUDE_SHOCK',
      shockMagnitudePct: Number(shockMagnitudePct) || 10,
      customTriggerName,
      portfolioHoldings: holdingsToAnalyze,
    });

    res.json({ result });
  } catch (err) {
    next(err);
  }
});

// POST /api/butterfly/shock-immunity
// Computes optimal reverse hedging and protection allocation to neutralize downside risk
router.post('/shock-immunity', async (req, res, next) => {
  try {
    const { portfolioId, budgetAmount } = req.body as {
      portfolioId?: string;
      budgetAmount?: number;
    };

    let holdingsToAnalyze: Array<{
      id: string;
      name: string;
      ticker?: string;
      assetClass: string;
      sector?: string;
      valueInPortfolioCurrency: number;
    }> = [];

    if (req.session?.userId) {
      const userPortfolios = await portfolioService.getPortfolios(req.session.userId);
      const selected = portfolioId
        ? userPortfolios.find(p => p.id === portfolioId) ?? userPortfolios[0]
        : userPortfolios[0];

      if (selected && selected.holdings) {
        holdingsToAnalyze = selected.holdings.map(h => ({
          id: h.id,
          name: h.name,
          ticker: h.ticker,
          assetClass: h.assetClass,
          sector: h.sector,
          valueInPortfolioCurrency: Number(h.valueInPortfolioCurrency),
        }));
      }
    }

    if (holdingsToAnalyze.length === 0) {
      holdingsToAnalyze = [
        { id: 'h1', name: 'Reliance Industries', ticker: 'RELIANCE.NS', assetClass: 'equity', sector: 'energy', valueInPortfolioCurrency: 350000 },
        { id: 'h2', name: 'Tata Consultancy Services', ticker: 'TCS.NS', assetClass: 'equity', sector: 'it', valueInPortfolioCurrency: 280000 },
      ];
    }

    const result = await calculateShockImmunity(holdingsToAnalyze, Number(budgetAmount) || 10000);
    res.json({ result });
  } catch (err) {
    next(err);
  }
});

export default router;
