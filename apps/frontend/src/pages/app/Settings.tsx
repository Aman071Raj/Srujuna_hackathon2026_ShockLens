import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/api';
import { usesSupabaseAuth } from '../../lib/supabase';

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data } = useQuery({ queryKey: ['auth', 'me'], queryFn: () => auth.me() });
  const user = data?.user;

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => auth.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setSuccess('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setError('');
    },
    onError: (e: Error) => { setError(e.message); setSuccess(''); },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, string> = {};
    if (name && name !== user?.name) payload.name = name;
    if (newPassword) {
      if (!usesSupabaseAuth && !currentPassword) { setError('Enter your current password to set a new one.'); return; }
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }
    if (Object.keys(payload).length === 0) { setError('No changes to save.'); return; }
    updateMutation.mutate(payload);
  };

  const handleLogout = async () => {
    await auth.logout();
    queryClient.clear();
    navigate('/login');
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-heading font-extrabold text-4xl">SETTINGS</h1>

      <div className="neo-card p-6 space-y-5">
        <h2 className="font-heading font-bold text-xl">PROFILE</h2>

        {error && <p className="text-coral text-sm font-semibold bg-coral/10 border border-coral rounded-sm px-3 py-2">{error}</p>}
        {success && <p className="text-black text-sm font-semibold bg-mint/30 border border-black rounded-sm px-3 py-2">{success}</p>}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="font-heading font-bold text-sm block mb-1">EMAIL</label>
            <input
              disabled
              className="w-full border-2 border-black/30 rounded-sm px-3 py-2 font-body bg-black/5 text-black/60"
              value={user?.email ?? ''}
            />
            <p className="font-body text-xs text-muted-foreground mt-1">Email cannot be changed in this demo.</p>
          </div>
          <div>
            <label className="font-heading font-bold text-sm block mb-1">DISPLAY NAME</label>
            <input
              className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              value={name || user?.name || ''}
              onChange={e => setName(e.target.value)}
              placeholder={user?.name}
            />
          </div>
          {!usesSupabaseAuth && <div>
            <label className="font-heading font-bold text-sm block mb-1">CURRENT PASSWORD</label>
            <input
              type="password"
              className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Required to change password"
            />
          </div>}
          <div>
            <label className="font-heading font-bold text-sm block mb-1">NEW PASSWORD</label>
            <input
              type="password"
              className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>
          <button type="submit" disabled={updateMutation.isPending} className="btn-yellow px-6 py-3">
            {updateMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </form>
      </div>

      <div className="neo-card p-6">
        <h2 className="font-heading font-bold text-xl mb-4">ACCOUNT</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading font-bold">Signed in as</p>
            <p className="font-body text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="btn-coral px-5 py-2 text-sm">
            SIGN OUT
          </button>
        </div>
      </div>

      <div className="neo-card p-6 bg-yellow/10">
        <h2 className="font-heading font-bold text-xl mb-3">ABOUT SHOCKLENS</h2>
        <div className="font-body text-sm text-muted-foreground space-y-2">
          <p>Version: 1.0.0 — Hackathon Edition</p>
          <p>Built with React, TypeScript, Express.js, PostgreSQL, Prisma, Tailwind CSS, and Recharts.</p>
          <p>All analysis is hypothetical. Not financial advice.</p>
        </div>
      </div>
    </div>
  );
}
