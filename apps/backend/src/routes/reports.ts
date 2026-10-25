import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { CreateReportSchema } from '@shocklens/shared';
import * as portfolioService from '../services/portfolio.service';
import * as goalService from '../services/goal.service';
import prisma from '../db';

const router = Router();

// POST /api/reports — generate and save a report
router.post('/', requireAuth, validate(CreateReportSchema), async (req, res, next) => {
  try {
    const { portfolioId, goalId, title } = req.body as {
      portfolioId: string;
      goalId?: string;
      title?: string;
    };

    const portfolio = await portfolioService.getPortfolio(portfolioId, req.session.userId!);
    if (!portfolio) { res.status(404).json({ error: 'Portfolio not found' }); return; }

    const goal = goalId ? await goalService.getGoal(goalId, req.session.userId!) : null;

    // Gather latest analysis results for this portfolio
    const latestAnalyses = await prisma.analysisResultModel.findMany({
      where: { portfolioId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const analysisJson = {
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        currency: portfolio.currency,
        holdingCount: portfolio.holdings.length,
        totalValue: portfolio.holdings.reduce((s, h) => s + h.valueInPortfolioCurrency, 0),
      },
      goal: goal ? {
        id: goal.id,
        name: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate,
      } : null,
      analyses: latestAnalyses.map(a => ({
        type: a.type,
        createdAt: a.createdAt,
        result: a.resultJson,
      })),
      generatedAt: new Date().toISOString(),
      disclaimer:
        'This report is based on hypothetical scenarios and user-supplied data. ' +
        'It does not constitute financial advice. All results are illustrative only.',
    };

    const report = await prisma.reportModel.create({
      data: {
        userId: req.session.userId!,
        portfolioId: portfolioId,
        goalId: goalId ?? null,
        title: title ?? `Report — ${portfolio.name} — ${new Date().toLocaleDateString()}`,
        analysisJson,
      },
    });

    res.status(201).json({ report: { id: report.id, title: report.title, generatedAt: report.generatedAt } });
  } catch (err) { next(err); }
});

// GET /api/reports/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const report = await prisma.reportModel.findFirst({
      where: { id: req.params.id, userId: req.session.userId! },
    });
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }
    res.json({ report });
  } catch (err) { next(err); }
});

// GET /api/reports/:id/download — returns JSON for client-side PDF generation
router.get('/:id/download', requireAuth, async (req, res, next) => {
  try {
    const report = await prisma.reportModel.findFirst({
      where: { id: req.params.id, userId: req.session.userId! },
    });
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="shocklens-report-${report.id}.json"`);
    res.json(report.analysisJson);
  } catch (err) { next(err); }
});

// GET /api/reports — list user's reports
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const reports = await prisma.reportModel.findMany({
      where: { userId: req.session.userId! },
      orderBy: { generatedAt: 'desc' },
      select: { id: true, title: true, generatedAt: true, portfolioId: true, goalId: true },
    });
    res.json({ reports });
  } catch (err) { next(err); }
});

export default router;
