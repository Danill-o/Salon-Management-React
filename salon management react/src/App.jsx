import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { currentCustomer, logoutCustomer } from "./lib/auth.js";
import { KEYS } from "./lib/storage.js";
import { getBookableServices, getSettings } from "./lib/salon.js";
import { seedSampleData } from "./lib/sampleData.js";
import { navigate, scrollToSection, useHashRoute, useStorageVersion } from "./hooks.js";
import Home from "./pages/Home.jsx";
import Account from "./pages/Account.jsx";
import { useLang } from "./lib/i18n.jsx";
import { whatsappLink } from "./lib/rwanda.js";

// Ensure comprehensive realistic sample data is seeded for all dashboards
seedSampleData();

const Admin = lazy(() => import("./pages/admin/AdminApp.jsx"));
const Stylist = lazy(() => import("./pages/Stylist.jsx"));

const NAV = [
  ["top", "Home"],
  ["services", "Services"],
  ["stylists", "Our Stylists"],
  ["gallery", "Gallery"],
  ["contact", "Contact Us"]
];

export default function App() {
  const route = useHashRoute();
  const { lang, setLang, t } = useLang();
  const version = useStorageVersion();
  const [customer, setCustomer] = useState(currentCustomer);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingRequest, setBookingRequest] = useState(null);
  const settings = getSettings();
  const onAccount = route.path === "account";

  const [authOpen, setAuthOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!authOpen) return;
    const close = e => {
      if (!e.target.closest(".auth-dropdown-wrap")) setAuthOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [authOpen]);

  const goSection = useCallback(id => {
    setMenuOpen(false);
    setAuthOpen(false);
    if (window.location.hash.replace(/^#\/?/, "").startsWith("account")) navigate("");
    window.setTimeout(() => scrollToSection(id), 60);
  }, []);

  // Preselects service and navigates directly to the integrated Customer Portal booking page
  const startBooking = useCallback(serviceId => {
    const services = getBookableServices();
    const id = services.some(service => service.id === serviceId) ? serviceId : services[0]?.id || "";
    setMenuOpen(false);
    setAuthOpen(false);
    try {
      sessionStorage.setItem(KEYS.pendingBooking, JSON.stringify({ serviceId: id }));
    } catch { /* storage disabled */ }
    setBookingRequest({ serviceId: id, nonce: Date.now() });
    navigate("account");
  }, []);

  const onAuthenticated = useCallback(user => {
    setCustomer(user);
    navigate("account");
  }, []);

  const onLogout = useCallback(() => {
    logoutCustomer();
    setCustomer(null);
  }, []);

  if (route.path === "admin" || route.path === "stylist") {
    return (
      <Suspense fallback={<p className="route-loading" role="status">Loading…</p>}>
        {route.path === "admin" ? <Admin /> : <Stylist />}
      </Suspense>
    );
  }

  return (
    <>
      {route.path !== "account" && ( <header className="site-header">
        <div className="container header-row">
          <a className="brand" href="#/" onClick={() => setMenuOpen(false)} aria-label={`${settings.name} home`}>
            <span className="brand-mark">S</span>
            <span className="brand-name">SALON <i>MANAGEMENT</i></span>
          </a>
          <button
            type="button"
            className="menu-btn"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            aria-label="Toggle navigation menu"
            onClick={() => setMenuOpen(open => !open)}
          >
            <span /><span /><span />
          </button>
          <nav id="main-nav" className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
            {NAV.map(([id, label]) => (
              <button key={id} type="button" className="nav-link" onClick={() => goSection(id)}>{t(label)}</button>
            ))}
            <button type="button" className="btn btn-primary" onClick={() => startBooking()}>{t("BOOK APPOINTMENT")} ↗</button>
            <div className="auth-dropdown-wrap" style={{ position: "relative" }}>
              <button
                type="button"
                className={`btn btn-outline${onAccount ? " is-active" : ""}`}
                aria-expanded={authOpen}
                onClick={() => setAuthOpen(open => !open)}
              >
                <span>{customer?.name ? customer.name.split(" ")[0] : (customer ? t("My Account") : t("LOGIN / ACCOUNT"))}</span> <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>▾</span>
              </button>
              {authOpen && (
                <div className="auth-dropdown-menu" style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: "220px",
                  background: "#ffffff",
                  border: "1px solid var(--line-strong)",
                  borderRadius: "14px",
                  boxShadow: "var(--shadow-lg)",
                  padding: "0.5rem",
                  zIndex: 100,
                  display: "grid",
                  gap: "4px"
                }}>
                  <a
                    href="#/account"
                    className="auth-dropdown-item"
                    onClick={() => { setAuthOpen(false); setMenuOpen(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "8px",
                      color: "var(--brand-dark)",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      textDecoration: "none"
                    }}
                  >
                    <span>👤</span> {customer ? "My Account" : "Customer Login / Register"}
                  </a>
                  <a
                    href="#/stylist"
                    className="auth-dropdown-item"
                    onClick={() => { setAuthOpen(false); setMenuOpen(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "8px",
                      color: "var(--brand-dark)",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      textDecoration: "none"
                    }}
                  >
                    <span>✂️</span> Staff Portal
                  </a>
                  <a
                    href="#/admin"
                    className="auth-dropdown-item"
                    onClick={() => { setAuthOpen(false); setMenuOpen(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "8px",
                      color: "var(--brand-dark)",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      textDecoration: "none"
                    }}
                  >
                    <span>⚙️</span> Admin Workspace
                  </a>
                  {customer && (
                    <button
                      type="button"
                      onClick={() => { onLogout(); setAuthOpen(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "0.6rem 0.8rem",
                        borderRadius: "8px",
                        color: "#a3342a",
                        fontSize: "0.86rem",
                        fontWeight: 600,
                        background: "none",
                        border: 0,
                        cursor: "pointer",
                        width: "100%",
                        textAlign: "left"
                      }}
                    >
                      <span>🚪</span> Sign Out
                    </button>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>
      </header> )}

      <main>
        {onAccount ? (
          <Account
            customer={customer}
            version={version}
            onAuthenticated={onAuthenticated}
            onCustomerChange={setCustomer}
            onLogout={onLogout}
            onBook={startBooking}
            initialServiceId={bookingRequest?.serviceId}
          />
        ) : (
          <Home
            customer={customer}
            version={version}
            bookingRequest={bookingRequest}
            onBook={startBooking}
            onNeedLogin={() => navigate("account")}
          />
        )}
      </main>

      {!(route.path === "account" && customer) && (
        <footer className="site-footer">
          <div className="container footer-row">
            <div>
              <div className="brand" style={{ color: "#fff", marginBottom: "4px" }}>
                <span className="brand-mark" style={{ width: "30px", height: "30px", fontSize: "1rem" }}>S</span>
                <span className="brand-name" style={{ color: "#fff", fontSize: "0.95rem" }}>SALON <i>MANAGEMENT</i></span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.6)" }}>Bespoke beauty, hair, nails &amp; wellness atelier · Kigali, Rwanda</p>
            </div>
            <span>© {new Date().getFullYear()} {settings.name}. {t("All rights reserved.")}</span>
            <span className="footer-links">
              <a href="#/stylist">{t("Staff Portal")}</a>
              <a href="#/admin">{t("Admin Workspace")}</a>
            </span>
          </div>
        </footer>
      )}
      {!(route.path === "account" && customer) && whatsappLink(settings.whatsapp || settings.phone) && (
        <a className="whatsapp-fab" href={whatsappLink(settings.whatsapp || settings.phone, "Hello! I would like to book an appointment.")} target="_blank" rel="noopener noreferrer" aria-label={t("Chat on WhatsApp")}>
          WhatsApp
        </a>
      )}
    </>
  );
}
