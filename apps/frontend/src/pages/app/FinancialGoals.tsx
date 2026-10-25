import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goals as goalsApi, portfolios as portfoliosApi } from '../../lib/api';
import { formatCurrency, formatDate, daysUntil } from '../../lib/utils';
import type { FinancialGoal } from '@shocklens/shared';

const GOAL_TYPES = [
  { value: 'home_down_payment', label: '🏠 Home Down Payment' },
  { value: 'higher_education', label: '🎓 Higher Education' },
  { value: 'retirement_withdrawal', label: '🌴 Retirement Withdrawal' },
  { value: 'emergency_reserve', label: '🛡️ Emergency Reserve' },
  { value: 'custom', label: '⚙️ Custom Goal' },
];

function GoalCard({ goal, onDelete }: { goal: FinancialGoal; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const daysLeft = daysUntil(goal.targetDate);
  const typeLabel = GOAL_TYPES.find(t => t.value === goal.goalType)?.label ?? goal.goalType;

  return (
    <div className="neo-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-body text-sm text-muted-foreground">{typeLabel}</span>
          </div>
          <h3 className="font-heading font-bold text-xl">{goal.name}</h3>
        </div>
        <div className={`pill ${daysLeft < 30 ? 'bg-coral/20 text-coral border-coral' : daysLeft < 180 ? 'bg-yellow text-black border-black' : 'bg-mint text-black border-black'}`}>
          {daysLeft > 0 ? `${daysLeft} days` : 'PAST DUE'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-yellow/20 rounded-sm p-3 border border-black/10">
          <p className="font-body text-xs text-black/60">TARGET</p>
          <p className="font-heading font-bold">{formatCurrency(goal.targetAmount)}</p>
        </div>
        <div className="bg-blue/10 rounded-sm p-3 border border-black/10">
          <p className="font-body text-xs text-black/60">RESERVED CASH</p>
          <p className="font-heading font-bold">{formatCurrency(goal.reservedCash)}</p>
        </div>
        <div className="bg-lavender/10 rounded-sm p-3 border border-black/10">
          <p className="font-body text-xs text-black/60">LIQUID NEEDED</p>
          <p className="font-heading font-bold">{formatCurrency(goal.requiredLiquidAmount)}</p>
        </div>
        <div className="bg-mint/20 rounded-sm p-3 border border-black/10">
          <p className="font-body text-xs text-black/60">MONTHLY CONTRIB.</p>
          <p className="font-heading font-bold">
            {goal.monthlyContribution ? formatCurrency(goal.monthlyContribution) : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-black/10 pt-3">
        <div>
          <span className="font-body text-xs text-muted-foreground">Target Date: </span>
          <span className="font-heading font-semibold text-sm">{formatDate(goal.targetDate)}</span>
          {goal.flexibleDate && <span className="ml-2 pill bg-blue/20 border-blue/30 text-blue text-xs">FLEXIBLE</span>}
        </div>
        {confirming ? (
          <div className="flex gap-2">
            <button onClick={onDelete} className="text-coral text-sm font-heading font-bold hover:underline">Confirm Delete</button>
            <button onClick={() => setConfirming(false)} className="text-black/40 text-sm">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-coral text-sm font-heading font-bold hover:underline">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function AddGoalForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    goalType: 'custom',
    targetAmount: '',
    targetDate: '',
    reservedCash: '0',
    requiredLiquidAmount: '',
    acceptableShortfall: '0',
    monthlyContribution: '',
    flexibleDate: false,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({
      name: form.name,
      goalType: form.goalType,
      targetAmount: Number(form.targetAmount),
      targetDate: form.targetDate,
      reservedCash: Number(form.reservedCash),
      requiredLiquidAmount: Number(form.requiredLiquidAmount),
      acceptableShortfall: Number(form.acceptableShortfall),
      monthlyContribution: form.monthlyContribution ? Number(form.monthlyContribution) : undefined,
      flexibleDate: form.flexibleDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="neo-card p-6 space-y-4">
      <h3 className="font-heading font-bold text-2xl">CREATE FINANCIAL GOAL</h3>
      {error && <p className="text-coral text-sm font-semibold">{error}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="font-heading font-bold text-sm block mb-1">Goal Name *</label>
          <input
            required
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Home Down Payment"
          />
        </div>

        <div>
          <label className="font-heading font-bold text-sm block mb-1">Goal Type *</label>
          <select
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.goalType}
            onChange={e => setForm({ ...form, goalType: e.target.value })}
          >
            {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="font-heading font-bold text-sm block mb-1">Target Date *</label>
          <input
            required
            type="date"
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.targetDate}
            onChange={e => setForm({ ...form, targetDate: e.target.value })}
          />
        </div>

        <div>
          <label className="font-heading font-bold text-sm block mb-1">Target Amount ($) *</label>
          <input
            required
            type="number"
            min={0}
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.targetAmount}
            onChange={e => setForm({ ...form, targetAmount: e.target.value })}
            placeholder="180000"
          />
        </div>

        <div>
          <label className="font-heading font-bold text-sm block mb-1">Required Liquid Amount ($) *</label>
          <input
            required
            type="number"
            min={0}
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.requiredLiquidAmount}
            onChange={e => setForm({ ...form, requiredLiquidAmount: e.target.value })}
            placeholder="170000"
          />
        </div>

        <div>
          <label className="font-heading font-bold text-sm block mb-1">Reserved Cash ($)</label>
          <input
            type="number"
            min={0}
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.reservedCash}
            onChange={e => setForm({ ...form, reservedCash: e.target.value })}
            placeholder="5000"
          />
        </div>

        <div>
          <label className="font-heading font-bold text-sm block mb-1">Monthly Contribution ($)</label>
          <input
            type="number"
            min={0}
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.monthlyContribution}
            onChange={e => setForm({ ...form, monthlyContribution: e.target.value })}
            placeholder="2000 (optional)"
          />
        </div>

        <div>
          <label className="font-heading font-bold text-sm block mb-1">Acceptable Shortfall ($)</label>
          <input
            type="number"
            min={0}
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.acceptableShortfall}
            onChange={e => setForm({ ...form, acceptableShortfall: e.target.value })}
            placeholder="10000 (optional)"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="flexible-date"
            type="checkbox"
            className="w-4 h-4 border-2 border-black rounded-sm"
            checked={form.flexibleDate}
            onChange={e => setForm({ ...form, flexibleDate: e.target.checked })}
          />
          <label htmlFor="flexible-date" className="font-heading font-bold text-sm cursor-pointer">
            Flexible Date (goal date can shift)
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={mutation.isPending} className="btn-yellow px-6 py-3">
          {mutation.isPending ? 'CREATING...' : 'CREATE GOAL'}
        </button>
        <button type="button" onClick={onDone} className="btn-white px-6 py-3">
          CANCEL
        </button>
      </div>
    </form>
  );
}

export default function FinancialGoals() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.list(),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const goalList = (data?.goals ?? []) as FinancialGoal[];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-4xl mb-1">FINANCIAL GOALS</h1>
          <p className="font-body text-muted-foreground">
            Define your target. ShockLens will track whether your portfolio can fund it.
          </p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn-yellow px-5 py-3">
          + Add Goal
        </button>
      </div>

      {showAddForm && <AddGoalForm onDone={() => setShowAddForm(false)} />}

      {isLoading ? (
        <div className="font-heading font-bold text-xl">Loading goals...</div>
      ) : goalList.length === 0 && !showAddForm ? (
        <div className="neo-card p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="font-heading font-bold text-2xl mb-2">No Goals Yet</h2>
          <p className="font-body text-muted-foreground mb-6">
            Create a financial goal to see how market shocks affect your ability to fund it.
          </p>
          <button onClick={() => setShowAddForm(true)} className="btn-yellow px-8 py-4">
            CREATE FIRST GOAL
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goalList.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDelete={() => deleteGoalMutation.mutate(goal.id)}
            />
          ))}
        </div>
      )}

      <div className="disclaimer-banner">
        <strong>Goal Funding Status</strong> is calculated using accessible (liquid) portfolio value + 
        monthly contributions + reserved cash. Illiquid holdings not accessible by goal date are excluded. 
        All amounts are nominal — no inflation adjustment.
      </div>
    </div>
  );
}
