import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  calculateScenario,
  SCENARIO_PRESETS,
  DEMO_HOLDINGS,
  DEMO_GOAL,
} from '@shocklens/shared';
import { formatCurrency, formatPercent } from '../lib/utils';

const FADE_UP = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.32, ease: 'easeOut' },
  }),
};

function LandingHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="brand-lockup" aria-label="ShockLens home">
        <span className="brand-mark" aria-hidden="true">SL</span>
        <span>SHOCKLENS</span>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#how-it-works">HOW IT WORKS</a>
        <a href="#features">FEATURES</a>
        <a href="#faq">FAQ</a>
      </nav>
      <div className="site-actions">
        <Link to="/login" className="site-signin">SIGN IN</Link>
        <Link to="/register" className="btn-yellow px-3 py-2 text-[10px]">GET STARTED →</Link>
      </div>
    </header>
  );
}

function HeroSection({ onStart }: { onStart: () => void }) {
  const [shock, setShock] = useState(-0.30);
  const result = calculateScenario(DEMO_HOLDINGS, DEMO_GOAL, {
    ...SCENARIO_PRESETS.equity_decline,
    equityShock: shock,
  });

  return (
    <section className="min-h-[85vh] bg-cream flex flex-col items-start justify-center px-6 py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl w-full mx-auto text-left">
        <motion.div
          initial="hidden" animate="visible"
          variants={FADE_UP} custom={0}
          className="inline-flex items-center gap-3 border border-black bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest mb-8"
        >
          <span className="inline-block w-2 h-2 bg-yellow border border-black" aria-hidden="true" />
          PORTFOLIO RESILIENCE / REAL-WORLD SCENARIOS
        </motion.div>

        <motion.h1
          initial="hidden" animate="visible"
          variants={FADE_UP} custom={1}
          className="font-heading font-extrabold text-5xl md:text-7xl lg:text-8xl text-black leading-none tracking-tighter mb-8 text-left"
        >
          YOUR PORTFOLIO<br />
          <span className="hero-accent">HAS A</span><br />
          BREAKING POINT.
        </motion.h1>

        <motion.p
          initial="hidden" animate="visible"
          variants={FADE_UP} custom={2}
          className="font-body text-lg md:text-xl text-black/70 max-w-2xl mb-10 leading-relaxed"
        >
          Find it before the market does. ShockLens shows how market shocks 
          threaten your financial goals — and exactly how much you can absorb.
        </motion.p>

        <motion.div
          initial="hidden" animate="visible"
          variants={FADE_UP} custom={3}
          className="flex flex-col sm:flex-row gap-3 justify-start mb-14"
        >
          <button onClick={onStart} className="btn-yellow text-lg px-8 py-4">
            STRESS TEST MY PORTFOLIO →
          </button>
        </motion.div>

        {/* Live demo widget */}
        <motion.div
          initial="hidden" animate="visible"
          variants={FADE_UP} custom={4}
          className="neo-card p-5 md:p-7 max-w-4xl mx-0 text-left"
        >
          <p className="font-heading text-xs font-bold text-black/50 uppercase tracking-wider mb-4">
            LIVE PREVIEW — Priya's Demo Portfolio ($208,000)
          </p>
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="font-heading font-bold text-sm">
                Equity Shock: <span className="text-coral">{formatPercent(shock * 100, 0)}</span>
              </label>
              <span className="font-heading font-bold text-sm">
                Portfolio after shock: <span className="text-black">{formatCurrency(result.shockedPortfolioValue)}</span>
              </span>
            </div>
            <input
              type="range"
              min={-80} max={0} step={1}
              value={shock * 100}
              onChange={e => setShock(Number(e.target.value) / 100)}
              className="w-full h-3 bg-muted border border-black rounded-sm cursor-pointer accent-yellow"
              aria-label="Equity shock percentage"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-yellow/30 border border-black rounded-sm p-3 text-center">
              <p className="font-body text-xs text-black/60 mb-1">Portfolio Value</p>
              <p className="font-heading font-bold text-lg">{formatCurrency(result.shockedPortfolioValue)}</p>
            </div>
            <div className={`border border-black rounded-sm p-3 text-center ${result.goalFundingStatus === 'SHORTFALL' ? 'bg-coral/20' : 'bg-mint/30'}`}>
              <p className="font-body text-xs text-black/60 mb-1">Goal Status</p>
              <p className="font-heading font-bold text-lg">
                {result.goalFundingStatus === 'SHORTFALL'
                  ? `−${formatCurrency(Math.abs(result.goalSurplus))}`
                  : `+${formatCurrency(result.goalSurplus)}`}
              </p>
            </div>
            <div className="bg-blue/20 border border-black rounded-sm p-3 text-center">
              <p className="font-body text-xs text-black/60 mb-1">Accessible</p>
              <p className="font-heading font-bold text-lg">{formatCurrency(result.accessibleValue)}</p>
            </div>
          </div>
          
          {result.goalFundingStatus === 'SHORTFALL' && (
            <p className="mt-4 text-sm font-body text-coral font-semibold">
              ⚠ At {formatPercent(shock * 100, 0)} shock, Priya's home down payment is at risk.
            </p>
          )}
          
          <p className="mt-3 text-xs text-black/40 font-body">
            Hypothetical demo — fictional data — not a prediction or financial advice.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function ConcentrationSection() {
  const exposure = calculateScenario(DEMO_HOLDINGS, null, {
    ...SCENARIO_PRESETS.tech_disruption,
    equityShock: -0.10,
    sectorShocks: { technology: -0.45 },
  });
  
  const techHoldings = DEMO_HOLDINGS.filter(h => h.sector === 'technology');
  const techValue = techHoldings.reduce((s, h) => s + h.valueInPortfolioCurrency, 0);
  const techPct = (techValue / 208000 * 100).toFixed(1);

  return (
    <section className="py-24 px-6 bg-black text-yellow">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <h2 className="section-title text-yellow mb-4">
            YOUR PORTFOLIO LOOKS DIVERSIFIED.<br />
            <span className="text-coral">DOES IT FEEL THAT WAY?</span>
          </h2>
          <p className="section-subtitle text-yellow/70 max-w-2xl mb-12">
            Investors often hold funds across multiple categories while sharing the same underlying risk. 
            ShockLens's Portfolio X-Ray maps these hidden overlaps.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="border-2 border-yellow/30 rounded-lg p-6">
              <h3 className="font-heading font-bold text-xl text-yellow mb-4">
                Priya's "Diversified" Portfolio
              </h3>
              <div className="space-y-3">
                {DEMO_HOLDINGS.map(h => (
                  <div key={h.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${h.sector === 'technology' ? 'bg-coral' : 'bg-yellow/50'}`} />
                      <span className="font-body text-sm text-yellow/80">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {h.sector === 'technology' && (
                        <span className="text-xs bg-coral/20 text-coral border border-coral/30 rounded-sm px-2 py-0.5">
                          TECH
                        </span>
                      )}
                      <span className="font-heading font-semibold text-sm">
                        {formatCurrency(h.valueInPortfolioCurrency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-2 border-coral rounded-lg p-6 shadow-neo-coral">
              <h3 className="font-heading font-bold text-xl text-coral mb-4">
                X-Ray Reveals: {techPct}% TECH
              </h3>
              <div className="bg-coral/10 rounded-sm p-4 mb-4">
                <div className="h-6 bg-yellow/20 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-coral rounded-sm transition-all"
                    style={{ width: `${techPct}%` }}
                  />
                </div>
                <p className="mt-2 font-heading font-bold text-coral">
                  {formatCurrency(techValue)} of $208,000 is in tech-exposed holdings
                </p>
              </div>
              <p className="font-body text-sm text-yellow/70">
                3 funds labeled "growth", "tech", and "cloud" share technology, AI, 
                and semiconductor exposure. A single tech disruption affects them all.
              </p>
              <div className="mt-4 p-3 bg-coral/20 rounded-sm border border-coral">
                <p className="font-heading font-bold text-coral text-sm">
                  ⚠ After a technology disruption scenario:
                </p>
                <p className="font-heading font-bold text-2xl text-coral mt-1">
                  {formatCurrency(exposure.shockedPortfolioValue)}
                </p>
                <p className="font-body text-xs text-yellow/60 mt-1">
                  Goal shortfall: {formatCurrency(Math.abs(exposure.goalSurplus))} — 
                  {exposure.goalFundingStatus === 'SHORTFALL' ? ' DOWN PAYMENT AT RISK' : ' FUNDED'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'UPLOAD YOUR PORTFOLIO', desc: 'Enter holdings manually or import via CSV. Define your financial goal and timeline.', color: 'bg-yellow' },
    { num: '02', title: 'X-RAY YOUR EXPOSURE', desc: 'Discover hidden concentrations by sector, geography, currency, and shared tags.', color: 'bg-lavender' },
    { num: '03', title: 'SIMULATE SHOCKS', desc: 'Apply preset or custom market shocks. See real-time impact on portfolio value, liquidity, and goal funding.', color: 'bg-mint' },
    { num: '04', title: 'FIND YOUR BREAKING POINT', desc: 'Reverse stress testing reveals the exact shock level where your goal fails.', color: 'bg-coral' },
    { num: '05', title: 'COMPARE ALTERNATIVES', desc: 'Model more liquid or less concentrated allocations and compare outcomes side by side.', color: 'bg-blue' },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 bg-cream">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
        >
          <h2 className="section-title mb-4">HOW SHOCKLENS WORKS</h2>
          <p className="section-subtitle mb-16">Five steps from hidden risk to clarity.</p>
          <div className="grid md:grid-cols-5 gap-6">
            {steps.map((s) => (
              <div key={s.num} className="neo-card p-5">
                <div className={`${s.color} w-10 h-10 rounded-sm border-2 border-black flex items-center justify-center font-heading font-extrabold text-sm mb-4 shadow-neo-sm`}>
                  {s.num}
                </div>
                <h3 className="font-heading font-bold text-sm leading-tight mb-2">{s.title}</h3>
                <p className="font-body text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BreakingPointSection() {
  const [multiplier, setMultiplier] = useState(0.4);
  
  const shockValues = Array.from({ length: 21 }, (_, i) => i * 0.05);
  const chartData = shockValues.map(m => {
    const r = calculateScenario(DEMO_HOLDINGS, DEMO_GOAL, {
      ...SCENARIO_PRESETS.tech_disruption,
      equityShock: -0.10 * m,
      sectorShocks: { technology: -1.0 * m },
    });
    return {
      shock: -(m * 100).toFixed(0),
      value: Math.round(r.shockedPortfolioValue),
      surplus: Math.round(r.goalSurplus),
    };
  });

  const currentPoint = calculateScenario(DEMO_HOLDINGS, DEMO_GOAL, {
    ...SCENARIO_PRESETS.tech_disruption,
    equityShock: -0.10 * multiplier,
    sectorShocks: { technology: -1.0 * multiplier },
  });

  return (
    <section className="py-24 px-6 bg-lavender/10">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
        >
          <h2 className="section-title mb-4">PORTFOLIO BREAKING POINT</h2>
          <p className="section-subtitle mb-8 max-w-2xl">
            The most powerful feature: reverse stress testing that finds the exact shock level 
            where your financial goal fails.
          </p>

          <div className="neo-card p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <p className="font-heading text-xs font-bold text-black/50 uppercase tracking-wider mb-4">
                  TECH DISRUPTION SCENARIO — Drag to explore
                </p>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={multiplier * 100}
                  onChange={e => setMultiplier(Number(e.target.value) / 100)}
                  className="w-full h-3 bg-muted border border-black rounded-sm cursor-pointer accent-yellow mb-6"
                  aria-label="Shock severity"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-yellow/30 border border-black rounded-sm p-4">
                    <p className="font-body text-xs text-black/60">Shock Severity</p>
                    <p className="font-heading font-extrabold text-2xl">{(multiplier * 100).toFixed(0)}%</p>
                  </div>
                  <div className={`border border-black rounded-sm p-4 ${currentPoint.goalFundingStatus === 'SHORTFALL' ? 'bg-coral/20' : 'bg-mint/30'}`}>
                    <p className="font-body text-xs text-black/60">Goal Status</p>
                    <p className={`font-heading font-extrabold text-2xl ${currentPoint.goalFundingStatus === 'SHORTFALL' ? 'text-coral' : 'text-black'}`}>
                      {currentPoint.goalFundingStatus === 'SHORTFALL' ? 'SHORTFALL' : 'FUNDED'}
                    </p>
                  </div>
                  <div className="bg-blue/20 border border-black rounded-sm p-4">
                    <p className="font-body text-xs text-black/60">Portfolio Value</p>
                    <p className="font-heading font-extrabold text-2xl">{formatCurrency(currentPoint.shockedPortfolioValue, 'INR', true)}</p>
                  </div>
                  <div className={`border border-black rounded-sm p-4 ${currentPoint.goalSurplus < 0 ? 'bg-coral/20' : 'bg-mint/30'}`}>
                    <p className="font-body text-xs text-black/60">Goal Surplus/Deficit</p>
                    <p className={`font-heading font-extrabold text-2xl ${currentPoint.goalSurplus < 0 ? 'text-coral' : 'text-black'}`}>
                      {currentPoint.goalSurplus >= 0 ? '+' : ''}{formatCurrency(currentPoint.goalSurplus, 'INR', true)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="font-heading text-xs font-bold text-black/50 uppercase tracking-wider mb-4">
                  SHOCK vs. PORTFOLIO VALUE
                </p>
                {/* Simple SVG chart */}
                <svg viewBox="0 0 300 180" className="w-full border-2 border-black rounded-sm bg-white/50">
                  {/* Goal line */}
                  <line
                    x1="0" y1={180 - (180000 / 220000 * 180)}
                    x2="300" y2={180 - (180000 / 220000 * 180)}
                    stroke="#D84B36" strokeWidth="1.5" strokeDasharray="4,2"
                  />
                  <text x="4" y={180 - (180000 / 220000 * 180) - 4} fill="#D84B36" fontSize="8" fontFamily="monospace">GOAL $180k</text>
                  
                  {/* Portfolio curve */}
                  <polyline
                    fill="none"
                    stroke="#111111"
                    strokeWidth="2"
                    points={chartData.map((d, i) => `${i * 15},${180 - (d.value / 220000) * 180}`).join(' ')}
                  />
                  
                  {/* Current position dot */}
                  <circle
                    cx={multiplier * 20 * 15}
                    cy={180 - (currentPoint.shockedPortfolioValue / 220000) * 180}
                    r="5"
                    fill={currentPoint.goalFundingStatus === 'SHORTFALL' ? '#D84B36' : '#D9F342'}
                    stroke="#111111"
                    strokeWidth="2"
                  />

                  {/* Axes labels */}
                  <text x="2" y="12" fill="#111" fontSize="7" fontFamily="monospace">$220k</text>
                  <text x="2" y="176" fill="#111" fontSize="7" fontFamily="monospace">0%→100% shock</text>
                </svg>
                <p className="text-xs text-black/40 mt-2 font-body text-center">
                  Hypothetical demo — fictional data
                </p>
              </div>
            </div>

            <div className="mt-6 bg-yellow/30 border border-black rounded-sm p-4">
              <p className="font-heading font-bold text-sm">
                ⚡ BREAKING POINT: At ~{(0.35 * 100).toFixed(0)}% severity, Priya's home purchase goal fails.
              </p>
              <p className="font-body text-xs text-black/60 mt-1">
                ShockLens pinpoints this via reverse stress testing — no guessing required.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: '01', title: 'Stock Switch Analyzer', desc: 'Real-time Indian stock market comparison, historical trends, and switch strategy.' },
    { icon: '02', title: 'Reverse Stress Testing', desc: 'Find the minimum shock that breaks your goal — not just what happens at a fixed shock.' },
    { icon: '03', title: 'Goal-Aware Analysis', desc: 'Link portfolios to specific financial goals. Understand funding status, not just returns.' },
    { icon: '04', title: 'Liquidity Modeling', desc: 'Know which assets you can actually access by your goal date, not just what you own.' },
    { icon: '05', title: 'Scenario Stress Testing', desc: 'Test historical crises and interest rate shocks against your financial goals.' },
    { icon: '06', title: 'Transparent Assumptions', desc: 'Every calculation documents its model, rules, and limitations. No black boxes.' },
  ];

  return (
    <section id="features" className="py-24 px-6 bg-black text-cream">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
        >
          <h2 className="section-title text-yellow mb-4">FEATURE HIGHLIGHTS</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {features.map((f) => (
              <div key={f.title} className="border-t border-white/20 p-5 hover:border-yellow transition-colors">
                <div className="font-mono text-xs font-bold tracking-widest mb-4 text-yellow">{f.icon}</div>
                <h3 className="font-heading font-bold text-yellow mb-2">{f.title}</h3>
                <p className="font-body text-sm text-cream/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ModelingTransparencySection() {
  return (
    <section id="method" className="py-24 px-6 bg-cream">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
        >
          <h2 className="section-title mb-4">TRANSPARENT MODELING</h2>
          <p className="section-subtitle mb-12 max-w-2xl">
            ShockLens shows exactly how every number is computed. No black boxes, no hidden assumptions.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="neo-card p-6">
              <h3 className="font-heading font-bold text-lg mb-4">Shock Combination Rule</h3>
              <div className="bg-black text-yellow font-body text-sm p-4 rounded-sm">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed">
{`// Equity + sector shocks are compounded:
combinedShock = (1 + equityShock)
              × (1 + sectorShock) - 1

// Rate shock (fixed-income only):
rateImpact = sensitivity × (bps / 10,000)

// Currency shock:
currencyImpact = currencyShocks[currency]

// Final shocked value:
shockedValue = currentValue
             × (1 + combinedShock
                  + rateImpact
                  + currencyImpact)`}
                </pre>
              </div>
            </div>
            <div className="neo-card p-6">
              <h3 className="font-heading font-bold text-lg mb-4">What We Don't Model</h3>
              <ul className="space-y-2 font-body text-sm text-muted-foreground">
                <li className="flex gap-2"><span className="text-coral">×</span> Statistical correlation between holdings</li>
                <li className="flex gap-2"><span className="text-coral">×</span> Live market prices or real-time data</li>
                <li className="flex gap-2"><span className="text-coral">×</span> Tax implications of liquidation</li>
                <li className="flex gap-2"><span className="text-coral">×</span> Inflation adjustment (all amounts nominal)</li>
                <li className="flex gap-2"><span className="text-coral">×</span> Transaction costs beyond specified haircuts</li>
                <li className="flex gap-2"><span className="text-coral">×</span> Future performance guarantees of any kind</li>
              </ul>
              <div className="mt-4 bg-yellow/20 border border-black rounded-sm p-3">
                <p className="font-body text-xs text-black/70">
                  These limitations are always shown alongside results. ShockLens is a thinking tool, not a prediction engine.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: 'Is this financial advice?',
      a: 'No. ShockLens is an analytical tool that models hypothetical scenarios. Results illustrate how a portfolio might respond under stated assumptions and do not constitute financial advice.',
    },
    {
      q: 'What exchange rates does ShockLens use?',
      a: 'User-provided rates or explicitly dated demo rates. ShockLens never silently assumes live market rates. Every currency conversion is documented.',
    },
    {
      q: 'How accurate is the Breaking Point calculation?',
      a: 'The reverse stress test uses binary search with a numerical tolerance of 0.1%. It finds the approximate first breach point for the selected shock family. Non-monotonic scenarios are flagged explicitly.',
    },
    {
      q: 'How is "accessible by goal date" determined?',
      a: 'Each holding has a liquidity period (immediate, short, medium, long, illiquid). Under a scenario, liquidity restriction multipliers may delay access. Optional liquidation haircuts reduce the accessible value.',
    },
    {
      q: 'Does ShockLens model correlation between holdings?',
      a: 'No. Shocks are applied to individual holdings based on their asset class, sector, and currency — not via a correlation matrix. Shared exposure tags show structural overlap but do not imply statistical correlation.',
    },
  ];

  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6 bg-lavender/10">
      <div className="max-w-3xl mx-auto">
        <h2 className="section-title mb-12 text-center">FREQUENTLY ASKED QUESTIONS</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="neo-card overflow-hidden">
              <button
                className="w-full text-left p-5 flex justify-between items-center"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                aria-controls={`faq-answer-${i}`}
              >
                <span className="font-heading font-bold">{faq.q}</span>
                <span className="text-xl font-bold">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div id={`faq-answer-${i}`} className="px-5 pb-5 font-body text-sm text-muted-foreground border-t border-black/10">
                  <p className="pt-4">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ onStart }: { onStart: () => void }) {
  return (
    <footer className="bg-black text-cream py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          <div>
            <div className="font-heading font-extrabold text-3xl text-yellow mb-2">
              SHOCKLENS
            </div>
            <p className="font-body text-cream/60 max-w-xs">
              Goal-Aware Portfolio Resilience & Reverse Stress Testing
            </p>
          </div>
          <button onClick={onStart} className="btn-yellow text-lg px-8 py-4">
            START STRESS TESTING →
          </button>
        </div>
        <div className="border-t border-white/10 pt-8">
          <p className="font-body text-xs text-cream/40 text-center">
            ShockLens is a hackathon project. All analysis is hypothetical and for illustration purposes only. 
            Not financial advice. Demo data is entirely fictional.
            Built with React, TypeScript, Express, PostgreSQL, and Tailwind CSS.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStart = () => navigate('/register');

  return (
    <div className="bg-cream">
      <LandingHeader />
      <HeroSection onStart={handleStart} />
      <ConcentrationSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ModelingTransparencySection />
      <FAQSection />
      <Footer onStart={handleStart} />
    </div>
  );
}
