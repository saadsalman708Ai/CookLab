import { useState } from "react";
import "./App.css";

type SectionId =
  | "project"
  | "footage"
  | "theme"
  | "captions"
  | "music"
  | "graphics"
  | "history"
  | "settings";

type Appearance = "light" | "dark";

type Section = {
  id: SectionId;
  label: string;
  description: string;
  icon: string;
};

const appearanceStorageKey = "cooklab-appearance";

const sections: Section[] = [
  {
    id: "project",
    label: "Project",
    description: "Your video workspace and project overview.",
    icon: "project",
  },
  {
    id: "footage",
    label: "Footage",
    description: "Review and organize the clips for your story.",
    icon: "footage",
  },
  {
    id: "theme",
    label: "Theme",
    description: "Choose the visual direction for your video.",
    icon: "theme",
  },
  {
    id: "captions",
    label: "Captions",
    description: "Set up readable captions timed to the narration.",
    icon: "captions",
  },
  {
    id: "music",
    label: "Music",
    description: "Shape the soundtrack around your voiceover.",
    icon: "music",
  },
  {
    id: "graphics",
    label: "Graphics",
    description: "Plan supporting titles and motion graphics.",
    icon: "graphics",
  },
  {
    id: "history",
    label: "History",
    description: "Review recent project activity and completed work.",
    icon: "history",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Adjust CookLab's local interface preferences.",
    icon: "settings",
  },
];

function readAppearance(): Appearance {
  try {
    const stored = window.localStorage.getItem(appearanceStorageKey);
    return stored === "dark" || stored === "light" ? stored : "light";
  } catch {
    return "light";
  }
}

function SectionIcon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    project: "M3.5 6.5h6l2 2h9v9.5h-17z M3.5 6.5v-2h6l2 2",
    footage: "M4 5.5h16v13H4z M8 5.5v13 M16 5.5v13 M4 9h4 M16 9h4 M4 15h4 M16 15h4",
    theme: "M12 3.5a8.5 8.5 0 1 0 0 17h1.2a2 2 0 0 0 1.2-3.4 1.6 1.6 0 0 1 1.2-2.7H18a2.5 2.5 0 0 0 2.5-2.5c0-4.6-3.8-8.4-8.5-8.4Z M7.5 11h.01 M9.5 7.5h.01 M14.5 7.5h.01 M16.5 11h.01",
    captions: "M4 5h16v14H4z M7 9h10 M7 12h7 M7 15h9",
    music: "M9 18V5l11-2v13 M9 8l11-2 M6 21a3 2 0 1 0 0-4 3 2 0 0 0 0 4ZM17 18a3 2 0 1 0 0-4 3 2 0 0 0 0 4Z",
    graphics: "M12 3.5 14.6 9l5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1L9.4 9z",
    history: "M4 11a8 8 0 1 1 2.2 5.5 M4 5v6h6 M12 7v5l3 2",
    settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M19 13.5a7.4 7.4 0 0 0 0-3l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L13.6 2h-4l-.4 3.1a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 3.1h4l.4-3.1a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z",
    bell: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    check: "m5 12 4 4L19 6",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
    moon: "M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z",
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d={paths[name] ?? paths.project} />
    </svg>
  );
}

function SectionPlaceholder({ section }: { section: Section }) {
  return (
    <div className="section-content">
      <div className="section-heading">
        <span className="section-icon-large">
          <SectionIcon name={section.icon} size={22} />
        </span>
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h2>{section.label}</h2>
          <p className="section-description">{section.description}</p>
        </div>
      </div>
      <section className="empty-state-card" aria-labelledby="empty-state-title">
        <span className="empty-state-mark">
          <SectionIcon name={section.icon} size={24} />
        </span>
        <h3 id="empty-state-title">{section.label} tools are coming later</h3>
        <p>
          This area is part of the CookLab workspace. Its project tools are not
          implemented yet.
        </p>
        <span className="planned-label">
          <span className="status-dot" /> Planned for a future phase
        </span>
      </section>
    </div>
  );
}

function ProjectHome({ onNavigate }: { onNavigate: (section: SectionId) => void }) {
  const shortcuts = sections.filter((section) =>
    ["footage", "theme", "captions"].includes(section.id),
  );

  return (
    <div className="section-content project-content">
      <section className="project-intro" aria-labelledby="project-title">
        <p className="eyebrow">YOUR CREATIVE WORKSPACE</p>
        <h2 id="project-title">Make room for the story.</h2>
        <p>
          CookLab will help you prepare a video project, review its creative
          choices, and bring each part together in one workspace.
        </p>
        <div className="development-note">
          <span className="development-indicator" />
          <span>App shell in development</span>
          <span className="note-divider" aria-hidden="true" />
          <span>Project tools are being built in stages</span>
        </div>
      </section>

      <div className="section-title-row">
        <div>
          <p className="eyebrow">WORKSPACE GUIDE</p>
          <h3>Start with the building blocks</h3>
        </div>
        <span className="guide-caption">Choose a section to explore</span>
      </div>

      <div className="shortcut-grid">
        {shortcuts.map((section, index) => (
          <button
            className="shortcut-card"
            key={section.id}
            onClick={() => onNavigate(section.id)}
            type="button"
          >
            <span className={`shortcut-icon shortcut-icon-${index + 1}`}>
              <SectionIcon name={section.icon} size={19} />
            </span>
            <span className="shortcut-card-copy">
              <span className="shortcut-title">{section.label}</span>
              <span className="shortcut-description">
                {section.id === "footage" && "Plan the clips your story needs."}
                {section.id === "theme" && "Set a visual direction."}
                {section.id === "captions" && "Prepare text for spoken words."}
              </span>
            </span>
            <SectionIcon name="arrow" size={17} />
          </button>
        ))}
      </div>

      <section className="workflow-card" aria-labelledby="workflow-title">
        <div className="workflow-heading">
          <span className="workflow-mark">
            <SectionIcon name="project" size={18} />
          </span>
          <div>
            <p className="eyebrow">THE COOKLAB FLOW</p>
            <h3 id="workflow-title">A thoughtful process, from plan to picture</h3>
          </div>
        </div>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span className="step-number">01</span>
            <div>
              <strong>Prepare</strong>
              <p>Bring a project plan into the workspace.</p>
            </div>
          </div>
          <div className="workflow-connector" aria-hidden="true" />
          <div className="workflow-step">
            <span className="step-number">02</span>
            <div>
              <strong>Review</strong>
              <p>Shape the media and creative choices.</p>
            </div>
          </div>
          <div className="workflow-connector" aria-hidden="true" />
          <div className="workflow-step">
            <span className="step-number">03</span>
            <div>
              <strong>Produce</strong>
              <p>Bring the approved pieces together.</p>
            </div>
          </div>
        </div>
        <p className="workflow-footnote">
          Import, media, and video production features are not available yet.
        </p>
      </section>
    </div>
  );
}

function Settings({
  appearance,
  onAppearanceChange,
}: {
  appearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
}) {
  return (
    <div className="section-content">
      <div className="section-heading settings-heading">
        <span className="section-icon-large">
          <SectionIcon name="settings" size={22} />
        </span>
        <div>
          <p className="eyebrow">PREFERENCES</p>
          <h2>Settings</h2>
          <p className="section-description">
            Make the CookLab workspace comfortable to use.
          </p>
        </div>
      </div>

      <section className="settings-card" aria-labelledby="appearance-title">
        <div className="settings-card-heading">
          <div>
            <h3 id="appearance-title">Appearance</h3>
            <p>Choose a light or dark look for this device.</p>
          </div>
          <span className="settings-current">
            {appearance === "dark" ? "Dark" : "Light"} theme
          </span>
        </div>
        <div className="appearance-options" role="group" aria-label="Appearance">
          {(["light", "dark"] as const).map((option) => (
            <button
              aria-pressed={appearance === option}
              className={`appearance-option${appearance === option ? " selected" : ""}`}
              key={option}
              onClick={() => onAppearanceChange(option)}
              type="button"
            >
              <span className={`appearance-preview preview-${option}`}>
                <span />
                <span />
                <span />
              </span>
              <span className="appearance-option-copy">
                <SectionIcon name={option === "light" ? "sun" : "moon"} size={17} />
                <span>{option === "light" ? "Light" : "Dark"}</span>
              </span>
              {appearance === option && (
                <span className="appearance-check">
                  <SectionIcon name="check" size={15} />
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="settings-footnote">
          This preference is saved locally in this app. Project settings will be
          handled separately in a future phase.
        </p>
      </section>

      <section className="settings-note-card" aria-label="More settings">
        <span className="settings-note-icon">
          <SectionIcon name="settings" size={18} />
        </span>
        <div>
          <h3>More settings are planned</h3>
          <p>
            Project folders, media tools, and production preferences will be
            added as those features are developed.
          </p>
        </div>
        <span className="planned-label">Coming later</span>
      </section>
    </div>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>("project");
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const currentSection = sections.find((section) => section.id === activeSection)!;

  function changeAppearance(nextAppearance: Appearance) {
    setAppearance(nextAppearance);
    try {
      window.localStorage.setItem(appearanceStorageKey, nextAppearance);
    } catch {
      // The theme still applies for this session when storage is unavailable.
    }
  }

  function navigateTo(section: SectionId) {
    setActiveSection(section);
    setNotificationsOpen(false);
  }

  return (
    <div className="app-shell" data-theme={appearance}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-copy">
            <strong>CookLab</strong>
            <span>VIDEO WORKSPACE</span>
          </span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-navigation" aria-label="Workspace sections">
          {sections.map((section) => (
            <button
              aria-current={activeSection === section.id ? "page" : undefined}
              className={`navigation-item${activeSection === section.id ? " active" : ""}`}
              key={section.id}
              onClick={() => navigateTo(section.id)}
              title={section.label}
              type="button"
            >
              <SectionIcon name={section.icon} />
              <span>{section.label}</span>
              {activeSection === section.id && <span className="active-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-mark">
            <SectionIcon name="check" size={14} />
          </span>
          <span>
            <strong>Workspace shell</strong>
            <small>Early development</small>
          </span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>CookLab</span>
            <span className="breadcrumb-divider" aria-hidden="true">/</span>
            <strong>{currentSection.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="build-label"><span />Shell preview</span>
            <div className="notification-wrap">
              <button
                aria-expanded={notificationsOpen}
                aria-haspopup="dialog"
                aria-label="Notifications"
                className={`notification-button${notificationsOpen ? " pressed" : ""}`}
                onClick={() => setNotificationsOpen((open) => !open)}
                type="button"
              >
                <SectionIcon name="bell" size={19} />
              </button>
              {notificationsOpen && (
                <section
                  aria-labelledby="notifications-title"
                  className="notification-popover"
                  role="dialog"
                >
                  <div className="notification-popover-heading">
                    <div>
                      <p className="eyebrow">UPDATES</p>
                      <h2 id="notifications-title">Notifications</h2>
                    </div>
                    <button
                      aria-label="Close notifications"
                      className="popover-close"
                      onClick={() => setNotificationsOpen(false)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                  <div className="notification-empty">
                    <span><SectionIcon name="bell" size={20} /></span>
                    <strong>You’re all caught up</strong>
                    <p>There are no notifications right now.</p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </header>

        <main className="main-content" id="main-content" tabIndex={-1}>
          {activeSection === "project" ? (
            <ProjectHome onNavigate={navigateTo} />
          ) : activeSection === "settings" ? (
            <Settings appearance={appearance} onAppearanceChange={changeAppearance} />
          ) : (
            <SectionPlaceholder section={currentSection} />
          )}
          <footer className="content-footer">
            <span>CookLab workspace preview</span>
            <span>Features are being introduced in stages</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
