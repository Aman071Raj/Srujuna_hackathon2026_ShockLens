/**
 * Portfolio service — maps between Prisma models and domain types.
 * Financial values stored as Prisma Decimal are converted to JS numbers
 * for calculation purposes only; persistence always uses Decimal.
 */
import prisma from '../db';
import type { Holding, Portfolio } from '@shocklens/shared';
import type { HoldingModel, PortfolioModel, Prisma } from '@prisma/client';

// ---- Mappers ----

export function mapHolding(h: HoldingModel): Holding {
  return {
    id: h.id,
    portfolioId: h.portfolioId,
    name: h.name,
    ticker: h.ticker ?? undefined,
    assetClass: h.assetClass as Holding['assetClass'],
    sector: h.sector ?? undefined,
    geography: h.geography ?? undefined,
    currency: h.currency,
    currentValue: Number(h.currentValue),
    valueInPortfolioCurrency: Number(h.valueInPortfolioCurrency),
    exchangeRateUsed: h.exchangeRateUsed ? Number(h.exchangeRateUsed) : undefined,
    liquidityPeriod: h.liquidityPeriod as Holding['liquidityPeriod'],
    liquidationHaircut: h.liquidationHaircut ? Number(h.liquidationHaircut) : undefined,
    durationYears: h.durationYears ? Number(h.durationYears) : undefined,
    rateShockSensitivity: h.rateShockSensitivity ? Number(h.rateShockSensitivity) : undefined,
    exposureTags: h.exposureTags,
    historicalValues: (h.historicalValues as { date: string; value: number }[] | null) ?? undefined,
    notes: h.notes ?? undefined,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}

export function mapPortfolio(p: PortfolioModel & { holdings: HoldingModel[] }): Portfolio {
  return {
    id: p.id,
    userId: p.userId,
    name: p.name,
    description: p.description ?? undefined,
    currency: p.currency,
    holdings: p.holdings.map(mapHolding),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ---- CRUD ----

export async function getPortfolios(userId: string): Promise<Portfolio[]> {
  const portfolios = await prisma.portfolioModel.findMany({
    where: { userId },
    include: { holdings: true },
    orderBy: { createdAt: 'desc' },
  });
  return portfolios.map(mapPortfolio);
}

export async function getPortfolio(id: string, userId: string): Promise<Portfolio | null> {
  const portfolio = await prisma.portfolioModel.findFirst({
    where: { id, userId },
    include: { holdings: true },
  });
  return portfolio ? mapPortfolio(portfolio) : null;
}

export async function createPortfolio(
  userId: string,
  data: { name: string; description?: string; currency: string },
): Promise<Portfolio> {
  const portfolio = await prisma.portfolioModel.create({
    data: { userId, ...data },
    include: { holdings: true },
  });
  return mapPortfolio(portfolio);
}

export async function updatePortfolio(
  id: string,
  userId: string,
  data: Partial<{ name: string; description: string; currency: string }>,
): Promise<Portfolio | null> {
  const existing = await prisma.portfolioModel.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const updated = await prisma.portfolioModel.update({
    where: { id },
    data,
    include: { holdings: true },
  });
  return mapPortfolio(updated);
}

export async function deletePortfolio(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.portfolioModel.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.portfolioModel.delete({ where: { id } });
  return true;
}

// ---- Holdings ----

type HoldingCreateData = Omit<Prisma.HoldingModelCreateInput, 'portfolio'>;

export async function addHolding(
  portfolioId: string,
  userId: string,
  data: Omit<HoldingCreateData, 'portfolioId'>,
): Promise<Holding | null> {
  const portfolio = await prisma.portfolioModel.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) return null;

  const holding = await prisma.holdingModel.create({
    data: {
      ...data,
      portfolio: { connect: { id: portfolioId } },
    },
  });
  return mapHolding(holding);
}

export async function updateHolding(
  holdingId: string,
  userId: string,
  data: Partial<HoldingCreateData>,
): Promise<Holding | null> {
  // Verify ownership through portfolio
  const holding = await prisma.holdingModel.findFirst({
    where: { id: holdingId },
    include: { portfolio: { select: { userId: true } } },
  });
  if (!holding || holding.portfolio.userId !== userId) return null;

  const updated = await prisma.holdingModel.update({
    where: { id: holdingId },
    data,
  });
  return mapHolding(updated);
}

export async function deleteHolding(holdingId: string, userId: string): Promise<boolean> {
  const holding = await prisma.holdingModel.findFirst({
    where: { id: holdingId },
    include: { portfolio: { select: { userId: true } } },
  });
  if (!holding || holding.portfolio.userId !== userId) return false;
  await prisma.holdingModel.delete({ where: { id: holdingId } });
  return true;
}
