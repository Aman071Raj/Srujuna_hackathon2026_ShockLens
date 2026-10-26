/**
 * ShockLens Database Seed
 * Creates a demo user with the fictional portfolio used in the hackathon demo story.
 */
import prisma from './db';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { DEMO_HOLDINGS, DEMO_GOAL } from '@shocklens/shared';

async function seed() {
  console.log('🌱 Seeding ShockLens demo data...');

  // Clean up existing demo data
  await prisma.reportModel.deleteMany({ where: { user: { email: 'demo@shocklens.example' } } });
  await prisma.analysisResultModel.deleteMany({});
  await prisma.goalModel.deleteMany({ where: { user: { email: 'demo@shocklens.example' } } });
  await prisma.portfolioModel.deleteMany({ where: { user: { email: 'demo@shocklens.example' } } });
  await prisma.user.deleteMany({ where: { email: 'demo@shocklens.example' } });

  // Create demo user
  const passwordHash = await bcrypt.hash('ShockLensDemo2026!', 12);
  const user = await prisma.user.create({
    data: {
      email: 'demo@shocklens.example',
      name: 'Priya (Demo)',
      passwordHash,
    },
  });
  console.log(`  ✓ Created demo user: ${user.email}`);

  // Create demo portfolio
  const portfolio = await prisma.portfolioModel.create({
    data: {
      userId: user.id,
      name: "Priya's Growth Portfolio",
      description: 'Demo portfolio — all data is fictional and for illustration only.',
      currency: 'USD',
    },
  });
  console.log(`  ✓ Created demo portfolio: ${portfolio.name}`);

  // Create demo holdings
  for (const h of DEMO_HOLDINGS) {
    await prisma.holdingModel.create({
      data: {
        portfolioId: portfolio.id,
        name: h.name,
        ticker: h.ticker ?? null,
        assetClass: h.assetClass,
        sector: h.sector ?? null,
        geography: h.geography ?? null,
        currency: h.currency,
        currentValue: h.currentValue,
        valueInPortfolioCurrency: h.valueInPortfolioCurrency,
        exchangeRateUsed: h.exchangeRateUsed ?? null,
        liquidityPeriod: h.liquidityPeriod,
        liquidationHaircut: h.liquidationHaircut ?? null,
        durationYears: h.durationYears ?? null,
        rateShockSensitivity: h.rateShockSensitivity ?? null,
        exposureTags: h.exposureTags ?? [],
        historicalValues: Prisma.DbNull,
        notes: h.notes ?? null,
      },
    });
  }
  console.log(`  ✓ Created ${DEMO_HOLDINGS.length} demo holdings`);

  // Create demo goal
  await prisma.goalModel.create({
    data: {
      userId: user.id,
      portfolioId: portfolio.id,
      name: DEMO_GOAL.name,
      goalType: DEMO_GOAL.goalType,
      targetAmount: DEMO_GOAL.targetAmount,
      targetDate: new Date(DEMO_GOAL.targetDate),
      reservedCash: DEMO_GOAL.reservedCash,
      requiredLiquidAmount: DEMO_GOAL.requiredLiquidAmount,
      acceptableShortfall: DEMO_GOAL.acceptableShortfall,
      monthlyContribution: DEMO_GOAL.monthlyContribution ?? null,
      flexibleDate: DEMO_GOAL.flexibleDate,
    },
  });
  console.log(`  ✓ Created demo goal: ${DEMO_GOAL.name}`);

  console.log('\n✅ Seed complete!');
  console.log('   Demo login: demo@shocklens.example / ShockLensDemo2026!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
