import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  CreatePortfolioSchema,
  UpdatePortfolioSchema,
  CreateHoldingSchema,
  CsvHoldingRowSchema,
} from '@shocklens/shared';
import * as portfolioService from '../services/portfolio.service';
import Papa from 'papaparse';
import multer from 'multer';
import { z } from 'zod';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/portfolios
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const portfolios = await portfolioService.getPortfolios(req.session.userId!);
    res.json({ portfolios });
  } catch (err) { next(err); }
});

// POST /api/portfolios
router.post('/', requireAuth, validate(CreatePortfolioSchema), async (req, res, next) => {
  try {
    const portfolio = await portfolioService.createPortfolio(req.session.userId!, req.body);
    res.status(201).json({ portfolio });
  } catch (err) { next(err); }
});

// GET /api/portfolios/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const portfolio = await portfolioService.getPortfolio(req.params.id, req.session.userId!);
    if (!portfolio) { res.status(404).json({ error: 'Portfolio not found' }); return; }
    res.json({ portfolio });
  } catch (err) { next(err); }
});

// PATCH /api/portfolios/:id
router.patch('/:id', requireAuth, validate(UpdatePortfolioSchema), async (req, res, next) => {
  try {
    const portfolio = await portfolioService.updatePortfolio(req.params.id, req.session.userId!, req.body);
    if (!portfolio) { res.status(404).json({ error: 'Portfolio not found' }); return; }
    res.json({ portfolio });
  } catch (err) { next(err); }
});

// DELETE /api/portfolios/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await portfolioService.deletePortfolio(req.params.id, req.session.userId!);
    if (!deleted) { res.status(404).json({ error: 'Portfolio not found' }); return; }
    res.json({ message: 'Portfolio deleted' });
  } catch (err) { next(err); }
});

// POST /api/portfolios/:id/holdings
router.post('/:id/holdings', requireAuth, validate(CreateHoldingSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof CreateHoldingSchema>;
    const holding = await portfolioService.addHolding(req.params.id, req.session.userId!, {
      name: body.name,
      ticker: body.ticker ?? null,
      assetClass: body.assetClass,
      sector: body.sector ?? null,
      geography: body.geography ?? null,
      currency: body.currency,
      currentValue: body.currentValue,
      valueInPortfolioCurrency: body.currentValue * (body.exchangeRateUsed ?? 1),
      exchangeRateUsed: body.exchangeRateUsed ?? null,
      liquidityPeriod: body.liquidityPeriod,
      liquidationHaircut: body.liquidationHaircut ?? null,
      durationYears: body.durationYears ?? null,
      rateShockSensitivity: body.rateShockSensitivity ?? null,
      exposureTags: body.exposureTags ?? [],
      historicalValues: body.historicalValues ?? null,
      notes: body.notes ?? null,
    });
    if (!holding) { res.status(404).json({ error: 'Portfolio not found' }); return; }
    res.status(201).json({ holding });
  } catch (err) { next(err); }
});

// POST /api/portfolios/:id/import — CSV import
router.post('/:id/import', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const csvText = req.file.buffer.toString('utf-8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      res.status(400).json({
        error: 'CSV parse errors',
        details: parsed.errors.map(e => `Row ${e.row}: ${e.message}`),
      });
      return;
    }

    const rows = parsed.data as Record<string, unknown>[];
    const results: { row: number; success: boolean; holding?: unknown; error?: string }[] = [];
    const created = [];

    for (let i = 0; i < rows.length; i++) {
      const parseResult = CsvHoldingRowSchema.safeParse(rows[i]);
      if (!parseResult.success) {
        results.push({
          row: i + 2,
          success: false,
          error: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
        });
        continue;
      }

      const data = parseResult.data;
      const holding = await portfolioService.addHolding(req.params.id, req.session.userId!, {
        name: data.name,
        ticker: data.ticker ?? null,
        assetClass: data.assetClass,
        sector: data.sector ?? null,
        geography: null,
        currency: data.currency,
        currentValue: data.currentValue,
        valueInPortfolioCurrency: data.currentValue * (1), // user can provide rate via exchangeRateUsed
        exchangeRateUsed: null,
        liquidityPeriod: data.liquidityPeriod,
        liquidationHaircut: data.liquidationHaircut ?? null,
        durationYears: null,
        rateShockSensitivity: null,
        exposureTags: data.exposureTags ?? [],
        historicalValues: null,
        notes: data.notes ?? null,
      });

      if (holding) {
        created.push(holding);
        results.push({ row: i + 2, success: true, holding });
      } else {
        results.push({ row: i + 2, success: false, error: 'Portfolio not found or unauthorized' });
      }
    }

    res.json({
      imported: created.length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (err) { next(err); }
});

// GET /api/portfolios/csv-template — download template
router.get('/csv-template/download', requireAuth, (_req, res) => {
  const headers = 'name,ticker,assetClass,sector,geography,currency,currentValue,liquidityPeriod,liquidationHaircut,exposureTags,notes';
  const example = 'Apple Inc.,AAPL,equity,technology,US,USD,10000,short,,tech|AI,Optional notes';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="shocklens-holdings-template.csv"');
  res.send(`${headers}\n${example}\n`);
});

export default router;
