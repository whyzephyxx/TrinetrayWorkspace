const features = [
  {
    number: "01",
    title: "Tasks with context",
    description:
      "Keep assignments, priorities, due dates and progress updates together.",
    icon: "↗",
  },
  {
    number: "02",
    title: "Conversations",
    description:
      "A dedicated place for team messages, group discussions and shared files.",
    icon: "✳",
  },
  {
    number: "03",
    title: "Team directory",
    description:
      "Find approved teammates and the work details needed to collaborate.",
    icon: "⌘",
  },
];

const highlights = [
  ["Clear ownership", "Know who assigned a task and who is responsible for it."],
  ["Useful reminders", "Keep unfinished work visible without losing its history."],
  ["Privacy by design", "Make access depend on approval, role and task visibility."],
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#" aria-label="Trinetray Workspace home">
          <span className="brand-mark">T</span>
          <span>trinetray<span className="brand-light"> workspace</span></span>
        </a>
        <a className="nav-link" href="#overview">Explore workspace <span aria-hidden="true">↗</span></a>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> WORK, CONNECT, MOVE FORWARD</div>
          <h1>Good work<br /><span>moves together.</span></h1>
          <p className="hero-description">
            A focused workspace concept bringing tasks, team conversations
            and everyday collaboration into one clear place.
          </p>
          <a className="primary-button" href="#overview">Discover the workspace <span aria-hidden="true">→</span></a>
          <p className="hero-note">A concept preview — workspace features are still being built.</p>
        </div>

        <div className="preview-wrap" aria-label="Illustrative workspace dashboard preview">
          <div className="preview-glow" />
          <div className="dashboard">
            <div className="dash-top">
              <div className="dash-brand"><span className="mini-mark">T</span> Workspace</div>
              <div className="avatar">W</div>
            </div>
            <div className="dash-greeting">
              <span className="dash-kicker">YOUR OVERVIEW</span>
              <h2>Make today count.</h2>
              <p>Everything important, in one view.</p>
            </div>
            <div className="stats">
              <div className="stat-card"><span>MY TASKS</span><strong>08</strong><small>Across your workspace</small></div>
              <div className="stat-card"><span>IN PROGRESS</span><strong>03</strong><small>Keep the momentum</small></div>
            </div>
            <div className="task-panel">
              <div className="panel-heading"><strong>Priority tasks</strong><span>Preview</span></div>
              <div className="task-row"><i className="task-check" /><div><b>Prepare weekly update</b><small>Today · High priority</small></div><span className="task-tag">In progress</span></div>
              <div className="task-row"><i className="task-check done">✓</i><div><b>Review project notes</b><small>Completed · Yesterday</small></div><span className="task-tag muted">Done</span></div>
            </div>
            <div className="dash-bottom"><span><i /> Team workspace</span><span>Designed for focus</span></div>
          </div>
          <div className="floating-chip"><span className="chip-icon">✦</span><span><b>One shared space</b><small>Tasks · Messages · Updates</small></span></div>
        </div>
      </section>

      <section className="overview shell" id="overview">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE WORKSPACE</div>
            <h2>Less scattered.<br /><span>More connected.</span></h2>
          </div>
          <p>Bring the everyday parts of teamwork closer together, with a thoughtful experience across desktop and mobile.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <div className="feature-top"><span>{feature.number}</span><span className="feature-icon">{feature.icon}</span></div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="feature-line" />
            </article>
          ))}
        </div>
      </section>

      <section className="principles">
        <div className="shell principles-inner">
          <div>
            <div className="eyebrow light-eyebrow">BUILT AROUND THE WAY TEAMS WORK</div>
            <h2>Clarity in the details.<br /><span>Confidence in the flow.</span></h2>
          </div>
          <div className="principle-list">
            {highlights.map(([title, description]) => (
              <div className="principle" key={title}>
                <span className="principle-check">✓</span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer shell">
        <a className="brand footer-brand" href="#"><span className="brand-mark">T</span><span>trinetray<span className="brand-light"> workspace</span></span></a>
        <p>Independent employee-initiated concept. Not an official company service or endorsement.</p>
        <span className="copyright">© {new Date().getFullYear()} Workspace concept</span>
      </footer>
    </main>
  );
}
