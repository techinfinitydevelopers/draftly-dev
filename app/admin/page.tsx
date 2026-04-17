'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

const ADMIN_EMAIL = 'kunal.techinfinity@gmail.com';

const PLANS = ['free', 'basic', 'basic-plus', 'pro', 'premium', 'agency', 'tester'];
const PLAN_COLORS: Record<string, string> = {
  free: 'text-white/40',
  basic: 'text-cyan-400',
  'basic-plus': 'text-blue-400',
  pro: 'text-amber-400',
  premium: 'text-fuchsia-400',
  agency: 'text-emerald-400',
  tester: 'text-rose-400',
};

interface UserRow {
  uid: string;
  email: string;
  displayName: string;
  plan: string;
  subscriptionStatus: string;
  creditsUsed: number;
  sites3DGenerated: number;
  builderVideoGenerations: number;
  builderImageGenerations: number;
  onboardingComplete: boolean;
  createdAt: string | null;
  photoURL: string | null;
}

interface Stats {
  totalUsers: number;
  totalCreditsUsed: number;
  totalSites: number;
  totalVideos: number;
  planCounts: Record<string, number>;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'overview' | 'users'>('overview');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [loadingData, setLoadingData] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [creditsInput, setCreditsInput] = useState('');
  const [planInput, setPlanInput] = useState('');

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const getToken = useCallback(async () => {
    return user ? await user.getIdToken() : '';
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingData(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/stats', { headers }),
      ]);
      const usersData = await usersRes.json() as { users: UserRow[] };
      const statsData = await statsRes.json() as Stats;
      setUsers(usersData.users || []);
      setStats(statsData);
    } catch {
      // ignore
    } finally {
      setLoadingData(false);
    }
  }, [isAdmin, getToken]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selectedUser) return;
    setActionMsg('');
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/user-action', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, uid: selectedUser.uid, ...extra }),
      });
      const data = await res.json() as { message?: string; error?: string };
      setActionMsg(data.message || data.error || 'Done');
      await fetchData();
      if (action === 'delete-user') setSelectedUser(null);
    } catch {
      setActionMsg('Error');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white/40 text-sm">Loading…</div>;
  }

  if (!isAdmin) {
    return <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white/30 text-sm">Access denied.</div>;
  }

  const filteredUsers = users.filter((u) => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.displayName.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[13px] font-semibold text-white/80">Admin Dashboard</span>
          <span className="text-[11px] text-white/30 ml-1">{ADMIN_EMAIL}</span>
        </div>
        <button onClick={fetchData} disabled={loadingData}
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5">
          <i className={`fa-solid fa-rotate-right text-[10px] ${loadingData ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/[0.04] rounded-xl p-1 w-fit">
          {(['overview', 'users'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all capitalize
                ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: 'fa-users', color: 'text-blue-400' },
                { label: 'Total Credits Used', value: stats.totalCreditsUsed.toLocaleString(), icon: 'fa-bolt', color: 'text-amber-400' },
                { label: 'Sites Generated', value: stats.totalSites, icon: 'fa-globe', color: 'text-emerald-400' },
                { label: 'Videos Generated', value: stats.totalVideos, icon: 'fa-film', color: 'text-fuchsia-400' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <i className={`fa-solid ${s.icon} text-[13px] ${s.color}`} />
                    <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Plan distribution */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-4">Users by Plan</p>
              <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
                {PLANS.map((p) => (
                  <div key={p} className="text-center">
                    <p className={`text-xl font-bold ${PLAN_COLORS[p] || 'text-white'}`}>{stats.planCounts[p] || 0}</p>
                    <p className="text-[10px] text-white/30 mt-0.5 capitalize">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="flex gap-4">
            {/* Users List */}
            <div className="flex-1 min-w-0">
              {/* Filters */}
              <div className="flex gap-2 mb-4">
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email or name..."
                  className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none focus:border-white/20" />
                <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white/70 outline-none">
                  <option value="all">All Plans</option>
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="text-[11px] text-white/30 mb-2">{filteredUsers.length} users</div>

              {/* Table */}
              <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                      <th className="text-left px-4 py-2.5 text-white/40 font-semibold">Email</th>
                      <th className="text-left px-4 py-2.5 text-white/40 font-semibold">Plan</th>
                      <th className="text-right px-4 py-2.5 text-white/40 font-semibold">Credits</th>
                      <th className="text-right px-4 py-2.5 text-white/40 font-semibold">Sites</th>
                      <th className="text-right px-4 py-2.5 text-white/40 font-semibold">Videos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.uid}
                        onClick={() => {
                          setSelectedUser(u);
                          setActionMsg('');
                          setPlanInput(u.plan);
                          setCreditsInput('');
                        }}
                        className={`border-b border-white/[0.04] cursor-pointer transition-colors
                          ${selectedUser?.uid === u.uid ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}>
                        <td className="px-4 py-2.5">
                          <div className="text-white/80 truncate max-w-[200px]">{u.email || u.uid}</div>
                          {u.displayName && <div className="text-white/30 text-[10px]">{u.displayName}</div>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`font-semibold capitalize ${PLAN_COLORS[u.plan] || 'text-white/40'}`}>{u.plan}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-white/60">{u.creditsUsed}</td>
                        <td className="px-4 py-2.5 text-right text-white/60">{u.sites3DGenerated}</td>
                        <td className="px-4 py-2.5 text-right text-white/60">{u.builderVideoGenerations}</td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-white/20 text-[12px]">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Detail Panel */}
            {selectedUser && (
              <div className="w-72 flex-shrink-0">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4 sticky top-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-white/90 break-all">{selectedUser.email}</p>
                      {selectedUser.displayName && <p className="text-[11px] text-white/40 mt-0.5">{selectedUser.displayName}</p>}
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="text-white/20 hover:text-white/50 ml-2">
                      <i className="fa-solid fa-times text-[11px]" />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Plan', value: selectedUser.plan },
                      { label: 'Credits Used', value: selectedUser.creditsUsed },
                      { label: 'Sites', value: selectedUser.sites3DGenerated },
                      { label: 'Videos', value: selectedUser.builderVideoGenerations },
                      { label: 'Images', value: selectedUser.builderImageGenerations },
                      { label: 'Onboarded', value: selectedUser.onboardingComplete ? 'Yes' : 'No' },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/[0.04] rounded-lg p-2.5">
                        <p className="text-[10px] text-white/30">{s.label}</p>
                        <p className={`text-[13px] font-semibold mt-0.5 capitalize ${s.label === 'Plan' ? (PLAN_COLORS[selectedUser.plan] || 'text-white') : 'text-white/80'}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Change Plan */}
                  <div>
                    <p className="text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Change Plan</p>
                    <div className="flex gap-2">
                      <select value={planInput} onChange={(e) => setPlanInput(e.target.value)}
                        className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[12px] text-white/70 outline-none">
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button onClick={() => doAction('set-plan', { plan: planInput })}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[11px] font-semibold hover:bg-blue-500/30 transition-all">
                        Set
                      </button>
                    </div>
                  </div>

                  {/* Add Credits */}
                  <div>
                    <p className="text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Add Credits</p>
                    <div className="flex gap-2">
                      <input type="number" value={creditsInput} onChange={(e) => setCreditsInput(e.target.value)}
                        placeholder="Amount"
                        className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[12px] text-white placeholder-white/20 outline-none focus:border-white/20" />
                      <button onClick={() => doAction('add-credits', { credits: Number(creditsInput) })}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/30 transition-all">
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button onClick={() => doAction('reset-usage')}
                      className="w-full px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[12px] font-medium hover:bg-amber-500/20 transition-all">
                      <i className="fa-solid fa-rotate-left mr-2 text-[10px]" />
                      Reset Monthly Usage
                    </button>
                    <button onClick={() => {
                      if (confirm(`Delete user ${selectedUser.email}? This cannot be undone.`)) {
                        doAction('delete-user');
                      }
                    }}
                      className="w-full px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-medium hover:bg-red-500/20 transition-all">
                      <i className="fa-solid fa-trash mr-2 text-[10px]" />
                      Delete User
                    </button>
                  </div>

                  {actionMsg && (
                    <p className="text-[12px] text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2">{actionMsg}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
