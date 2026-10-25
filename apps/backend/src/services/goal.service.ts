import prisma from '../db';
import type { FinancialGoal } from '@shocklens/shared';
import type { GoalModel } from '@prisma/client';

export function mapGoal(g: GoalModel): FinancialGoal {
  return {
    id: g.id,
    userId: g.userId,
    portfolioId: g.portfolioId ?? undefined,
    name: g.name,
    goalType: g.goalType as FinancialGoal['goalType'],
    targetAmount: Number(g.targetAmount),
    targetDate: g.targetDate.toISOString().slice(0, 10),
    reservedCash: Number(g.reservedCash),
    requiredLiquidAmount: Number(g.requiredLiquidAmount),
    acceptableShortfall: Number(g.acceptableShortfall),
    monthlyContribution: g.monthlyContribution ? Number(g.monthlyContribution) : undefined,
    flexibleDate: g.flexibleDate,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export async function getGoals(userId: string): Promise<FinancialGoal[]> {
  const goals = await prisma.goalModel.findMany({
    where: { userId },
    orderBy: { targetDate: 'asc' },
  });
  return goals.map(mapGoal);
}

export async function getGoal(id: string, userId: string): Promise<FinancialGoal | null> {
  const goal = await prisma.goalModel.findFirst({ where: { id, userId } });
  return goal ? mapGoal(goal) : null;
}

export async function createGoal(
  userId: string,
  data: {
    portfolioId?: string;
    name: string;
    goalType: FinancialGoal['goalType'];
    targetAmount: number;
    targetDate: string;
    reservedCash: number;
    requiredLiquidAmount: number;
    acceptableShortfall: number;
    monthlyContribution?: number;
    flexibleDate: boolean;
  },
): Promise<FinancialGoal> {
  const goal = await prisma.goalModel.create({
    data: {
      userId,
      portfolioId: data.portfolioId ?? null,
      name: data.name,
      goalType: data.goalType,
      targetAmount: data.targetAmount,
      targetDate: new Date(data.targetDate),
      reservedCash: data.reservedCash,
      requiredLiquidAmount: data.requiredLiquidAmount,
      acceptableShortfall: data.acceptableShortfall,
      monthlyContribution: data.monthlyContribution ?? null,
      flexibleDate: data.flexibleDate,
    },
  });
  return mapGoal(goal);
}

export async function updateGoal(
  id: string,
  userId: string,
  data: Partial<{
    portfolioId?: string;
    name: string;
    goalType: FinancialGoal['goalType'];
    targetAmount: number;
    targetDate: string;
    reservedCash: number;
    requiredLiquidAmount: number;
    acceptableShortfall: number;
    monthlyContribution: number;
    flexibleDate: boolean;
  }>,
): Promise<FinancialGoal | null> {
  const existing = await prisma.goalModel.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const updateData: Record<string, unknown> = { ...data };
  if (data.targetDate) {
    updateData.targetDate = new Date(data.targetDate);
    delete updateData.targetDate;
    updateData.targetDate = new Date(data.targetDate);
  }

  const updated = await prisma.goalModel.update({ where: { id }, data: updateData });
  return mapGoal(updated);
}

export async function deleteGoal(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.goalModel.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.goalModel.delete({ where: { id } });
  return true;
}
