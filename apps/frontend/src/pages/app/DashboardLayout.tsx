import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { auth } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { path: 'overview', label: 'Overview', index: '01' },
  { path: 'portfolio', label: 'My Portfolio', index: '02' },
  { path: 'butterfly', label: 'Butterfly Effect Engine', index: '03' },
  { path: 'immunity', label: 'Shock Immunity', index: '04' },
  { path: 'switch-analyzer', label: 'Stock Switch & Compare', index: '05' },
  { path: 'goals', label: 'Financial Goals', index: '06' },
  { path: 'scenarios', label: 'Scenario Lab', index: '07' },
  { path: 'reports', label: 'Reports', index: '08' },
  { path: 'settings', label: 'Settings', index: '09' },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' || window.innerWidth >= 768,
  );
  const [darkMode, setDarkMode] = useState(false);

  const { data } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => auth.me(),
    staleTime: Infinity,
  });

  const handleLogout = async () => {
    await auth.logout();
    queryClient.clear();
    navigate('/login');
  };

  const toggleDark = () => {
    setDarkMode(current => !current);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={cn('min-h-screen flex bg-background text-foreground', darkMode ? 'dark' : '')}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            id="app-sidebar"
            aria-label="Workspace navigation"
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: 'tween', duration: 0.16 }}
            className="w-64 bg-black text-cream flex-shrink-0 flex flex-col border-r border-black fixed md:static inset-y-0 left-0 z-40"
          >
            <div className="px-5 py-5 border-b border-white/20">
              <div className="flex items-center gap-3">
                <span className="brand-mark" aria-hidden="true">SL</span>
                <div>
                  <div className="font-heading font-extrabold text-lg tracking-tight text-white">SHOCKLENS</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-cream/55 mt-1">Portfolio resilience</div>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main menu">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cream/40 px-3 pb-3">Workspace</p>
              {NAV_ITEMS.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2.5 border-l-4 font-heading text-sm font-semibold transition-colors',
                    isActive
                      ? 'border-yellow bg-white/10 text-white'
                      : 'border-transparent text-cream/70 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span className="w-6 shrink-0 font-mono text-[10px] opacity-50">{item.index}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="px-4 py-4 border-t border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-yellow border border-black flex items-center justify-center font-mono font-bold text-black text-xs">
                  {data?.user.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-bold text-sm text-white truncate">{data?.user.name ?? 'Account'}</p>
                  <p className="font-mono text-[10px] text-cream/50 truncate max-w-[150px]">{data?.user.email ?? ''}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="font-mono text-[10px] uppercase tracking-widest text-cream/70 hover:text-yellow transition-colors"
              >
                Sign out <span aria-hidden="true">→</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/55 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-cream border-b border-black px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(open => !open)}
              className="border border-black px-3 py-2 hover:bg-yellow transition-colors font-mono text-[10px] font-bold tracking-widest"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
            >
              MENU
            </button>
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground">ShockLens / Workspace</span>
          </div>
          <button
            type="button"
            onClick={toggleDark}
            className="border border-black px-3 py-2 hover:bg-yellow transition-colors font-mono text-[10px] font-bold tracking-widest"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? 'LIGHT' : 'DARK'}
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-background p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
