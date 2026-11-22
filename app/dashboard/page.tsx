'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { Activity, Bell, ChevronDown, CircleHelp, Command, FileText, LayoutDashboard, LogOut, MessageCircle, Search, Settings, Users, Zap, Plus, ArrowUpRight, Clock3, MoreHorizontal, CheckCircle2, UserRound } from 'lucide-react';

const nav = [['Overview', LayoutDashboard], ['Tasks', CheckCircle2], ['Messages', MessageCircle], ['Directory', Users], ['Analytics', Activity]] as const;

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [active, setActive] = useState('Overview');
  const [menu, setMenu] = useState(false);
  useEffect(() => onAuthStateChanged(firebaseAuth, u => {
    if (!u) window.location.href = '/login';
    else setUser(u);
  }), []);
  async function logout() {
    await signOut(firebaseAuth);
    window.location.href = '/login';
  }
  return <main className="workspace">
    <aside className="rail">
      <div className="rail-brand">T</div>
      <div className="rail-nav">{nav.map(([label, Icon]) => <button key={label} onClick={() => setActive(label)} className={active === label ? 'rail-item selected' : 'rail-item'} title={label}><Icon size={19} /><span>{label}</span></button>)}</div>
      <div className="rail-bottom"><button className="rail-item" onClick={() => setActive('Settings')}><Settings size={19} /><span>Settings</span></button><button className="rail-item"><CircleHelp size={19} /><span>Help</span></button></div>
    </aside>
    <section className="workspace-main">
      <header className="topbar">
        <div className="crumb">Workspace <span>/</span> <b>{active}</b></div>
        <div className="top-actions">
          <button className="search-trigger"><Search size={16} /> Search <kbd>⌘ K</kbd></button>
          <button className="top-icon"><Bell size={18} /><i /></button>
          <button className="profile-chip" onClick={() => setMenu(!menu)}><span className="avatar">{(user?.displayName || user?.email || 'U').slice(0, 1).toUpperCase()}</span><span>{user?.displayName || user?.email?.split('@')[0] || 'Account'}</span><ChevronDown size={15} /></button>
          {menu && <div className="profile-menu"><button onClick={() => { window.location.href = '/profile'; }}><UserRound size={15} /> Profile</button><button onClick={logout}><LogOut size={15} /> Sign out</button></div>}
        </div>
      </header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>{active === 'Overview' ? 'Good afternoon' : active}</h1><p className="muted">{active === 'Overview' ? 'Here’s what’s happening across your work today.' : 'Your workspace tools and updates.'}</p></div><button className="primary-button" onClick={() => setActive('Tasks')}><Plus size={17} /> New task</button></div>
        {active === 'Overview' ? <>
          <div className="metric-grid"><Metric label="Open tasks" value="—" hint="Your current workload" icon={<CheckCircle2 />} /><Metric label="Due today" value="—" hint="Your upcoming priorities" icon={<Clock3 />} /><Metric label="Team updates" value="—" hint="Recent workspace activity" icon={<Zap />} /></div>
          <div className="panel-grid">
            <section className="panel"><div className="panel-head"><div><h3>My tasks</h3><p className="muted">Your assigned work at a glance</p></div><button className="text-button" onClick={() => setActive('Tasks')}>View all <ArrowUpRight size={15} /></button></div><div className="empty-state"><div className="empty-icon"><FileText size={22} /></div><b>No tasks yet</b><span>Assigned tasks will appear here.</span></div></section>
            <section className="panel"><div className="panel-head"><div><h3>Activity</h3><p className="muted">Latest workspace updates</p></div><button className="more-button"><MoreHorizontal size={18} /></button></div><div className="empty-state compact"><div className="empty-icon"><Activity size={22} /></div><b>No activity yet</b><span>Updates will show here as work moves forward.</span></div></section>
          </div>
        </> : <section className="panel page-panel"><div className="empty-state"><div className="empty-icon"><Command size={22} /></div><b>{active} is being prepared</b><span>No updates are available here yet.</span></div></section>}
        <footer className="page-footer">Trinetray Workspace <span>•</span> A focused place to get work done</footer>
      </div>
    </section>
  </main>;
}
function Metric({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: React.ReactNode }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{hint}</small></article>;
}
