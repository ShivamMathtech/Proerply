import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Compass,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Target,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { useWorkspace, useAction, services, MODE } from "../hooks";
import { Avatar, Toast, Button } from "./ui";
import { persistenceWarning } from "../services/demo";
const nav = [
  ["/home", "Overview", LayoutDashboard],
  ["/explore", "Explore courses", Compass],
  ["/my-learning", "My learning", BookOpen],
  ["/reminders", "My reminders", CalendarDays],
  ["/chat", "Messages", MessageSquare],
  ["/achievements", "Achievements", Trophy],
] as const;
export default function Layout() {
  const { data } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const loc = useLocation(),
    navigate = useNavigate(),
    act = useAction();
  const user = data?.user;
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  useEffect(() => {
    if (
      !user?.notifications ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    const sent = new Set<string>();
    const check = () => {
      for (const r of data?.reminders || [])
        if (
          !r.completed &&
          Date.parse(r.dueAt) <= Date.now() &&
          Date.parse(r.dueAt) > Date.now() - 60000 &&
          !sent.has(r.id)
        ) {
          new Notification(r.title, { body: r.description, tag: r.id });
          sent.add(r.id);
        }
    };
    check();
    const timer = setInterval(check, 15000);
    return () => clearInterval(timer);
  }, [data?.reminders, user?.notifications]);
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        className={`sidebar ${open ? "open" : ""}`}
      >
        <Link to="/home" className="brand">
          <span className="brand-mark">p</span>proerply
          <span className="brand-dot">.</span>
        </Link>
        <div className="workspace-label">YOUR LEARNING SPACE</div>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink to={to} key={to}>
              <Icon size={20} />
              {label}
              {to === "/chat" &&
                !!data?.conversations.some((c) =>
                  c.messages.some((m) => !m.read),
                ) && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-box">
            <span className="upgrade-icon">✦</span>
            <h3>A little more ambition?</h3>
            <p>Find your next learning path.</p>
            <Link to="/pricing">
              Explore learning options <ChevronRight size={14} />
            </Link>
          </div>
          {user?.role !== "learner" && user && (
            <NavLink className="settings-link" to="/admin">
              <Shield size={18} />
              {user.role === "admin" ? "Admin studio" : "Instructor studio"}
            </NavLink>
          )}
          <Link to="/profile" className="settings-link">
            <Settings size={18} />
            Settings & profile
          </Link>
          <Link to="/screens" className="screen-link">
            Screen directory · 41 screens
          </Link>
          <div className="sidebar-profile">
            <Avatar name={user?.name || "Guest"} />
            <div>
              <strong>{user?.name || "Guest learner"}</strong>
              <span>{user?.role || "Explore your potential"}</span>
            </div>
            {user ? (
              <button
                className="icon-btn"
                aria-label="Sign out"
                onClick={() =>
                  act(async () => {
                    await services.auth.logout();
                    navigate("/login");
                  })
                }
              >
                <LogOut size={16} />
              </button>
            ) : (
              <Link to="/login">Sign in</Link>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-start">
            <button
              className="icon-btn menu-btn"
              aria-label="Open navigation"
              aria-expanded={open}
              aria-controls="workspace-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              My workspace <ChevronRight size={14} />
              <strong>
                {nav.find(([to]) => loc.pathname.startsWith(to))?.[1] ||
                  "Learning journey"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <form
              className="top-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate("/results?q=" + encodeURIComponent(q));
              }}
            >
              <Search size={17} />
              <input
                aria-label="Search all courses"
                placeholder="Search anything to learn…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            {MODE === "demo" && <span className="demo-chip">DEMO MODE</span>}
            <Link
              to="/notifications"
              className="icon-btn notification-icon"
              aria-label="Notification settings"
            >
              <Bell size={20} />
              <i />
            </Link>
            <Link to="/profile">
              <Avatar
                name={user?.name || "Guest"}
                src={user?.avatar}
                size="sm"
              />
            </Link>
          </div>
        </header>
        {persistenceWarning && (
          <div className="warning-banner">{persistenceWarning}</div>
        )}
        <main id="main" className="main-content">
          <Outlet />
        </main>
        <footer className="footer">
          <span>
            © {new Date().getFullYear()} Proerply. Learn today. Build tomorrow.
          </span>
          <Link to="/about">About this experience</Link>
        </footer>
      </div>
      <nav className="bottom-nav">
        {nav.slice(0, 5).map(([to, label, Icon]) => (
          <NavLink key={to} to={to}>
            <Icon size={20} />
            <span>
              {label === "Explore courses"
                ? "Explore"
                : label === "My learning"
                  ? "Learn"
                  : label === "My reminders"
                    ? "Reminders"
                    : label}
            </span>
          </NavLink>
        ))}
      </nav>
      <Toast />
    </div>
  );
}
