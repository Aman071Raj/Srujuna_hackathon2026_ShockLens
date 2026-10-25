import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  ExposureAnalysisRequestSchema,
  ScenarioAnalysisRequestSchema,
  CompareAllocationsRequestSchema,
  SCENARIO_PRESETS,
  calculateScenario,
  calculateExposure,
  compareAllocation,
  scaleScenario,
} from '@shocklens/shared';
import type { ScenarioDefinition } from '@shocklens/shared';
import * as portfolioService from '../services/portfolio.service';
import * as goalService from '../services/goal.service';
import prisma from '../db';

const router = Router();

// POST /api/analysis/exposure
router.post('/exposure', requireAuth, validate(ExposureAnalysisRequestSchema), async (req, res, next) => {
  try {
    const { portfolioId } = req.body as { portfolioId: string };
    const portfolio = await portfolioService.getPortfolio(portfolioId, req.session.userId!);
    if (!portfolio) { res.status(404).json({ error: 'Portfolio not found' }); return; }

    const result = calculateExposure(portfolio.holdings);
    result.portfolioId = portfolioId;

    // Cache result
    await prisma.analysisResultModel.create({
      data: {
        portfolioId,
        type: 'exposure',
        inputJson: { portfolioId },
        resultJson: result as unknown as Record<string, unknown>,
      },
    });

    res.json({ result });
  } catch (err) { next(err); }
});

// POST /api/analysis/scenario
router.post('/scenario', requireAuth, validate(ScenarioAnalysisRequestSchema), async (req, res, next) => {
  try {
    const { portfolioId, goalId, scenario } = req.body as {
      portfolioId: string;
      goalId?: string;
      scenario: ScenarioDefinition;
    };

    const portfolio = await portfolioService.getPortfolio(portfolioId, req.session.userId!);
    if (!portfolio) { res.status(404).json({ error: 'Portfolio not found' }); return; }

    const goal = goalId ? await goalService.getGoal(goalId, req.session.userId!) : null;

    const result = calculateScenario(portfolio.holdings, goal, scenario);

    await prisma.analysisResultModel.create({
      data: {
        portfolioId,
        type: 'scenario',
        inputJson: { portfolioId, goalId, scenario } as Record<string, unknown>,
        resultJson: result as unknown as Record<string, unknown>,
      },
    });

    res.json({ result });
  } catch (err) { next(err); }
});

// POST /api/analysis/compare
router.post('/compare', requireAuth, validate(CompareAllocationsRequestSchema), async (req, res, next) => {
  try {
    const { portfolioId, goalId, scenario, alternatives } = req.body as {
      portfolioId: string;
      goalId?: string;
      scenario: ScenarioDefinition;
      alternatives: Array<{
        id: string;
        name: string;
        description: string;
        weights: Array<{
          label: string;
          assetClass: string;
          sector?: string;
          liquidityPeriod: string;
          weight: number;
        }>;
      }>;
    };

    const portfolio = await portfolioService.getPortfolio(portfolioId, req.session.userId!);
    if (!portfolio) { res.status(404).json({ error: 'Portfolio not found' }); return; }

    const goal = goalId ? await goalService.getGoal(goalId, req.session.userId!) : null;
    const totalValue = portfolio.holdings.reduce((s, h) => s + h.valueInPortfolioCurrency, 0);

    // Current portfolio result
    const currentResult = calculateScenario(portfolio.holdings, goal, scenario);
    const currentExposure = calculateExposure(portfolio.holdings);

    const comparisonResults = [
      {
        allocationId: 'current',
        allocationName: portfolio.name,
        valueAfterShock: currentResult.shockedPortfolioValue,
        goalSurplusOrShortfall: currentResult.goalSurplus,
        accessibleLiquidity: currentResult.accessibleValue,
        largestCluster: currentExposure.largestCluster,
      },
    ];

    for (const alt of alternatives) {
      const altResult = compareAllocation(
        totalValue,
        {
          id: alt.id,
          name: alt.name,
          description: alt.description,
          weights: alt.weights as Array<{
            label: string;
            assetClass: import('@shocklens/shared').AssetClass;
            sector?: string;
            liquidityPeriod: import('@shocklens/shared').LiquidityPeriod;
            weight: number;
          }>,
        },
        goal,
        scenario,
      );

      // Synthetic holdings for breaking point
      const syntheticHoldings = alt.weights.map((w, i) => ({
        id: `syn-${alt.id}-${i}`,
        portfolioId: portfolioId,
        name: w.label,
        assetClass: w.assetClass as import('@shocklens/shared').AssetClass,
        sector: w.sector,
        geography: undefined,
        currency: 'USD',
        currentValue: totalValue * w.weight,
        valueInPortfolioCurrency: totalValue * w.weight,
        exchangeRateUsed: 1,
        liquidityPeriod: w.liquidityPeriod as import('@shocklens/shared').LiquidityPeriod,
        liquidationHaircut: undefined,
        exposureTags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const altExposure = calculateExposure(syntheticHoldings);

      comparisonResults.push({
        allocationId: alt.id,
        allocationName: alt.name,
        valueAfterShock: altResult.shockedPortfolioValue,
        goalSurplusOrShortfall: altResult.goalSurplus,
        accessibleLiquidity: altResult.accessibleValue,
        largestCluster: altExposure.largestCluster,
      });
    }

    const result = {
      scenario,
      results: comparisonResults,
      disclaimer:
        'Alternative allocation comparisons use simplified synthetic holdings derived from weight distributions. ' +
        'Individual security selection and correlation effects are not modeled. ' +
        'HYPOTHETICAL — NOT A PREDICTION OR GUARANTEED OUTCOME.',
    };

    await prisma.analysisResultModel.create({
      data: {
        portfolioId,
        type: 'comparison',
        inputJson: req.body as Record<string, unknown>,
        resultJson: result as unknown as Record<string, unknown>,
      },
    });

    res.json({ result });
  } catch (err) { next(err); }
});

export default router;
