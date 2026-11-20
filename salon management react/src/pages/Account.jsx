import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "../components/Modal.jsx";
import CustomerBookingPage from "../components/CustomerBookingPage.jsx";
import { loginCustomer, registerCustomer, updateCustomerProfile } from "../lib/auth.js";
import { listEvents, publishEvent, showNotification } from "../lib/notifications.js";
import { KEYS, readList, writeJson } from "../lib/storage.js";
import { navigate } from "../hooks.js";
import QrCode from "../components/QrCode.jsx";
import "./AccountDashboard.css";
import {
  availableTimes, formatDate, formatPrice, formatTime, getFavorites, getServices, getSettings, getStylists,
  getBookableServices, loyaltySummary, localDate, ownedAppointments, ownedPayments, toggleFavorite,
  appointmentQrPayload, referralCodeFor
} from "../lib/salon.js";

const serviceById = id => getServices().find(service => service.id === id);
const sum = (items, pick) => items.reduce((total, item) => total + Number(pick(item) || 0), 0);
const isActive = item => ["booked", "confirmed"].includes(item.status) && item.date >= localDate();

const EVENT_LABELS = {
  "booking-created": "Booking received",
  "appointment-confirmed": "Appointment confirmed",
  "appointment-in-progress": "Service in progress",
  "appointment-rescheduled": "Appointment rescheduled",
  cancellation: "Appointment cancelled"
};

export default function Account({ customer, version, onAuthenticated, onCustomerChange, onLogout, onBook, initialServiceId, initialTab }) {
  if (!customer) return <div className="customer-page"><AuthPanel onAuthenticated={onAuthenticated} /></div>;
  return (
    <HueSuiteDashboard
      customer={customer}
      version={version}
      onCustomerChange={onCustomerChange}
      onLogout={onLogout}
      onBook={onBook}
      initialServiceId={initialServiceId}
      initialTab={initialTab}
    />
  );
}

function AuthPanel({ onAuthenticated }) {
  const pendingBooking = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(KEYS.pendingBooking) || "null"); } catch { return null; }
  }, []);
  const [mode, setMode] = useState(() => (pendingBooking?.customerName ? "register" : "login"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPassword, setDemoPassword] = useState("");

  const submit = async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    setBusy(true);
    try {
      const user = mode === "login" ? await loginCustomer(values) : await registerCustomer(values);
      onAuthenticated(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setMode("login");
    setError("");
    setDemoEmail("clarisse@gmail.com");
    setDemoPassword("Password123!");
  };

  return (
    <section className="customer-auth">
      <div className="account-layout">
        <div className="account-intro">
          <p className="eyebrow">Your salon account</p>
          <h1>Feel good.<br /><em>Keep it going.</em></h1>
          <p>Save your appointments, manage upcoming visits and keep track of your time at the salon.</p>
          {pendingBooking && (
            <p className="booking-login-notice" style={{
              background: "var(--gold-light)",
              border: "1px solid var(--gold-border)",
              padding: "0.8rem 1rem",
              borderRadius: "10px",
              color: "#8c6328",
              fontWeight: 600,
              fontSize: "0.9rem",
              marginTop: "1rem"
            }}>
              ✓ Sign in or create an account to finalize your booking. Your selected service and time will be kept.
            </p>
          )}
          <p className="account-storage-note">Your account is saved in this browser and is not synced between devices.</p>
          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(122, 62, 29, 0.08)", border: "1px dashed var(--gold-border)", borderRadius: "10px" }}>
            <strong style={{ display: "block", fontSize: "0.9rem", color: "#542a13", marginBottom: "4px" }}>Demo Customer Account:</strong>
            <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "#542a13" }}>Email: <code>clarisse@gmail.com</code> | Password: <code>Password123!</code></p>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ fontSize: "0.8rem", padding: "4px 10px" }}
              onClick={fillDemo}
            >
              ⚡ Quick Fill Demo Login
            </button>
          </div>
        </div>
        <div className="account-panel">
  <button type="button" className="btn btn-outline" onClick={() => navigate("/")}>Back to Home</button>
          <div className="account-tabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === "login"} className={`account-tab${mode === "login" ? " is-active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={`account-tab${mode === "register" ? " is-active" : ""}`} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
          </div>
          <form key={mode} className="account-form" onSubmit={submit}>
            <p className="eyebrow">{mode === "login" ? "Welcome back" : "A little more personal"}</p>
            <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
            {mode === "register" && (
              <>
                <Field label="Your name" name="name" required minLength={2} autoComplete="name" defaultValue={pendingBooking?.customerName || ""} />
                <Field label="Phone number" name="phone" type="tel" required minLength={7} autoComplete="tel" defaultValue={pendingBooking?.customerPhone || ""} />
                <Field label="Referral code (optional)" name="referralCode" autoComplete="off" />
              </>
            )}
            <Field
              label="Email address"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={demoEmail || undefined}
              onChange={e => setDemoEmail(e.target.value)}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 10 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              hint={mode === "register" ? "At least 10 characters. Use a password you do not use elsewhere." : undefined}
              value={demoPassword || undefined}
              onChange={e => setDemoPassword(e.target.value)}
            />
            {error && <p className="account-error" role="alert">{error}</p>}
            <button className="account-submit" type="submit" disabled={busy}>{mode === "login" ? "Sign in" : "Create account"} <span aria-hidden="true">→</span></button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({ label, hint, ...props }) {
  return (
    <div className="field">
      <label>{label}<input {...props} /></label>
      {hint && <small className="form-note">{hint}</small>}
    </div>
  );
}

function HueSuiteDashboard({ customer, version, onCustomerChange, onLogout, onBook, initialServiceId, initialTab }) {
  const [selectedServiceId, setSelectedServiceId] = useState(() => {
    if (initialServiceId) return initialServiceId;
    try {
      const pending = JSON.parse(sessionStorage.getItem(KEYS.pendingBooking) || "null");
      return pending?.serviceId || null;
    } catch {
      return null;
    }
  });

  const [tab, setTab] = useState(() => {
    if (initialTab) return initialTab;
    try {
      const pending = sessionStorage.getItem(KEYS.pendingBooking);
      if (pending) return "booking";
    } catch { /* ignore */ }
    return "overview";
  });

  const [filterMode, setFilterMode] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const timers = useRef(new Map());
  const toastTimer = useRef();

  useEffect(() => {
    const prev = document.title;
    document.title = "Salon Management | Customer Portal";
    return () => { document.title = prev; };
  }, []);

  const bump = useCallback(() => setRefresh(v => v + 1), []);
  const showToast = useCallback(text => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }, []);

  const handleStartBooking = useCallback((serviceId = null) => {
    if (serviceId) setSelectedServiceId(serviceId);
    setTab("booking");
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const data = useMemo(() => {
    const appointments = ownedAppointments(customer.id);
    const payments = ownedPayments(customer.id);
    return {
      appointments,
      payments,
      reviews: readList(KEYS.reviews),
      loyalty: loyaltySummary(customer.id),
      upcoming: appointments.filter(isActive),
      completed: appointments.filter(item => item.status === "completed"),
      cancelled: appointments.filter(item => item.status === "cancelled")
    };
  }, [customer.id, version, refresh]);

  // Notifications live listener
  useEffect(() => {
    const onStorage = event => {
      if (event.key === KEYS.notificationLog) bump();
      if (event.key !== KEYS.notificationEvent || !event.newValue) return;
      let update;
      try { update = JSON.parse(event.newValue); } catch { return; }
      if (update.customerId !== customer.id) return;
      const name = update.serviceName || "Your appointment";
      const when = update.date ? formatDate(update.date) : "";
      const messages = {
        cancellation: "Appointment was cancelled.",
        "appointment-confirmed": `Appointment on ${when} is confirmed.`,
        "appointment-rescheduled": `Appointment rescheduled to ${when} at ${formatTime(update.time)}.`
      };
      if (messages[update.type]) showToast(messages[update.type]);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [customer.id, bump, showToast]);

  const cancelAppointment = id => {
    const all = readList(KEYS.appointments);
    const appointment = all.find(item => item.id === id && item.customerId === customer.id);
    if (!appointment || !["booked", "confirmed"].includes(appointment.status)) return;
    if (!window.confirm("Cancel this appointment? The slot will become available again.")) return;
    appointment.status = "cancelled";
    appointment.cancelledAt = new Date().toISOString();
    writeJson(KEYS.appointments, all);
    const name = appointment.serviceName || serviceById(appointment.serviceId)?.name;
    publishEvent("cancellation", { appointmentId: id, customerId: customer.id, customerName: appointment.customer, stylist: appointment.stylist, serviceName: name, date: appointment.date, time: appointment.time });
    showNotification("Appointment cancelled", `${name || "Your appointment"} on ${formatDate(appointment.date)} was cancelled.`, `cancel-${id}`);
    showToast("Appointment cancelled.");
    bump();
  };

  const userInitials = useMemo(() => {
    if (!customer?.name) return "CL";
    return customer.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  }, [customer]);

  const totalSpent = useMemo(() => sum(data.payments, p => p.amount), [data.payments]);

  // Tab configurations matching Salon Management customer portal
  const sidebarItems = [
    { category: "RESERVATION" },
    { id: "booking", label: "BOOK APPOINTMENT", icon: <BookIcon />, isCta: true },
    { category: "GENERAL" },
    { id: "overview", label: "DASHBOARD", icon: <GridIcon /> },
    { id: "appointments", label: "MY APPOINTMENTS", icon: <CalendarIcon />, count: data.upcoming.length },
    { id: "history", label: "BOOKING HISTORY", icon: <HistoryIcon />, count: data.completed.length },
    { category: "SERVICES & PERKS" },
    { id: "services", label: "SERVICES & FAVORITES", icon: <ScissorsIcon /> },
    { id: "payments", label: "PAYMENT RECORDS", icon: <ReceiptIcon /> },
    { id: "notifications", label: "NOTIFICATIONS", icon: <BellIcon /> },
    { category: "ACCOUNT" },
    { id: "profile", label: "CLIENT PROFILE", icon: <UserIcon /> },
    { id: "help", label: "HELP & SUPPORT", icon: <HelpIcon /> }
  ];

  return (
    <div className="hs-dashboard-wrapper">
      {/* Sidebar */}
      <aside className={`hs-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="hs-sidebar-header">
          <a href="#/" className="hs-logo-wrap" onClick={e => { e.preventDefault(); navigate(""); }}>
            <span className="hs-logo-title">SALON <span>MANAGEMENT</span></span>
            <div className="hs-logo-gradient" />
          </a>
        </div>
        <nav className="hs-sidebar-nav" aria-label="Customer Navigation">
          {sidebarItems.map((item, idx) => {
            if (item.category) {
              return <div key={`cat-${idx}`} className="hs-nav-category">{item.category}</div>;
            }
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`hs-nav-btn${item.isCta ? " is-cta" : ""}${active ? " is-active" : ""}`}
                onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              >
                <span className="hs-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="hs-nav-badge">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="hs-sidebar-footer">
          <button type="button" className="hs-nav-btn" onClick={() => navigate("")}>
            <span className="hs-nav-icon"><HomeIcon /></span>
            <span>BACK TO SALON</span>
          </button>
          <button type="button" className="hs-nav-btn" style={{ color: "#ef4444" }} onClick={onLogout}>
            <span className="hs-nav-icon"><LogoutIcon /></span>
            <span>SIGN OUT</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="hs-main-container">
        {/* Topbar */}
        <header className="hs-topbar">
          <div className="hs-topbar-left">
            <button
              type="button"
              className="hs-menu-toggle"
              aria-label="Toggle menu"
              onClick={() => setSidebarOpen(o => !o)}
            >
              <MenuIcon />
            </button>
            <div className="hs-topbar-breadcrumb">
              <span style={{ color: "#94a3b8" }}>Client Workspace</span>
              <span>/</span>
              <span style={{ color: "#0f172a", fontWeight: 700 }}>
                {tab === "booking" ? "Book Appointment" : (sidebarItems.find(i => i.id === tab)?.label || "Dashboard")}
              </span>
            </div>
          </div>

          <div className="hs-topbar-right">
            <div className="hs-top-search">
              <span className="hs-top-search-icon"><SearchIcon /></span>
              <input
                type="text"
                placeholder="Search services, stylist, bookings..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <span className="hs-top-search-kbd">⌘K</span>
            </div>

            <button type="button" className="hs-btn-new" onClick={() => handleStartBooking()}>
              <span>+</span>
              <span>Book Appointment</span>
            </button>

            <button type="button" className="hs-top-icon-btn" onClick={() => setTab("notifications")} title="Notifications">
              <BellIcon />
              <span className="hs-top-dot-badge" />
            </button>

            <div
              className="hs-user-avatar"
              title={`${customer.name} (${customer.email})`}
              onClick={() => setTab("profile")}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="hs-content-canvas">
          {tab === "booking" ? (
            <CustomerBookingPage
              customer={customer}
              initialServiceId={selectedServiceId}
              onBookingSuccess={() => {
                bump();
                showToast("Appointment confirmed! Saved to My Appointments.");
                setTab("appointments");
              }}
              onGoToAppointments={() => {
                bump();
                setTab("appointments");
              }}
            />
          ) : (
            <>
              {/* Header Title + CTA */}
              <div className="hs-page-header">
                <div className="hs-page-title-group">
                  <div className="hs-title-icon-box">
                    {tab === "overview" && <GridIcon />}
                    {tab === "appointments" && <CalendarIcon />}
                    {tab === "history" && <HistoryIcon />}
                    {tab === "services" && <ScissorsIcon />}
                    {tab === "payments" && <ReceiptIcon />}
                    {tab === "notifications" && <BellIcon />}
                    {tab === "profile" && <UserIcon />}
                    {tab === "help" && <HelpIcon />}
                  </div>
                  <div>
                    <h1 className="hs-page-heading">
                      {tab === "overview" && "Appointments & Services"}
                      {tab === "appointments" && "My Appointments"}
                      {tab === "history" && "Booking History"}
                      {tab === "services" && "Services & Favorites"}
                      {tab === "payments" && "Payment Ledger"}
                      {tab === "notifications" && "Activity & Notifications"}
                      {tab === "profile" && "Personal Profile"}
                      {tab === "help" && "Help & Client Support"}
                      <span className="hs-heading-sub">
                        {tab === "overview" && `${data.appointments.length} total recorded bookings`}
                        {tab === "appointments" && `${data.upcoming.length} active sessions scheduled`}
                        {tab === "history" && `${data.completed.length} successfully completed`}
                        {tab === "services" && "Tailored menu & favorite stylists"}
                        {tab === "payments" && `${data.payments.length} receipts`}
                        {tab === "profile" && customer.email}
                      </span>
                    </h1>
                  </div>
                </div>

                <div className="hs-page-actions">
                  <button type="button" className="hs-btn-primary-dark" onClick={() => handleStartBooking()}>
                    <span>+ Book Service</span>
                  </button>
                  <button type="button" className="hs-btn-more" onClick={() => setTab("help")} title="Help">
                    ?
                  </button>
                </div>
              </div>

              {/* Sub-Tabs Pills (HueSuite style) */}
              <div className="hs-pill-tabs">
                <button
                  type="button"
                  className={`hs-pill-tab${tab === "overview" ? " is-active" : ""}`}
                  onClick={() => setTab("overview")}
                >
                  Overview
                  <span className="hs-pill-count">{data.appointments.length}</span>
                </button>
                <button
                  type="button"
                  className={`hs-pill-tab${tab === "appointments" ? " is-active" : ""}`}
                  onClick={() => setTab("appointments")}
                >
                  Appointments
                  <span className="hs-pill-count">{data.upcoming.length}</span>
                </button>
                <button
                  type="button"
                  className={`hs-pill-tab${tab === "history" ? " is-active" : ""}`}
                  onClick={() => setTab("history")}
                >
                  History
                  <span className="hs-pill-count">{data.completed.length}</span>
                </button>
                <button
                  type="button"
                  className={`hs-pill-tab${tab === "services" ? " is-active" : ""}`}
                  onClick={() => setTab("services")}
                >
                  Services &amp; Stylists
                </button>
                <button
                  type="button"
                  className={`hs-pill-tab${tab === "payments" ? " is-active" : ""}`}
                  onClick={() => setTab("payments")}
                >
                  Payments
                </button>
                <button
                  type="button"
                  className={`hs-pill-tab${tab === "notifications" ? " is-active" : ""}`}
                  onClick={() => setTab("notifications")}
                >
                  Notifications
                </button>
                <button
                  type="button"
                  className={`hs-pill-tab${tab === "profile" ? " is-active" : ""}`}
                  onClick={() => setTab("profile")}
                >
                  Profile
                </button>
              </div>

              {/* 4 Stat Cards Metric Row (HueSuite design) */}
              <section className="hs-stat-cards-grid" aria-label="Key Metrics">
                <div className="hs-stat-card">
                  <div className="hs-stat-value">{data.appointments.length}</div>
                  <div className="hs-stat-label">TOTAL BOOKINGS</div>
                </div>
                <div className="hs-stat-card">
                  <div className="hs-stat-value" style={{ color: "#16a34a" }}>{data.upcoming.length}</div>
                  <div className="hs-stat-label">UPCOMING SESSIONS</div>
                </div>
                <div className="hs-stat-card">
                  <div className="hs-stat-value">{data.loyalty.points}</div>
                  <div className="hs-stat-label">LOYALTY POINTS ({data.loyalty.discountPercent}% OFF)</div>
                </div>
                <div className="hs-stat-card">
                  <div className="hs-stat-value purple">{formatPrice(totalSpent)}</div>
                  <div className="hs-stat-label">TOTAL VALUE RECORDED</div>
                </div>
              </section>

              {/* Tab Renderers */}
              {tab === "overview" && (
                <HueOverviewTab
                  data={data}
                  customer={customer}
                  onBook={handleStartBooking}
                  goAppointments={() => setTab("appointments")}
                  onViewQr={app => setDialog({ type: "qr", item: app })}
                  onReschedule={id => setDialog({ type: "reschedule", id })}
                  onCancel={cancelAppointment}
                  onReview={id => setDialog({ type: "review", id })}
                  onPayment={id => setDialog({ type: "payment", id })}
                />
              )}

              {tab === "appointments" && (
                <HueAppointmentsTable
                  data={data}
                  customer={customer}
                  filterMode={filterMode}
                  setFilterMode={setFilterMode}
                  searchTerm={searchTerm}
                  onBook={handleStartBooking}
                  onViewQr={app => setDialog({ type: "qr", item: app })}
                  onReschedule={id => setDialog({ type: "reschedule", id })}
                  onCancel={cancelAppointment}
                  onReview={id => setDialog({ type: "review", id })}
                  onPayment={id => setDialog({ type: "payment", id })}
                />
              )}

              {tab === "history" && (
                <HueHistoryView
                  data={data}
                  customer={customer}
                  onReview={id => setDialog({ type: "review", id })}
                  onPayment={id => setDialog({ type: "payment", id })}
                />
              )}

              {tab === "services" && (
                <HueServicesView
                  customer={customer}
                  version={version}
                  data={data}
                  onBook={handleStartBooking}
                  showToast={showToast}
                />
              )}

              {tab === "payments" && (
                <HuePaymentsView
                  payments={data.payments}
                  totalSpent={totalSpent}
                />
              )}

              {tab === "notifications" && (
                <HueNotificationsView
                  customerId={customer.id}
                  refresh={refresh}
                />
              )}

              {tab === "profile" && (
                <HueProfileView
                  customer={customer}
                  onSaved={onCustomerChange}
                />
              )}

              {tab === "help" && <HueHelpView />}
            </>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      {dialog?.type === "reschedule" && (
        <RescheduleDialog
          customer={customer}
          id={dialog.id}
          onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); bump(); showToast("Appointment rescheduled successfully."); }}
        />
      )}

      {dialog?.type === "review" && (
        <ReviewDialog
          customer={customer}
          id={dialog.id}
          onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); bump(); showToast("Thank you for your rating & feedback!"); }}
        />
      )}

      {dialog?.type === "payment" && (
        <PaymentDialog
          customer={customer}
          id={dialog.id}
          onClose={() => setDialog(null)}
          showToast={showToast}
        />
      )}

      {dialog?.type === "qr" && (
        <QrModal
          appointment={dialog.item}
          onClose={() => setDialog(null)}
        />
      )}

      {/* Toast */}
      <div className={`hs-toast${toast ? " is-visible" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}

// ==========================================================================
// Overview Component (HueSuite styled cards + quick table)
// ==========================================================================
function HueOverviewTab({ data, customer, onBook, goAppointments, onViewQr, onReschedule, onCancel, onReview, onPayment }) {
  const next = data.upcoming[0];
  const picks = getBookableServices().slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="hs-overview-grid">
        {/* Next Appointment Spotlight Card */}
        <div className="hs-spotlight-card">
          <span className="hs-spotlight-tag">Next Appointment</span>
          {next ? (
            <div>
              <h2 className="hs-spotlight-title">{next.serviceName || serviceById(next.serviceId)?.name || "Salon Treatment"}</h2>
              <div className="hs-spotlight-meta">
                <span>🗓 {formatDate(next.date)} at {formatTime(next.time)}</span>
                <span style={{ margin: "0 8px" }}>·</span>
                <span>✂️ Stylist: {next.stylist}</span>
                {next.branch && <span style={{ marginLeft: "8px" }}>· 📍 {next.branch}</span>}
              </div>
              <div className="hs-spotlight-actions">
                <button type="button" className="hs-btn-new" onClick={() => onViewQr(next)}>
                  📱 Show QR Code
                </button>
                <button type="button" className="hs-action-btn" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)", background: "transparent" }} onClick={() => onReschedule(next.id)}>
                  Reschedule
                </button>
                <button type="button" className="hs-action-btn danger" onClick={() => onCancel(next.id)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: "#94a3b8", margin: "10px 0 16px" }}>You have no upcoming appointments scheduled right now.</p>
              <button type="button" className="hs-btn-new" onClick={() => onBook()}>
                + Book Your Next Visit
              </button>
            </div>
          )}
        </div>

        {/* Loyalty & Referral Card */}
        <div className="hs-loyalty-card">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="hs-stat-label">LOYALTY STATUS</span>
              <span className="hs-badge-pill success">{data.loyalty.status}</span>
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
              {data.loyalty.points} <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}>Points</span>
            </div>
            <div className="hs-progress-bar-bg">
              <div className="hs-progress-bar-fill" style={{ width: `${Math.min(100, (data.loyalty.points / 200) * 100)}%` }} />
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
              <span>{data.loyalty.discountPercent}% Member Discount</span>
              <span>Cash Reward: {formatPrice(data.loyalty.cashReward)}</span>
            </div>
          </div>

          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Your Referral Code</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "1rem", color: "#8b5cf6" }}>
                {referralCodeFor(customer.id)}
              </span>
              <span style={{ fontSize: "0.72rem", color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: "9999px", fontWeight: 700 }}>
                +50 pts per friend
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Recent Appointments Table */}
      <HueAppointmentsTable
        data={data}
        customer={customer}
        filterMode="all"
        setFilterMode={() => {}}
        searchTerm=""
        onBook={onBook}
        onViewQr={onViewQr}
        onReschedule={onReschedule}
        onCancel={onCancel}
        onReview={onReview}
        onPayment={onPayment}
        limit={5}
        title="Recent & Upcoming Appointments"
      />

      {/* Recommendations Box */}
      <div className="hs-data-card" style={{ padding: "20px 24px" }}>
        <h3 className="hs-data-card-title">Recommended For You <span>Based on client favorites</span></h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginTop: "16px" }}>
          {picks.map(service => (
            <div key={service.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", background: "#f8fafc", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>{service.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{service.duration} mins · {service.category}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="hs-price-cell">{formatPrice(service.price)}</span>
                <button type="button" className="hs-action-btn primary" onClick={() => onBook(service.id)}>
                  Book ↗
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Appointments Table Component (HueSuite Product Inventory layout)
// ==========================================================================
function HueAppointmentsTable({ data, customer, filterMode, setFilterMode, searchTerm, onBook, onViewQr, onReschedule, onCancel, onReview, onPayment, limit, title }) {
  const [internalFilter, setInternalFilter] = useState("all");
  const [query, setQuery] = useState(searchTerm || "");

  const activeFilter = filterMode || internalFilter;
  const setActiveFilter = setFilterMode || setInternalFilter;

  const items = useMemo(() => {
    let list = data.appointments;
    if (activeFilter === "upcoming") list = data.upcoming;
    else if (activeFilter === "completed") list = data.completed;
    else if (activeFilter === "cancelled") list = data.cancelled;

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(item =>
        (item.serviceName || "").toLowerCase().includes(q) ||
        (item.stylist || "").toLowerCase().includes(q) ||
        (item.status || "").toLowerCase().includes(q) ||
        (item.date || "").includes(q)
      );
    }

    if (limit) list = list.slice(0, limit);
    return list;
  }, [data, activeFilter, query, limit]);

  return (
    <div className="hs-data-card">
      {/* Table Toolbar */}
      <div className="hs-data-card-header">
        <h2 className="hs-data-card-title">
          {title || "Appointments"} <span>{items.length} of {data.appointments.length} records</span>
        </h2>

        {!limit && (
          <div className="hs-toolbar-row">
            <div className="hs-filter-badge-group">
              <button
                type="button"
                className={`hs-filter-badge${activeFilter === "all" ? " is-active" : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                All {data.appointments.length}
              </button>
              <button
                type="button"
                className={`hs-filter-badge${activeFilter === "upcoming" ? " is-active" : ""}`}
                onClick={() => setActiveFilter("upcoming")}
              >
                Upcoming {data.upcoming.length}
              </button>
              <button
                type="button"
                className={`hs-filter-badge${activeFilter === "completed" ? " is-active" : ""}`}
                onClick={() => setActiveFilter("completed")}
              >
                Completed {data.completed.length}
              </button>
              <button
                type="button"
                className={`hs-filter-badge${activeFilter === "cancelled" ? " is-active" : ""}`}
                onClick={() => setActiveFilter("cancelled")}
              >
                Cancelled {data.cancelled.length}
              </button>
            </div>

            <div className="hs-search-box" style={{ width: "200px" }}>
              <span className="hs-search-icon-left"><SearchIcon /></span>
              <input
                type="text"
                placeholder="Filter bookings..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="hs-table-wrap">
        <table className="hs-table">
          <thead>
            <tr>
              <th style={{ width: "24px" }}><input type="checkbox" readOnly /></th>
              <th>APPOINTMENT SERVICE</th>
              <th>STYLIST</th>
              <th>DATE &amp; TIME</th>
              <th>STATUS</th>
              <th>PAYMENT</th>
              <th>AMOUNT</th>
              <th style={{ textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {items.map(appointment => {
              const service = serviceById(appointment.serviceId);
              const total = Number(appointment.servicePrice ?? service?.price ?? 0);
              const payments = readList(KEYS.payments).filter(p => p.appointmentId === appointment.id);
              const paid = sum(payments, p => p.amount);
              const payState = paid <= 0 ? "unpaid" : paid < total ? "partial" : "paid";
              const upcoming = isActive(appointment);
              const review = data.reviews.find(r => r.appointmentId === appointment.id && r.customerId === customer.id);

              return (
                <tr key={appointment.id}>
                  <td><input type="checkbox" readOnly /></td>
                  <td>
                    <div className="hs-cell-primary">
                      {appointment.serviceName || service?.name || "Salon Treatment"}
                    </div>
                    <div className="hs-cell-secondary">
                      {appointment.serviceDuration || service?.duration || 45} mins · Ref: {appointment.id}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{appointment.stylist || "Assigned Stylist"}</div>
                    <div className="hs-cell-secondary">{appointment.branch || "Kigali Main Atelier"}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{formatDate(appointment.date)}</div>
                    <div className="hs-cell-secondary">{formatTime(appointment.time)}</div>
                  </td>
                  <td>
                    <span className={`hs-status-indicator ${appointment.status}`}>
                      ● {appointment.status}
                    </span>
                  </td>
                  <td>
                    <span className={`hs-badge-pill ${payState === "paid" ? "success" : payState === "partial" ? "warning" : "info"}`}>
                      {payState.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="hs-price-cell">{formatPrice(total)}</span>
                  </td>
                  <td>
                    <div className="hs-action-group" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="hs-action-btn"
                        title="View QR Check-In Code"
                        onClick={() => onViewQr(appointment)}
                      >
                        📱 QR
                      </button>

                      {upcoming && (
                        <>
                          <button
                            type="button"
                            className="hs-action-btn"
                            onClick={() => onReschedule(appointment.id)}
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            className="hs-action-btn danger"
                            onClick={() => onCancel(appointment.id)}
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {appointment.status === "completed" && !review && (
                        <button
                          type="button"
                          className="hs-action-btn primary"
                          onClick={() => onReview(appointment.id)}
                        >
                          Rate visit
                        </button>
                      )}

                      <button
                        type="button"
                        className="hs-action-btn"
                        onClick={() => onPayment(appointment.id)}
                      >
                        Receipt
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!items.length && (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  No appointments found for the selected view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================================================
// Booking History View
// ==========================================================================
function HueHistoryView({ data, customer, onReview, onPayment }) {
  const { completed } = data;
  return (
    <div className="hs-data-card">
      <div className="hs-data-card-header">
        <h2 className="hs-data-card-title">Completed Visits <span>{completed.length} past appointments</span></h2>
      </div>
      <div className="hs-table-wrap">
        <table className="hs-table">
          <thead>
            <tr>
              <th>SERVICE</th>
              <th>STYLIST</th>
              <th>DATE &amp; TIME</th>
              <th>FEEDBACK &amp; RATING</th>
              <th>TOTAL</th>
              <th style={{ textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {completed.map(app => {
              const service = serviceById(app.serviceId);
              const total = Number(app.servicePrice ?? service?.price ?? 0);
              const review = data.reviews.find(r => r.appointmentId === app.id && r.customerId === customer.id);
              return (
                <tr key={app.id}>
                  <td>
                    <div className="hs-cell-primary">{app.serviceName || service?.name || "Service"}</div>
                    <div className="hs-cell-secondary">{app.serviceDuration || service?.duration || 0} minutes</div>
                  </td>
                  <td>{app.stylist}</td>
                  <td>{formatDate(app.date)} · {formatTime(app.time)}</td>
                  <td>
                    {review ? (
                      <div>
                        <span style={{ color: "#f59e0b", letterSpacing: "2px" }}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                        {review.comment && <div className="hs-cell-secondary" style={{ fontStyle: "italic" }}>"{review.comment}"</div>}
                      </div>
                    ) : (
                      <span className="hs-cell-secondary">Not reviewed yet</span>
                    )}
                  </td>
                  <td><span className="hs-price-cell">{formatPrice(total)}</span></td>
                  <td>
                    <div className="hs-action-group" style={{ justifyContent: "flex-end" }}>
                      {!review && (
                        <button type="button" className="hs-action-btn primary" onClick={() => onReview(app.id)}>
                          Rate this visit
                        </button>
                      )}
                      <button type="button" className="hs-action-btn" onClick={() => onPayment(app.id)}>
                        Receipt
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!completed.length && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                  No past completed bookings recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================================================
// Services & Favorites Tab
// ==========================================================================
function HueServicesView({ customer, version, data, onBook, showToast }) {
  const [, setTick] = useState(0);
  const services = useMemo(getBookableServices, [version]);
  const stylists = useMemo(getStylists, [version]);
  const favorites = getFavorites(customer.id);
  const discount = data.loyalty.discountPercent ? ` · ${data.loyalty.discountPercent}% loyalty applied` : "";

  const toggle = (type, value) => {
    const saved = toggleFavorite(customer.id, type, value);
    showToast(saved ? "Added to favorites." : "Removed from favorites.");
    setTick(v => v + 1);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "20px" }}>
      {/* Services List Table */}
      <div className="hs-data-card">
        <div className="hs-data-card-header">
          <h2 className="hs-data-card-title">Services Catalog <span>{services.length} items</span></h2>
        </div>
        <div className="hs-table-wrap">
          <table className="hs-table">
            <thead>
              <tr>
                <th>SERVICE NAME</th>
                <th>CATEGORY &amp; TIME</th>
                <th>PRICE</th>
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {services.map(svc => {
                const isFav = favorites.services.includes(svc.id);
                return (
                  <tr key={svc.id}>
                    <td>
                      <div className="hs-cell-primary">{svc.name}</div>
                      <div className="hs-cell-secondary">{svc.description || "Premium salon treatment"}</div>
                    </td>
                    <td>
                      <span className="hs-badge-pill info">{svc.category || "General"}</span>
                      <div className="hs-cell-secondary" style={{ marginTop: "2px" }}>{svc.duration} mins{discount}</div>
                    </td>
                    <td><span className="hs-price-cell">{formatPrice(svc.price)}</span></td>
                    <td>
                      <div className="hs-action-group" style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="hs-action-btn"
                          style={{ color: isFav ? "#eab308" : "#94a3b8" }}
                          onClick={() => toggle("services", svc.id)}
                        >
                          {isFav ? "★ Favorite" : "☆ Save"}
                        </button>
                        <button
                          type="button"
                          className="hs-action-btn primary"
                          onClick={() => onBook(svc.id)}
                        >
                          Book ↗
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Favorite Stylists Card */}
      <div className="hs-data-card">
        <div className="hs-data-card-header">
          <h2 className="hs-data-card-title">Our Stylists <span>{stylists.length} specialists</span></h2>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {stylists.map(stylist => {
            const isFav = favorites.stylists.includes(stylist.name);
            return (
              <div
                key={stylist.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0"
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{stylist.name}</div>
                  <div className="hs-cell-secondary">{stylist.specialty} · {stylist.workStatus || "available"}</div>
                </div>
                <button
                  type="button"
                  className="hs-action-btn"
                  style={{ color: isFav ? "#eab308" : "#64748b" }}
                  onClick={() => toggle("stylists", stylist.name)}
                >
                  {isFav ? "★ Saved" : "☆ Save"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Payments Ledger View
// ==========================================================================
function HuePaymentsView({ payments, totalSpent }) {
  return (
    <div className="hs-data-card">
      <div className="hs-data-card-header">
        <h2 className="hs-data-card-title">Payment History <span>{payments.length} transactions</span></h2>
        <span className="hs-price-cell">Total: {formatPrice(totalSpent)}</span>
      </div>
      <div className="hs-table-wrap">
        <table className="hs-table">
          <thead>
            <tr>
              <th>SERVICE / DESCRIPTION</th>
              <th>DATE</th>
              <th>METHOD</th>
              <th>REFERENCE</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id || `${p.appointmentId}-${p.createdAt}`}>
                <td>
                  <div className="hs-cell-primary">{p.serviceName || "Salon Service"}</div>
                  <div className="hs-cell-secondary">Appt #{p.appointmentId || "—"}</div>
                </td>
                <td>{p.paymentDate || String(p.createdAt || "").slice(0, 10)}</td>
                <td><span className="hs-badge-pill info">{p.method || "Cash / MoMo"}</span></td>
                <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{p.reference || "—"}</td>
                <td><span className="hs-price-cell">{formatPrice(p.amount)}</span></td>
                <td><span className="hs-status-indicator ok">PAID</span></td>
              </tr>
            ))}
            {!payments.length && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                  No payment records found on file.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================================================
// Notifications View
// ==========================================================================
function HueNotificationsView({ customerId, refresh }) {
  const events = useMemo(() => listEvents({ customerId, limit: 100 }), [customerId, refresh]);
  return (
    <div className="hs-data-card">
      <div className="hs-data-card-header">
        <h2 className="hs-data-card-title">Activity &amp; Notifications <span>{events.length} messages</span></h2>
      </div>
      <div style={{ padding: "16px 24px" }}>
        {events.map(ev => {
          const detail = [ev.serviceName, ev.date && formatDate(ev.date), ev.time && formatTime(ev.time), ev.amount && formatPrice(ev.amount)].filter(Boolean).join(" · ");
          return (
            <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>
                  {EVENT_LABELS[ev.type] || String(ev.type).replaceAll("-", " ")}
                </div>
                <div className="hs-cell-secondary" style={{ marginTop: "2px" }}>
                  {detail || "An update regarding your account"}
                </div>
              </div>
              <time className="hs-cell-secondary" style={{ whiteSpace: "nowrap" }}>
                {ev.createdAt && new Date(ev.createdAt).toLocaleString("en-RW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </time>
            </div>
          );
        })}
        {!events.length && (
          <p style={{ textAlign: "center", color: "#94a3b8", padding: "32px 0" }}>You have no notifications at this time.</p>
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// Profile View
// ==========================================================================
function HueProfileView({ customer, onSaved }) {
  const [message, setMessage] = useState(null);
  const submit = event => {
    event.preventDefault();
    try {
      const updated = updateCustomerProfile({ id: customer.id, ...Object.fromEntries(new FormData(event.currentTarget)) });
      onSaved(updated);
      setMessage({ text: "Profile updated successfully." });
    } catch (err) {
      setMessage({ text: err.message, error: true });
    }
  };

  return (
    <div className="hs-data-card" style={{ maxWidth: "600px", padding: "24px" }}>
      <h2 className="hs-data-card-title" style={{ marginBottom: "16px" }}>Client Information</h2>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Field label="Full Name" name="name" required minLength={2} defaultValue={customer.name} />
        <Field label="Phone Number" name="phone" type="tel" required minLength={7} defaultValue={customer.phone} />
        <Field label="Email Address" name="email" type="email" required defaultValue={customer.email} />
        <Field label="Preferences / Hair & Skin Notes" name="preferences" defaultValue={customer.preferences || ""} placeholder="e.g. Sensitive scalp, prefers Alice..." />
        {message && (
          <p style={{ color: message.error ? "#ef4444" : "#16a34a", fontSize: "0.82rem", fontWeight: 600 }}>
            {message.text}
          </p>
        )}
        <button type="submit" className="hs-btn-primary-dark" style={{ alignSelf: "flex-start", padding: "10px 20px" }}>
          Save Changes
        </button>
      </form>
    </div>
  );
}

// ==========================================================================
// Help & Support View
// ==========================================================================
function HueHelpView() {
  return (
    <div className="hs-data-card" style={{ padding: "24px", maxWidth: "700px" }}>
      <h2 className="hs-data-card-title" style={{ marginBottom: "14px" }}>Client Care &amp; Support</h2>
      <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>
        Need help rescheduling, inquiring about a custom bridal package, or having issues with check-in?
        Our atelier concierge is available 7 days a week.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong>📞 Telephone:</strong> <a href="tel:+250788000000" style={{ color: "#3b82f6" }}>+250 788 000 000</a>
        </div>
        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong>💬 WhatsApp Concierge:</strong> <a href="https://wa.me/250788000000" target="_blank" rel="noreferrer" style={{ color: "#10b981" }}>Direct Chat (+250 788 000 000)</a>
        </div>
        <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong>📍 Atelier Branches:</strong> Kigali Main, Musanze Boutique, Huye, Rubavu
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// QR Code Modal for Customer Check-In
// ==========================================================================
function QrModal({ appointment, onClose }) {
  if (!appointment) return null;
  const qrData = appointmentQrPayload(appointment);
  const service = serviceById(appointment.serviceId);

  return (
    <Modal title="Appointment Check-In Pass" onClose={onClose}>
      <div className="hs-qr-modal-body">
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b" }}>
          Show this QR code to salon reception upon arrival for instant check-in.
        </p>

        <div className="hs-qr-canvas-box">
          <QrCode value={qrData} size={180} label="Appointment QR Code" />
        </div>

        <div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>
            {appointment.serviceName || service?.name || "Salon Treatment"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>
            {formatDate(appointment.date)} at {formatTime(appointment.time)} · Stylist: {appointment.stylist}
          </div>
        </div>

        <div className="hs-qr-code-text">
          Pass Ref: {appointment.id}
        </div>

        <button type="button" className="hs-btn-primary-dark" onClick={onClose} style={{ marginTop: "8px" }}>
          Close Pass
        </button>
      </div>
    </Modal>
  );
}

// ==========================================================================
// Dialogs: Reschedule, Review, Payment Details
// ==========================================================================
function RescheduleDialog({ customer, id, onClose, onDone }) {
  const appointment = readList(KEYS.appointments).find(item => item.id === id && item.customerId === customer.id);
  const service = appointment && serviceById(appointment.serviceId);
  const stylists = getStylists();
  const [stylist, setStylist] = useState(appointment?.stylist || "");
  const [date, setDate] = useState(() => (appointment && appointment.date >= localDate() ? appointment.date : localDate()));
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const times = useMemo(() => availableTimes({ service, stylist, date, exceptId: id }), [service, stylist, date, id]);

  useEffect(() => {
    setTime(current => (times.includes(current) ? current : times[0] || ""));
  }, [times]);

  if (!appointment || !service) return null;

  const submit = event => {
    event.preventDefault();
    const fresh = availableTimes({ service, stylist, date, exceptId: id });
    if (!time || !fresh.includes(time)) {
      setError("That slot is no longer available. Please select another.");
      return;
    }
    const all = readList(KEYS.appointments);
    const target = all.find(item => item.id === id && item.customerId === customer.id);
    if (!target) return;
    const previous = { date: target.date, time: target.time, stylist: target.stylist };
    Object.assign(target, { date, time, stylist, rescheduledAt: new Date().toISOString() });
    writeJson(KEYS.appointments, all);
    publishEvent("appointment-rescheduled", {
      appointmentId: id, customerId: customer.id, customerName: target.customer,
      serviceName: target.serviceName || service.name, stylist, date, time,
      previousDate: previous.date, previousTime: previous.time, previousStylist: previous.stylist
    });
    onDone();
  };

  return (
    <Modal title="Reschedule Appointment" onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
          {service.name} · {service.duration} mins
        </p>
        <div className="field">
          <label htmlFor="rs-stylist">Stylist</label>
          <select id="rs-stylist" value={stylist} onChange={e => setStylist(e.target.value)}>
            {stylists.map(person => <option key={person.id} value={person.name}>{person.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rs-date">Date</label>
          <input id="rs-date" type="date" required min={localDate()} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="rs-time">Time</label>
          <select id="rs-time" required value={time} onChange={e => setTime(e.target.value)}>
            {times.length ? times.map(val => <option key={val} value={val}>{formatTime(val)}</option>) : <option value="">No open slots</option>}
          </select>
        </div>
        {error && <p style={{ color: "#ef4444", fontSize: "0.82rem" }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
          <button type="button" className="hs-action-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="hs-btn-primary-dark" disabled={!time}>Confirm Reschedule</button>
        </div>
      </form>
    </Modal>
  );
}

function ReviewDialog({ customer, id, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submit = event => {
    event.preventDefault();
    writeJson(KEYS.reviews, [
      ...readList(KEYS.reviews),
      { id: `review-${crypto.randomUUID()}`, appointmentId: id, customerId: customer.id, rating, comment: comment.trim(), createdAt: new Date().toISOString() }
    ]);
    onDone();
  };
  return (
    <Modal title="Rate Your Experience" onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", gap: "8px", fontSize: "1.6rem" }}>
          {[1, 2, 3, 4, 5].map(val => (
            <button
              key={val}
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", color: val <= rating ? "#f59e0b" : "#cbd5e1" }}
              onClick={() => setRating(val)}
            >
              ★
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="rv-comment">Comments &amp; Feedback</label>
          <textarea
            id="rv-comment"
            rows={4}
            maxLength={500}
            placeholder="Tell us what you loved about your stylist and service..."
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button type="button" className="hs-action-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="hs-btn-primary-dark">Submit Review</button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentDialog({ customer, id, onClose, showToast }) {
  const appointment = ownedAppointments(customer.id).find(item => item.id === id);
  if (!appointment) return null;
  const service = serviceById(appointment.serviceId);
  const payments = readList(KEYS.payments).filter(item => item.appointmentId === id);
  const total = Number(appointment.servicePrice ?? service?.price ?? 0);
  const paid = sum(payments, item => item.amount);
  const name = appointment.serviceName || service?.name || "Salon service";

  const download = () => {
    if (!payments.length) { showToast("Receipt is available once payment is recorded."); return; }
    const lines = [
      getSettings().name, "CLIENT PAYMENT RECEIPT", `Receipt: ${appointment.id}`, `Customer: ${customer.name}`, `Service: ${name}`,
      `Appointment: ${formatDate(appointment.date)} at ${formatTime(appointment.time)}`, "", "PAYMENT ENTRIES",
      ...payments.map(item => `${item.paymentDate || ""} | ${item.method || "Payment"} | ${formatPrice(item.amount)} | Ref: ${item.reference || "—"}`),
      "", `Total: ${formatPrice(total)}`, `Paid: ${formatPrice(paid)}`, `Balance Remaining: ${formatPrice(Math.max(0, total - paid))}`
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${appointment.id}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Modal title="Payment & Receipt Breakdown" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <strong>{name}</strong> · {formatDate(appointment.date)}
        </div>
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
          Service Total: <strong>{formatPrice(total)}</strong> · Recorded: <strong>{formatPrice(paid)}</strong> · Remaining: <strong>{formatPrice(Math.max(0, total - paid))}</strong>
        </div>
        {payments.length ? (
          <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.82rem" }}>
            {payments.map((p, idx) => (
              <li key={p.id || idx}>
                {p.paymentDate || "Recorded"} · {p.method || "Payment"} · <strong>{formatPrice(p.amount)}</strong> {p.reference ? `(Ref: ${p.reference})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>No payments have been recorded yet by staff.</p>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
          <button type="button" className="hs-action-btn" onClick={onClose}>Close</button>
          <button type="button" className="hs-btn-primary-dark" disabled={!payments.length} onClick={download}>Download Receipt</button>
        </div>
      </div>
    </Modal>
  );
}

// ==========================================================================
// SVG Icons
// ==========================================================================
function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 14 14"></polyline>
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
      <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
      <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 2 18 2 18 6 6 6 6 2"></polyline>
      <rect x="3" y="6" width="18" height="14" rx="2"></rect>
      <line x1="10" y1="12" x2="14" y2="12"></line>
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      <line x1="12" y1="6" x2="16" y2="6"></line>
      <line x1="12" y1="10" x2="16" y2="10"></line>
    </svg>
  );
}

