import { useState } from 'react';

// Maps common tickers or abbreviations to verified ticker symbols
const TICKER_MAP: Record<string, string> = {
  RI: 'RELIANCE.NS',
  RELIANCE: 'RELIANCE.NS',
  SBI: 'SBIN.NS',
  SBIN: 'SBIN.NS',
  ASM: 'DMART.NS',
  DMART: 'DMART.NS',
  PCJ: 'PCJEWELLER.NS',
  PCJEWELLER: 'PCJEWELLER.NS',
  WPO: 'WIPRO.NS',
  WIPRO: 'WIPRO.NS',
  TCS: 'TCS.NS',
  INFY: 'INFY.NS',
  HDFCBANK: 'HDFCBANK.NS',
  ICICIBANK: 'ICICIBANK.NS',
  TITAN: 'TITAN.NS',
  SUNPHARMA: 'SUNPHARMA.NS',
  BHARTIARTL: 'BHARTIARTL.NS',
  HAL: 'HAL.NS',
  BEL: 'BEL.NS',
  LT: 'LT.NS',
  ITC: 'ITC.NS',
  TATAPOWER: 'TATAPOWER.NS',
  TATAMOTORS: 'TATAMOTORS.NS',
  AAPL: 'AAPL',
  MSFT: 'MSFT',
  GOOGL: 'GOOGL',
  AMZN: 'AMZN',
  NVDA: 'NVDA',
};

// Fallback high-contrast background colors for stylish avatars
const BG_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-cyan-600',
];

function getSymbolKey(ticker?: string | null, name?: string | null): string {
  const clean = (ticker || '').trim().toUpperCase();
  if (TICKER_MAP[clean]) return TICKER_MAP[clean];
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) return clean;

  const n = (name || '').toLowerCase();
  if (n.includes('reliance')) return 'RELIANCE.NS';
  if (n.includes('state bank') || n.includes('sbi')) return 'SBIN.NS';
  if (n.includes('avenue supermarts') || n.includes('dmart')) return 'DMART.NS';
  if (n.includes('pc jeweller')) return 'PCJEWELLER.NS';
  if (n.includes('wipro')) return 'WIPRO.NS';
  if (n.includes('infosys')) return 'INFY.NS';
  if (n.includes('tata consultancy') || n.includes('tcs')) return 'TCS.NS';
  if (n.includes('titan')) return 'TITAN.NS';
  if (n.includes('apple')) return 'AAPL';

  return clean ? `${clean}.NS` : 'STOCK';
}

function getInitials(name?: string | null, ticker?: string | null): string {
  if (ticker && ticker.length <= 4) return ticker.toUpperCase();
  if (!name) return '₹';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % BG_COLORS.length;
  return BG_COLORS[idx];
}

interface StockLogoProps {
  ticker?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function StockLogo({ ticker, name, size = 'md', className = '' }: StockLogoProps) {
  const [hasError, setHasError] = useState(false);
  const symbolKey = getSymbolKey(ticker, name);

  const sizeClass = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
  }[size];

  const logoUrl = `https://assets.parqet.com/logos/symbol/${encodeURIComponent(symbolKey)}`;

  if (hasError) {
    const initials = getInitials(name, ticker);
    const bg = getColor(name || ticker || 'A');
    return (
      <div
        className={`${sizeClass} ${bg} text-white font-mono font-bold flex items-center justify-center rounded-sm border-2 border-black shadow-neo-xs shrink-0 select-none ${className}`}
        title={name || ticker || ''}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} bg-white rounded-sm border-2 border-black shadow-neo-xs flex items-center justify-center p-1 shrink-0 overflow-hidden ${className}`}
    >
      <img
        src={logoUrl}
        alt={name || ticker || 'Stock'}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
}
