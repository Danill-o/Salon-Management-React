import { useCallback, useEffect, useRef, useState } from "react";
import { KEYS } from "../../lib/storage.js";
import { DEFAULT_ADMIN, hasAdminAccount, hasValidAdminSession, loginAdmin, seedDefaultAdmin, setupAdmin, signOutAdmin } from "../../lib/adminAuth.js";
import { buildCustomerDirectory, readServices, readSettings, readStaff, seedInventory } from "../../lib/adminData.js";
import { seedSampleData } from "../../lib/sampleData.js";
import { useStored } from "../../hooks.js";
import { AdminContext } from "./ui.jsx";

// Seed sample data for admin tables if missing
seedSampleData();
import Overview from "./Overview.jsx";
import Bookings from "./Bookings.jsx";
import Customers from "./Customers.jsx";
import Staff from "./Staff.jsx";
import Permissions from "./Permissions.jsx";
import Services from "./Services.jsx";
import Inventory from "./Inventory.jsx";
import Payments from "./Payments.jsx";
import Expenses from "./Expenses.jsx";
import Analytics from "./Analytics.jsx";
import Reports from "./Reports.jsx";
import Reviews from "./Reviews.jsx";
import Notifications from "./Notifications.jsx";
import Settings from "./Settings.jsx";
import "./admin.css";

const VIEWS = [
  ["overview", "Dashboard", Overview],
  ["appointments", "Bookings", Bookings],
  ["customers", "Customers", Customers],
  ["staff", "Employees", Staff],
  ["permissions", "Access & permissions", Permissions],
  ["services", "Services", Services],
  ["inventory", "Products", Inventory],
  ["payments", "Payments", Payments],
  ["expenses", "Expenses", Expenses],
  ["analytics", "Analytics", Analytics],
  ["reports", "Reports", Reports],
  ["reviews", "Reviews", Reviews],
  ["notifications", "Notifications", Notifications],
  ["settings", "Settings", Settings]
];

export default function Admin() {
  const [unlocked, setUnlocked] = useState(hasValidAdminSession);

  useEffect(() => {
    const previous = document.title;
    document.title = "Salon Management | Admin Dashboard";
    return () => { document.title = previous; };
  }, []);

  // Another tab signing out (or the session expiring) locks this one.
  useEffect(() => {
    const onStorage = event => event.key === KEYS.adminSession && !hasValidAdminSession() && setUnlocked(false);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="admin-app">
      {unlocked
        ? <Shell onSignOut={() => { signOutAdmin(); setUnlocked(false); }} />
        : <Gate onUnlock={() => setUnlocked(true)} />}
    </div>
  );
}

function Gate({ onUnlock }) {
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState({ text: `Default admin login: ${DEFAULT_ADMIN.email} / ${DEFAULT_ADMIN.password}` });
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState({ email: DEFAULT_ADMIN.email, password: DEFAULT_ADMIN.password });

  useEffect(() => {
    seedDefaultAdmin().catch(() => setMessage({ text: "Unable to create the default admin account in this browser.", error: true }));
  }, []);

  const run = async action => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setMessage({ text: error.message, error: true });
      setBusy(false);
    }
  };

  const login = event => {
    event.preventDefault();
    run(async () => {
      await loginAdmin(creds);
      onUnlock();
    });
  };

  const setup = event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    run(async () => {
      await setupAdmin(values);
      onUnlock();
    });
  };

  const restore = () => run(async () => {
    const credential = await seedDefaultAdmin(true);
    setCreds({ email: credential.email, password: DEFAULT_ADMIN.password });
    setMessage({ text: "Default admin login restored. Sign in with the displayed credentials." });
    setBusy(false);
  });

  return (
    <div className="admin-gate">
      <div className="admin-gate-card">
        <a className="admin-gate-brand" href="#/" aria-label="Salon Management home">
          <span className="brand-mark">S</span><span>Salon Management</span>
        </a>
        <p className="eyebrow">Restricted workspace</p>
        <h1>{mode === "login" ? "Admin access" : "Create admin account"}</h1>
        {mode === "login" && <p className="admin-gate-copy">Sign in to manage appointments, staff and salon operations.</p>}
        {mode === "login" ? (
          <form onSubmit={login} className="stack">
            <div className="field"><label htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" required value={creds.email} onChange={e => setCreds({ ...creds, email: e.target.value })} /></div>
            <div className="field"><label htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" required value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })} /></div>
            <button className="btn btn-primary" type="submit" disabled={busy}>Sign in</button>
            <button className="btn btn-outline" type="button" onClick={restore} disabled={busy}>Restore default login</button>
            {!hasAdminAccount() && (
              <button className="link-btn" type="button" onClick={() => { setMode("setup"); setMessage({ text: "" }); }}>Create admin account</button>
            )}
          </form>
        ) : (
          <form onSubmit={setup} className="stack">
            <div className="field"><label htmlFor="setup-name">Name</label><input id="setup-name" name="name" required minLength={2} /></div>
            <div className="field"><label htmlFor="setup-email">Email</label><input id="setup-email" name="email" type="email" required /></div>
            <div className="field"><label htmlFor="setup-password">Password</label><input id="setup-password" name="password" type="password" required minLength={10} /></div>
            <button className="btn btn-primary" type="submit" disabled={busy}>Create account</button>
            <button className="link-btn" type="button" onClick={() => { setMode("login"); setMessage({ text: "" }); }}>Back to sign in</button>
          </form>
        )}
        {message.text && <p className={`form-message${message.error ? " is-error" : ""}`} role="status">{message.text}</p>}
        <p className="form-note">A browser-side convenience gate, not server authentication. <a href="#/">Back to the salon site</a></p>
      </div>
    </div>
  );
}

function Shell({ onSignOut }) {
  const [view, setView] = useState("overview");
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef();

  const [appointments, setAppointments] = useStored(KEYS.appointments);
  const [services, setServices] = useStored(KEYS.services, readServices);
  const [staff, setStaff] = useStored(KEYS.staff, readStaff);
  const [products, setProducts] = useStored(KEYS.products);
  const [payments, setPayments] = useStored(KEYS.payments);
  const [expenses, setExpenses] = useStored(KEYS.expenses);
  const [accounts, setAccounts] = useStored(KEYS.users);
  const [adminCustomers, setAdminCustomers] = useStored(KEYS.adminCustomers);
  const [reviews, setReviews] = useStored(KEYS.reviews);
  const [movements, setMovements] = useStored(KEYS.stockMovements);
  const [settings, setSettings] = useStored(KEYS.settings, readSettings);
  const bookingCount = appointments.filter(item => item.status === "booked").length;

  useEffect(seedInventory, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback(message => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const goTo = useCallback(next => {
    setView(next);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const query = search.trim().toLowerCase();
  const visible = VIEWS.filter(([, label]) => !query || label.toLowerCase().includes(query));
  useEffect(() => {
    if (query && visible.length === 1) setView(visible[0][0]);
  }, [query, visible.length]);

  const context = {
    appointments, setAppointments, services, setServices, staff, setStaff, products, setProducts,
    payments, setPayments, expenses, setExpenses, accounts, setAccounts, adminCustomers, setAdminCustomers,
    reviews, setReviews, movements, setMovements, settings, setSettings, showToast, goTo,
    directory: buildCustomerDirectory(appointments, accounts, adminCustomers)
  };

  const [, label, View] = VIEWS.find(([id]) => id === view);

  return (
    <AdminContext.Provider value={context}>
      <div className="admin-shell">
        <aside className={`admin-side${navOpen ? " is-open" : ""}`}>
          <div className="admin-brand">
            <span className="brand-mark">S</span>
            <strong>{settings.name}</strong>
          </div>
          <input className="admin-search" type="search" placeholder="Search sections" aria-label="Search sections" value={search} onChange={e => setSearch(e.target.value)} />
          <nav aria-label="Admin sections">
            {visible.map(([id, text]) => (
              <button key={id} type="button" className={`admin-nav-item${view === id ? " is-active" : ""}`} aria-current={view === id ? "page" : undefined} onClick={() => goTo(id)}>
                {text}
                {id === "appointments" && bookingCount > 0 && <span className="count-badge">{bookingCount}</span>}
              </button>
            ))}
          </nav>
          <div className="admin-side-foot">
            <a href="#/stylist">Staff portal</a>
            <a href="#/">Salon site</a>
            <button type="button" className="btn btn-sm" onClick={onSignOut}>Sign out</button>
          </div>
        </aside>
        <div className="admin-main">
          <header className="admin-top">
            <button type="button" className="menu-btn" aria-label="Toggle sections menu" aria-expanded={navOpen} onClick={() => setNavOpen(open => !open)}>
              <span /><span /><span />
            </button>
            <strong>{label}</strong>
            <span className="meta">{new Date().toLocaleDateString("en-RW", { weekday: "short", month: "short", day: "numeric" })}</span>
          </header>
          <div className="admin-content">
            <View key={view} />
          </div>
        </div>
      </div>
      <div className={`toast${toast ? " is-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </AdminContext.Provider>
  );
}
