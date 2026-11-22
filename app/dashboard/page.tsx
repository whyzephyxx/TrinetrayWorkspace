
'use client';

import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import {
  Activity,
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Users,
  Plus,
  UserRound,
  Send,
  RotateCcw,
  X,
  BarChart3
} from 'lucide-react';

type Item = {
  id?: string;
  conversation_id?: string;
  title?: string | null;
  description?: string | null;
  status?: string;
  priority?: string;
  visibility?: string;
  due_at?: string | null;
  read_at?: string | null;
  created_at?: string;
  message?: string;
  body?: string;
  sender_id?: string;
  conversations?: {
    title?: string | null;
  };
  full_name?: string | null;
  email?: string;
  designation?: string | null;
  department_id?: string | null;
  role?: string;
  assigned_to?: string;
  assigned_by?: string;
};

type SearchResults = {
  tasks: Item[];
  people: Item[];
};

type Analytics = {
  staff?: number;
  allTasks?: number;
  doneTasks?: number;
  openTasks?: number;
};

type AdminData = {
  pending: Item[];
  employees: Item[];
};

type ActionBody = Record<string, unknown>;

const nav = [
  ['Overview', LayoutDashboard],
  ['Tasks', CheckCircle2],
  ['Messages', MessageCircle],
  ['Directory', Users],
  ['Analytics', Activity],
  ['Notifications', Bell]
] as const;

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profileMenu, setProfileMenu] = useState(false);
  const [active, setActive] = useState('Overview');

  const [tasks, setTasks] = useState<Item[]>([]);
  const [people, setPeople] = useState<Item[]>([]);
  const [notifications, setNotifications] = useState<Item[]>([]);
  const [conversations, setConversations] = useState<Item[]>([]);
  const [messages, setMessages] = useState<Item[]>([]);
  const [selectedConversation, setSelectedConversation] = useState('');

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [admin, setAdmin] = useState<AdminData | null>(null);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('medium');
  const [visibility, setVisibility] = useState('private');
  const [dueAt, setDueAt] = useState('');

  const [messageText, setMessageText] = useState('');
  const [newChatPerson, setNewChatPerson] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const api = useCallback(
    async (path: string, method = 'GET', body?: ActionBody) => {
      if (!user) {
        throw new Error('Sign in required.');
      }

      const token = await user.getIdToken();

      const response = await fetch(path, {
        method,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof data.error === 'string'
            ? data.error
            : 'Request failed.';

        throw new Error(message);
      }

      return data as Record<string, unknown>;
    },
    [user]
  );

  const load = useCallback(async () => {
    if (!user) return;

    try {
      const [t, p, n, c, a] = await Promise.all([
        api('/api/workspace?type=tasks'),
        api('/api/workspace?type=directory'),
        api('/api/workspace?type=notifications'),
        api('/api/workspace?type=messages'),
        api('/api/workspace?type=analytics')
      ]);

      setTasks(Array.isArray(t.items) ? t.items as Item[] : []);
      setPeople(Array.isArray(p.items) ? p.items as Item[] : []);
      setNotifications(Array.isArray(n.items) ? n.items as Item[] : []);
      setConversations(Array.isArray(c.items) ? c.items as Item[] : []);
      setAnalytics(a as Analytics);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to load workspace.'
      );
    }
  }, [api, user]);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, currentUser => {
      if (!currentUser) {
        location.href = '/login';
      } else {
        setUser(currentUser);

        if (
          new URLSearchParams(location.search).get('view') === 'admin'
        ) {
          setActive('Admin');
        }
      }
    });
  }, []);

  useEffect(() => {
    if (user) {
      void load();
    }
  }, [user, load]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(() => {
      api(
        '/api/workspace?type=search&q=' +
          encodeURIComponent(search.trim())
      )
        .then(data => {
          setSearchResults({
            tasks: Array.isArray(data.tasks) ? data.tasks as Item[] : [],
            people: Array.isArray(data.people) ? data.people as Item[] : []
          });
        })
        .catch(() => setSearchResults(null));
    }, 250);

    return () => clearTimeout(timer);
  }, [search, api]);

  async function action(body: ActionBody): Promise<boolean> {
    setBusy(true);
    setError('');

    try {
      await api('/api/workspace', 'POST', body);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function openConversation(id: string) {
    setSelectedConversation(id);

    try {
      const data = await api(
        '/api/workspace?type=conversation_messages&id=' +
          encodeURIComponent(id)
      );

      setMessages(
        Array.isArray(data.items) ? data.items as Item[] : []
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to load messages.'
      );
    }
  }

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedConversation || !messageText.trim()) return;

    const sent = await action({
      action: 'send_message',
      conversation_id: selectedConversation,
      message: messageText.trim()
    });

    if (sent) {
      setMessageText('');
      await openConversation(selectedConversation);
    }
  }

  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!assignee || assignee === user?.uid) {
      setError('Choose another approved employee to assign this task.');
      return;
    }

    const created = await action({
      action: 'create_task',
      title: taskTitle,
      description: taskDescription,
      assigned_to: assignee,
      priority,
      visibility,
      due_at: dueAt || null
    });

    if (created) {
      setShowCreate(false);
      setTaskTitle('');
      setTaskDescription('');
      setAssignee('');
      setPriority('medium');
      setVisibility('private');
      setDueAt('');
    }
  }

  async function startChat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!newChatPerson) return;

    setBusy(true);
    setError('');

    try {
      const data = await api('/api/workspace', 'POST', {
        action: 'start_conversation',
        employee_ids: [newChatPerson]
      });

      await load();
      setActive('Messages');

      const item = data.item as Item | undefined;

      if (item?.id) {
        await openConversation(item.id);
      }

      setNewChatPerson('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to start conversation.'
      );
    } finally {
      setBusy(false);
    }
  }

  const loadAdmin = useCallback(async () => {
    try {
      const data = await api('/api/workspace?type=admin');

      setAdmin({
        pending: Array.isArray(data.pending) ? data.pending as Item[] : [],
        employees: Array.isArray(data.employees) ? data.employees as Item[] : []
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Administrator access unavailable.'
      );
    }
  }, [api]);

  useEffect(() => {
    if (active === 'Admin') {
      void loadAdmin();
    }
  }, [active, loadAdmin]);

  async function logout() {
    await signOut(firebaseAuth);
    location.href = '/login';
  }

  const unread = notifications.filter(n => !n.read_at).length;

  async function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user) return;

    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/admin/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          stage: 'phrase',
          value: search
        })
      });

      const data = await response.json();

      if (response.ok && data.next === 'pin') {
        location.href = '/admin?step=pin';
      }
    } catch {
      // Access verification errors are intentionally not exposed here.
    }
  }

  const heading = active === 'Overview' ? 'Good to see you' : active;

  return (
    <main className="workspace">
      <aside className="rail">
        <div className="rail-brand">T</div>

        <div className="rail-nav">
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={active === label ? 'rail-item selected' : 'rail-item'}
              title={label}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="rail-bottom">
          <button
            className="rail-item"
            onClick={() => location.href = '/profile'}
          >
            <Settings size={19} />
            <span>Profile</span>
          </button>

          <button className="rail-item" onClick={logout}>
            <LogOut size={19} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="topbar">
          <div className="crumb">
            Workspace <span>/</span> <b>{active}</b>
          </div>

          <div className="top-actions">
            <button
              className="search-trigger"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search size={16} /> Search <kbd>Ctrl K</kbd>
            </button>

            <button
              className="top-icon"
              onClick={() => setActive('Notifications')}
            >
              <Bell size={18} />
              {unread > 0 && <i />}
            </button>

            <button
              className="profile-chip"
              onClick={() => setProfileMenu(!profileMenu)}
            >
              <span className="avatar">
                {(user?.displayName || user?.email || 'U')
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
              <span>
                {user?.displayName ||
                  user?.email?.split('@')[0] ||
                  'Account'}
              </span>
            </button>

            {profileMenu && (
              <div className="profile-menu">
                <button onClick={() => location.href = '/profile'}>
                  <UserRound size={15} /> Profile
                </button>
                <button onClick={logout}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {showSearch && (
          <div
            style={{
              padding: '14px 4.2vw',
              background: '#fff',
              borderBottom: '1px solid #e6ebf3'
            }}
          >
            <form onSubmit={submitSearch}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks and employees…"
                style={{
                  width: '100%',
                  height: 42,
                  border: '1px solid #dce3ee',
                  borderRadius: 10,
                  padding: '0 13px'
                }}
              />
            </form>

            {searchResults && (
              <div
                style={{
                  display: 'flex',
                  gap: 24,
                  marginTop: 12,
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <b>Tasks</b>
                  {searchResults.tasks.map(t => (
                    <p key={t.id}>{t.title}</p>
                  ))}
                </div>

                <div>
                  <b>Employees</b>
                  {searchResults.people.map(p => (
                    <p key={p.id}>
                      {p.full_name || p.email} · {p.email}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">YOUR WORKSPACE</div>
              <h1>{heading}</h1>
              <p className="muted">
                {active === 'Overview'
                  ? 'Your work, team updates and priorities.'
                  : 'Manage your workspace activity.'}
              </p>
            </div>

            {active === 'Tasks' && (
              <button
                className="primary-button"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={17} /> New task
              </button>
            )}
          </div>

          {error && (
            <div className="form-error">
              {error}
              <button
                onClick={() => setError('')}
                style={{
                  float: 'right',
                  border: 0,
                  background: 'none'
                }}
              >
                ×
              </button>
            </div>
          )}

          {active === 'Overview' && (
            <>
              <div className="metric-grid">
                <Metric
                  label="Open tasks"
                  value={String(tasks.filter(t => t.status !== 'completed').length)}
                  hint="Visible to you"
                  icon={<CheckCircle2 />}
                />
                <Metric
                  label="Due today"
                  value={String(
                    tasks.filter(
                      t =>
                        t.due_at &&
                        new Date(t.due_at).toDateString() ===
                          new Date().toDateString() &&
                        t.status !== 'completed'
                    ).length
                  )}
                  hint="Upcoming priorities"
                  icon={<Clock3 />}
                />
                <Metric
                  label="Unread notifications"
                  value={String(unread)}
                  hint="Workspace updates"
                  icon={<Bell />}
                />
              </div>

              <div className="panel-grid">
                <section className="panel">
                  <PanelHead
                    title="My tasks"
                    subtitle="Tasks visible to your account"
                    action={() => setActive('Tasks')}
                  />
                  <TaskList
                    tasks={tasks.slice(0, 5)}
                    onUpdate={action}
                  />
                </section>

                <section className="panel">
                  <PanelHead
                    title="Recent notifications"
                    subtitle="Latest workspace updates"
                    action={() => setActive('Notifications')}
                  />
                  <NotificationList
                    items={notifications.slice(0, 5)}
                    onRead={action}
                  />
                </section>
              </div>
            </>
          )}

          {active === 'Tasks' && (
            <section className="panel">
              <PanelHead
                title="Tasks"
                subtitle="Create, track, complete and reopen work items"
              />
              <TaskList tasks={tasks} onUpdate={action} />
            </section>
          )}

          {active === 'Directory' && (
            <section className="panel">
              <PanelHead
                title="Employee directory"
                subtitle="Approved employees who are visible in the directory"
              />

              <div className="directory-grid">
                {people.length ? (
                  people.map(p => (
                    <article className="metric-card" key={p.id}>
                      <div className="avatar">
                        {(p.full_name || p.email || 'E')
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                      <b>{p.full_name || 'Employee'}</b>
                      <small>{p.designation || 'Team member'}</small>
                      <small>{p.email}</small>
                    </article>
                  ))
                ) : (
                  <Empty
                    title="No employees to show"
                    text="Approved and directory-visible employees will appear here."
                  />
                )}
              </div>
            </section>
          )}

          {active === 'Messages' && (
            <div className="panel-grid">
              <section className="panel">
                <PanelHead
                  title="Conversations"
                  subtitle="Private and group messages"
                />

                <form
                  onSubmit={startChat}
                  style={{
                    display: 'flex',
                    gap: 8,
                    margin: '14px 0'
                  }}
                >
                  <select
                    value={newChatPerson}
                    onChange={e => setNewChatPerson(e.target.value)}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <option value="">Start a conversation…</option>
                    {people
                      .filter(p => p.email !== user?.email)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || p.email}
                        </option>
                      ))}
                  </select>

                  <button
                    className="primary-button"
                    disabled={!newChatPerson || busy}
                  >
                    New
                  </button>
                </form>

                {conversations.map(c => (
                  <button
                    key={c.conversation_id}
                    className="text-button"
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      padding: 12
                    }}
                    onClick={() =>
                      c.conversation_id &&
                      openConversation(c.conversation_id)
                    }
                  >
                    {c.conversations?.title || 'Direct conversation'}
                  </button>
                ))}

                {!conversations.length && (
                  <Empty
                    title="No conversations yet"
                    text="Start a conversation with an employee."
                  />
                )}
              </section>

              <section className="panel">
                <PanelHead
                  title="Messages"
                  subtitle="Conversation history"
                />

                {selectedConversation ? (
                  <>
                    <div
                      style={{
                        minHeight: 240,
                        maxHeight: 380,
                        overflowY: 'auto'
                      }}
                    >
                      {messages.map(m => (
                        <p
                          key={m.id}
                          style={{
                            padding: 10,
                            background: '#f4f7fc',
                            borderRadius: 9
                          }}
                        >
                          {m.body}
                          <small
                            style={{
                              display: 'block',
                              color: '#8290a5'
                            }}
                          >
                            {m.created_at
                              ? new Date(m.created_at).toLocaleString()
                              : ''}
                          </small>
                        </p>
                      ))}
                    </div>

                    <form
                      onSubmit={sendMessage}
                      style={{ display: 'flex', gap: 8 }}
                    >
                      <input
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        placeholder="Write a message…"
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <button
                        className="primary-button"
                        disabled={!messageText.trim() || busy}
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </>
                ) : (
                  <Empty
                    title="Select a conversation"
                    text="Choose a conversation to read and send messages."
                  />
                )}
              </section>
            </div>
          )}

          {active === 'Analytics' && (
            <section className="panel">
              <PanelHead
                title="Workspace analytics"
                subtitle="Counts based on actual workspace records"
              />

              <div className="metric-grid">
                <Metric
                  label="Employees"
                  value={String(analytics?.staff ?? '—')}
                  hint="Approved profiles"
                  icon={<Users />}
                />
                <Metric
                  label="All tasks"
                  value={String(analytics?.allTasks ?? '—')}
                  hint="Recorded tasks"
                  icon={<FileText />}
                />
                <Metric
                  label="Completed"
                  value={String(analytics?.doneTasks ?? '—')}
                  hint="Completed tasks"
                  icon={<BarChart3 />}
                />
              </div>
            </section>
          )}

          {active === 'Notifications' && (
            <section className="panel">
              <PanelHead
                title="Notifications"
                subtitle="Task and conversation updates"
              />
              <NotificationList
                items={notifications}
                onRead={action}
              />
            </section>
          )}

          {active === 'Admin' && (
            <section className="panel">
              <PanelHead
                title="Administrator console"
                subtitle="Review employee access requests"
              />

              {admin?.pending?.length ? (
                admin.pending.map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: 14,
                      borderBottom: '1px solid #e6ebf3'
                    }}
                  >
                    <span>
                      <b>{p.full_name || p.email}</b>
                      <small style={{ display: 'block' }}>
                        {p.email}
                      </small>
                    </span>

                    <span>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          action({
                            action: 'admin_review',
                            employee_id: p.id,
                            decision: 'approve'
                          })
                        }
                      >
                        Approve
                      </button>

                      <button
                        className="more-button"
                        disabled={busy}
                        onClick={() =>
                          action({
                            action: 'admin_review',
                            employee_id: p.id,
                            decision: 'reject'
                          })
                        }
                      >
                        Reject
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <Empty
                  title="No pending requests"
                  text="New employee access requests will appear here."
                />
              )}
            </section>
          )}

          <footer className="page-footer">
            Trinetray Workspace
            <span>•</span>
            A focused place to get work done
          </footer>
        </div>
      </section>

      {showCreate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#071a4b66',
            display: 'grid',
            placeItems: 'center',
            zIndex: 20,
            padding: 18
          }}
        >
          <form
            className="auth-card"
            onSubmit={createTask}
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 16,
              width: 'min(100%, 520px)',
              boxShadow: '0 20px 60px #071a4b30'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2>New task</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
              >
                <X />
              </button>
            </div>

            <label>
              Task title
              <input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                required
                maxLength={180}
              />
            </label>

            <label>
              Description
              <input
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
                maxLength={5000}
              />
            </label>

            <label>
              Assign to
              <select
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                required
              >
                <option value="">Select another employee</option>
                {people
                  .filter(p => p.id && p.email !== user?.email)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
              </select>
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12
              }}
            >
              <label>
                Priority
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </label>

              <label>
                Visibility
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value)}
                >
                  <option value="private">Private</option>
                  <option value="department">Department</option>
                  <option value="company">Company</option>
                </select>
              </label>
            </div>

            <label>
              Due date
              <input
                type="datetime-local"
                value={dueAt}
                onChange={e => setDueAt(e.target.value)}
              />
            </label>

            <button
              className="primary-button full"
              disabled={busy || !taskTitle.trim() || !assignee}
            >
              Create task
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
  hint,
  icon
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function PanelHead({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle: string;
  action?: () => void;
}) {
  return (
    <div className="panel-head">
      <div>
        <h3>{title}</h3>
        <p className="muted">{subtitle}</p>
      </div>
      {action && (
        <button className="text-button" onClick={action}>
          View all
        </button>
      )}
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <FileText size={22} />
      </div>
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}

function TaskList({
  tasks,
  onUpdate
}: {
  tasks: Item[];
  profileId?: string | null;
  onUpdate: (value: ActionBody) => Promise<boolean>;
}) {
  return tasks.length ? (
    <div>
      {tasks.map(t => (
        <article
          key={t.id}
          style={{
            padding: '14px 4px',
            borderBottom: '1px solid #e6ebf3',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center'
          }}
        >
          <div>
            <b>{t.title}</b>
            <small style={{ display: 'block', color: '#8290a5' }}>
              {t.status} · {t.priority} · {t.visibility}
              {t.due_at
                ? ' · Due ' + new Date(t.due_at).toLocaleDateString()
                : ''}
            </small>
            {t.description && <small>{t.description}</small>}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {t.status !== 'completed' && (
              <button
                className="text-button"
                onClick={() =>
                  onUpdate({
                    action: 'update_task',
                    id: t.id,
                    status: 'completed'
                  })
                }
              >
                <CheckCircle2 size={15} /> Complete
              </button>
            )}

            {t.status === 'completed' && (
              <button
                className="text-button"
                onClick={() =>
                  onUpdate({
                    action: 'update_task',
                    id: t.id,
                    status: 'pending'
                  })
                }
              >
                <RotateCcw size={15} /> Reopen
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  ) : (
    <Empty
      title="No tasks yet"
      text="Tasks will appear here when you create or receive them."
    />
  );
}

function NotificationList({
  items,
  onRead
}: {
  items: Item[];
  onRead: (value: ActionBody) => Promise<boolean>;
}) {
  return items.length ? (
    <div>
      {items.map(n => (
        <article
          key={n.id}
          style={{
            padding: 12,
            borderBottom: '1px solid #e6ebf3'
          }}
        >
          <b>{n.title}</b>
          <p>{n.message}</p>
          <small>
            {n.created_at
              ? new Date(n.created_at).toLocaleString()
              : ''}
          </small>

          {!n.read_at && (
            <button
              className="text-button"
              onClick={() =>
                onRead({
                  action: 'mark_notification_read',
                  id: n.id
                })
              }
            >
              Mark read
            </button>
          )}
        </article>
      ))}
    </div>
  ) : (
    <Empty
      title="You're all caught up"
      text="New task and message notifications will appear here."
    />
  );
}
