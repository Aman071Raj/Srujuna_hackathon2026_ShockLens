/**
 * Shared hook for the "active portfolio" selection.
 * Persists the selected portfolio ID in localStorage so that switching
 * portfolios in one page is reflected everywhere else.
 */

const STORAGE_KEY = 'shocklens_active_portfolio_id';

export function getStoredPortfolioId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredPortfolioId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Given a list of portfolios, resolve which one should be "active".
 * Priority: localStorage value → first in list.
 */
export function resolveActivePortfolio<T extends { id: string }>(
  list: T[],
): T | undefined {
  if (list.length === 0) return undefined;
  const stored = getStoredPortfolioId();
  if (stored) {
    const found = list.find((p) => p.id === stored);
    if (found) return found;
  }
  // Fallback: first portfolio; also persist it so future loads are consistent
  setStoredPortfolioId(list[0].id);
  return list[0];
}
