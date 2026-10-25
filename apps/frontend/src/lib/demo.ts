/**
 * Demo mode data layer.
 * When no backend is available or user selects "Explore Demo",
 * all calculations run client-side using the shared calculation engine.
 */
import {
  DEMO_HOLDINGS,
  DEMO_GOAL,
  DEMO_PORTFOLIO,
  DEMO_USER,
  SCENARIO_PRESETS,
  calculateScenario,
  calculateExposure,
  findBreakingPoint,
  calculateLiquidityProfile,
} from '@shocklens/shared';
import type { ScenarioDefinition } from '@shocklens/shared';

export const isDemoMode = () =>
  window.location.search.includes('demo=true') ||
  sessionStorage.getItem('shocklens-demo') === 'true';

export function enableDemo() {
  sessionStorage.setItem('shocklens-demo', 'true');
}

export function disableDemo() {
  sessionStorage.removeItem('shocklens-demo');
}

export const demoPortfolio = {
  ...DEMO_PORTFOLIO,
  holdings: DEMO_HOLDINGS,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-10-24'),
};

export const demoGoal = DEMO_GOAL;
export const demoUser = DEMO_USER;

export function runDemoScenario(scenario: ScenarioDefinition) {
  return calculateScenario(DEMO_HOLDINGS, DEMO_GOAL, scenario);
}

export function runDemoExposure() {
  return calculateExposure(DEMO_HOLDINGS);
}

export function runDemoBreakingPoint() {
  return findBreakingPoint({
    holdings: DEMO_HOLDINGS,
    goal: DEMO_GOAL,
    baseScenario: { ...SCENARIO_PRESETS.tech_disruption, sectorShocks: { technology: -1.0 } },
    failureConditions: ['GOAL_SHORTFALL'],
    minShockMultiplier: 0,
    maxShockMultiplier: 1,
  });
}

export function runDemoLiquidity() {
  return calculateLiquidityProfile(DEMO_HOLDINGS, DEMO_GOAL);
}

export const DEMO_SCENARIOS = SCENARIO_PRESETS;
