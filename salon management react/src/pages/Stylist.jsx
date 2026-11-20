import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { KEYS, LOCAL_CHANGE, readJson, readList, saveJson, writeJson } from "../lib/storage.js";
import { listEvents, publishEvent } from "../lib/notifications.js";
import { formatDate, formatPrice, formatTime, getServices, getSettings, localDate, serviceImage } from "../lib/salon.js";
import "./stylist.css";

// Not part of KEYS: same key the standalone stylist.html uses for its PIN session.
const SESSION_KEY = "kigali-beauty-stylist-session-v1";
const SESSION_LENGTH = 8 * 60 * 60 * 1000;
const DEFAULT_STYLIST_NAMES = ["Jean", "Marie", "Sarah"];
const WEEK_DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" }
];

const STATUSES = [
  { value: "booked", label: "Pending", pillClass: "booked" },
  { value: "confirmed", label: "Confirmed", pillClass: "confirmed" },
  { value: "in-progress", label: "In Progress", pillClass: "in-progress" },
  { value: "completed", label: "Completed", pillClass: "completed" },
  { value: "cancelled", label: "Cancelled", pillClass: "cancelled" }
];

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "📊" },
  { id: "appointments", label: "My Appointments", icon: "📅" },
  { id: "schedule", label: "My Schedule", icon: "🕒" },
  { id: "customers", label: "Customers", icon: "👥" },
  { id: "services", label: "Services", icon: "💇" },
  { id: "status", label: "Update Status", icon: "🔄" },
  { id: "notifications", label: "Messages", icon: "💬", showBadge: true },
  { id: "profile", label: "My Profile", icon: "👤" },
  { id: "earnings", label: "Earnings & Commission", icon: "💰" },
  { id: "availability", label: "Working Hours", icon: "⏱️" },
  { id: "support", label: "Help & Support", icon: "❓" }
];

const EVENT_LABELS = {
  "booking-created": "New Appointment Booked",
  "appointment-confirmed": "Appointment Confirmed",
  "appointment-in-progress": "Service In Progress",
  cancellation: "Appointment Cancelled",
  "appointment-completed": "Service Completed",
  "payment-recorded": "Payment Recorded"
};

const TOAST_TEXT = {
  completed: "Service marked as complete.",
  "in-progress": "Service marked as in progress.",
  confirmed: "Appointment confirmed.",
  cancelled: "Appointment cancelled.",
  booked: "Appointment marked as pending."
};

const EVENT_TYPE_FOR_STATUS = {
  cancelled: "cancellation",
  confirmed: "appointment-confirmed",
  "in-progress": "appointment-in-progress",
  completed: "appointment-completed",
  booked: "booking-created"
};

/* ---------- data helpers ---------- */

function staffProfiles() {
  const saved = readList(KEYS.staff);
  if (saved.length) return saved;
  return DEFAULT_STYLIST_NAMES.map((name, index) => ({
    id: `stylist-${index + 1}`,
    name,
    specialty: index === 0 ? "Master Stylist" : index === 1 ? "Braiding Specialist" : "Nail & Beauty Artist",
    phone: "+250 788 " + (index + 1) + "00 " + (index + 1) + "00",
    commissionRate: 25,
    workStatus: "active"
  }));
}

function loadData() {
  return {
    profiles: staffProfiles(),
    appointments: readList(KEYS.appointments),
    services: getServices(),
    settings: getSettings(),
    events: listEvents({ limit: 250 })
  };
}

const encodeHex = data => Array.from(new Uint8Array(data), byte => byte.toString(16).padStart(2, "0")).join("");

async function pinHash(pin, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 150000, hash: "SHA-256" },
    key,
    256
  );
  return encodeHex(bits);
}

function readSessionId() {
  const session = readJson(SESSION_KEY, null);
  if (!session || typeof session !== "object") {
    if (session !== null) localStorage.removeItem(SESSION_KEY);
    return null;
  }
  if (!session.expiresAt || session.expiresAt <= Date.now()) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session.stylistId || null;
}

const byTime = (a, b) => String(a.time || "").localeCompare(String(b.time || ""));
const byDateTime = (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
const serviceFor = (services, ref) => {
  if (!ref) return null;
  return services.find(service => service.id === ref || service.name?.toLowerCase() === String(ref).toLowerCase()) || null;
};
const serviceLabel = (item, services) => {
  if (item.serviceName) return item.serviceName;
  const found = serviceFor(services, item.serviceId || item.service);
  if (found?.name) return found.name;
  if (typeof item.service === "string" && item.service.length > 0) return item.service;
  return "Salon service";
};
const serviceDuration = (item, services) => {
  if (item.duration) return Number(item.duration);
  if (item.serviceDuration) return Number(item.serviceDuration);
  const found = serviceFor(services, item.serviceId || item.service);
  return Number(found?.duration || 0);
};
const servicePrice = (item, services) => {
  if (item.price != null) return Number(item.price);
  if (item.servicePrice != null) return Number(item.servicePrice);
  const found = serviceFor(services, item.serviceId || item.service);
  return Number(found?.price ?? 0);
};
const statusLabel = status => {
  const value = String(status || "booked");
  return STATUSES.find(option => option.value === value)?.label || value.charAt(0).toUpperCase() + value.slice(1);
};
const timeMinutes = value => {
  const [hours, minutes] = String(value || "0:0").split(":").map(Number);
  return hours * 60 + (minutes || 0);
};
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

function stylistAvatar(profile) {
  if (profile?.avatar) return profile.avatar;
  const name = String(profile?.name || "").toLowerCase();
  if (name.includes("jean")) return "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80";
  if (name.includes("marie")) return "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80";
  if (name.includes("sarah")) return "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80";
  return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80";
}

function availabilitySchedule(profile, settings) {
  return WEEK_DAYS.reduce((schedule, day) => {
    const saved = profile?.availability?.[day.key];
    schedule[day.key] = {
      available: saved ? saved.available !== false : true,
      start: saved?.start || settings.openTime || "09:00",
      end: saved?.end || settings.closeTime || "19:00"
    };
    return schedule;
  }, {});
}

/* ---------- Status Pill Badge ---------- */

function StatusPill({ status }) {
  const val = String(status || "booked").toLowerCase();
  const found = STATUSES.find(s => s.value === val);
  const pillClass = found ? found.pillClass : "booked";
  const label = found ? found.label : statusLabel(status);
  return <span className={`status-pill ${pillClass}`}>{label}</span>;
}

/* ==========================================================================
   GATE / LOGIN COMPONENT
   ========================================================================== */

function Gate({ profiles, onSignedIn }) {
  const active = useMemo(() => profiles.filter(profile => profile.active !== false), [profiles]);
  const [selected, setSelected] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState({ text: "", error: false });
  const [busy, setBusy] = useState(false);
  const selectedId = active.some(profile => profile.id === selected) ? selected : active[0]?.id || "";
  const profile = active.find(person => person.id === selectedId);
  const firstTime = !profile?.pinHash;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!globalThis.crypto?.subtle) {
      setMessage({ text: "Secure PIN hashing requires localhost or HTTPS.", error: true });
      return;
    }
    const current = staffProfiles().find(person => person.id === selectedId);
    if (!current) return;
    if (current.active === false) {
      setMessage({ text: "This employee profile is inactive. Contact salon admin.", error: true });
      return;
    }
    if (!/^\d{6,12}$/.test(pin)) {
      setMessage({ text: "PIN must be between 6 and 12 digits.", error: true });
      return;
    }
    setBusy(true);
    try {
      if (current.pinHash) {
        if ((await pinHash(pin, current.pinSalt)) !== current.pinHash) {
          setMessage({ text: "Incorrect PIN for this profile.", error: true });
          return;
        }
      } else {
        const profilesNow = staffProfiles();
        current.pinSalt = encodeHex(crypto.getRandomValues(new Uint8Array(16)));
        current.pinHash = await pinHash(pin, current.pinSalt);
        const saved = readList(KEYS.staff);
        const updated = (saved.length ? saved : profilesNow).map(person => (person.id === current.id ? current : person));
        saveJson(KEYS.staff, updated);
      }
      writeJson(SESSION_KEY, { stylistId: current.id, expiresAt: Date.now() + SESSION_LENGTH });
      setPin("");
      setMessage({ text: "", error: false });
      onSignedIn(current.id);
    } catch {
      setMessage({ text: "Could not save session. Check browser storage.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate-wrapper">
      <header className="gate-header">
        <a className="gate-brand" href="#/">
          <div className="gate-brand-icon">✂</div>
          <div className="gate-brand-text">
            <h1>SALON MANAGEMENT</h1>
            <span>BEAUTY • STYLE • CONFIDENCE</span>
          </div>
        </a>
      </header>

      <div className="gate-container">
        <div className="gate-card-wrapper">
          <div className="gate-hero-panel">
            <div>
              <span className="gate-badge">STAFF PORTAL</span>
              <h2>Your chair.<br /><em>Your day.</em></h2>
              <p>Welcome to Salon Management. Sign in to review your schedule, track commissions, and manage your clients seamlessly.</p>
            </div>
            <div className="gate-hero-features">
              <div className="gate-hero-feature">
                <span>✓</span> Manage daily appointments &amp; guest details
              </div>
              <div className="gate-hero-feature">
                <span>✓</span> Track commissions &amp; completed earnings
              </div>
              <div className="gate-hero-feature">
                <span>✓</span> Real-time client status updates &amp; QR check-in
              </div>
            </div>
          </div>

          <div className="gate-form-panel">
            <h3>Stylist Sign In</h3>
            <p className="subtext">Select your profile and enter your secure access PIN.</p>

            <form onSubmit={submit}>
              <div className="form-group">
                <label htmlFor="stylist-select">Your Profile</label>
                <select id="stylist-select" value={selectedId} onChange={e => setSelected(e.target.value)} required>
                  {active.length
                    ? active.map(p => <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ""}</option>)
                    : <option value="">No stylist profiles found</option>}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="stylist-pin">Access PIN (6–12 digits)</label>
                <input
                  id="stylist-pin"
                  type="password"
                  minLength={6}
                  maxLength={12}
                  inputMode="numeric"
                  autoComplete="current-password"
                  placeholder="••••••"
                  required
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                />
                <small>{firstTime ? "First sign-in: create a 6–12 digit PIN for your account." : "Enter your existing 6–12 digit security PIN."}</small>
                <div style={{ marginTop: "8px", padding: "8px 12px", background: "var(--lx-sand)", border: "1px dashed var(--lx-border)", borderRadius: "8px", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Demo PIN: <strong>123456</strong></span>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--lx-terracotta)", fontWeight: 700, cursor: "pointer", fontSize: "12px", padding: 0 }}
                    onClick={() => setPin("123456")}
                  >
                    ⚡ Auto-fill 123456
                  </button>
                </div>
              </div>

              {message.text && (
                <div className={`gate-message${message.error ? " error" : ""}`} role="status">
                  {message.text}
                </div>
              )}

              <button className="gate-submit-btn" type="submit" disabled={busy || !selectedId}>
                {firstTime ? "Set PIN & Sign In" : "Sign In to Dashboard"} <span>→</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="gate-footer">
        © {new Date().getFullYear()} Salon Management · Kigali Atelier · All rights reserved.
      </footer>
    </div>
  );
}

/* ==========================================================================
   APPOINTMENT DETAIL MODAL
   ========================================================================== */

function AppointmentModal({ item, services, canViewContacts, onClose, onUpdateStatus }) {
  if (!item) return null;
  const price = servicePrice(item, services);
  const duration = serviceDuration(item, services);
  const label = serviceLabel(item, services);
  const refCode = `KBS-${item.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="luxe-modal-backdrop" onClick={onClose}>
      <div className="luxe-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Appointment Details</h3>
            <span style={{ fontSize: "11px", color: "var(--lx-muted)" }}>Ref: {refCode}</span>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-detail-row">
            <span>Customer</span>
            <strong>{item.customer}</strong>
          </div>
          <div className="modal-detail-row">
            <span>Contact Phone</span>
            <strong>{canViewContacts && item.phone ? <a href={`tel:${item.phone}`} style={{ color: "var(--lx-terracotta)" }}>{item.phone}</a> : "Protected"}</strong>
          </div>
          <div className="modal-detail-row">
            <span>Service</span>
            <strong>{label}</strong>
          </div>
          <div className="modal-detail-row">
            <span>Duration &amp; Price</span>
            <strong>{duration} min · {formatPrice(price)}</strong>
          </div>
          <div className="modal-detail-row">
            <span>Scheduled For</span>
            <strong>{formatDate(item.date)} at {formatTime(item.time)}</strong>
          </div>
          <div className="modal-detail-row">
            <span>Current Status</span>
            <StatusPill status={item.status} />
          </div>
          {item.notes && (
            <div className="modal-detail-row" style={{ alignItems: "flex-start" }}>
              <span>Special Requests</span>
              <strong style={{ fontWeight: 600, color: "var(--lx-terracotta)", maxWidth: "280px" }}>{item.notes}</strong>
            </div>
          )}
          {item.branch && (
            <div className="modal-detail-row">
              <span>Location / Branch</span>
              <strong>📍 {item.branch}</strong>
            </div>
          )}

          <div className="modal-actions-bar">
            <span className="modal-status-label">Update Appointment Status:</span>
            <div className="modal-status-buttons">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  className={`status-pill ${s.pillClass}`}
                  style={{
                    cursor: "pointer",
                    border: item.status === s.value ? "2px solid #201715" : undefined,
                    fontWeight: 700,
                    padding: "6px 14px"
                  }}
                  onClick={() => {
                    onUpdateStatus(item.id, s.value);
                    onClose();
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   QR CHECK-IN MODAL
   ========================================================================== */

function QrCheckinModal({ appointments, services, onClose, onCheckedIn }) {
  const [code, setCode] = useState("");
  const [foundItem, setFoundItem] = useState(null);
  const [searched, setSearched] = useState(false);

  function handleLookup(e) {
    e.preventDefault();
    const query = code.trim().toLowerCase();
    if (!query) return;
    setSearched(true);
    // Support KBS-ID-DATE-TIME, or direct appointment ID, or customer phone/name
    const found = appointments.find(item => {
      const fullRef = `kbs-${item.id}-${item.date}-${item.time}`.toLowerCase();
      const shortRef = `kbs-${item.id.slice(0, 8)}`.toLowerCase();
      return (
        item.id.toLowerCase() === query ||
        fullRef.includes(query) ||
        shortRef.includes(query) ||
        (item.phone && item.phone.includes(query)) ||
        (item.customer && item.customer.toLowerCase().includes(query))
      );
    });
    setFoundItem(found || null);
  }

  return (
    <div className="luxe-modal-backdrop" onClick={onClose}>
      <div className="luxe-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📱 QR Appointment Check-In</h3>
          <button className="modal-close-btn" type="button" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "13px", color: "var(--lx-muted)", marginBottom: "16px" }}>
            Scan the client's confirmation QR code or enter their booking reference ID / phone number below to verify and check them in.
          </p>
          <form onSubmit={handleLookup} style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
            <input
              type="text"
              placeholder="e.g. KBS-1234... or Phone number"
              value={code}
              onChange={e => setCode(e.target.value)}
              style={{
                flex: 1,
                height: "44px",
                padding: "0 14px",
                borderRadius: "var(--lx-radius-sm)",
                border: "1px solid var(--lx-border)",
                fontSize: "13px"
              }}
              required
            />
            <button
              type="submit"
              style={{
                padding: "0 18px",
                height: "44px",
                borderRadius: "var(--lx-radius-sm)",
                background: "var(--lx-espresso)",
                color: "#ffffff",
                fontWeight: 700,
                border: "none",
                cursor: "pointer"
              }}
            >
              Verify
            </button>
          </form>

          {searched && !foundItem && (
            <div style={{ padding: "14px", background: "#fff5f5", color: "#c62828", borderRadius: "8px", fontSize: "13px" }}>
              ⚠️ No appointment found matching "<strong>{code}</strong>". Please verify the code and try again.
            </div>
          )}

          {foundItem && (
            <div style={{ background: "var(--lx-champagne)", padding: "16px", borderRadius: "var(--lx-radius-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <strong style={{ fontSize: "15px" }}>{foundItem.customer}</strong>
                <StatusPill status={foundItem.status} />
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--lx-ink-soft)", display: "grid", gap: "4px" }}>
                <div>✂️ {serviceLabel(foundItem, services)} ({serviceDuration(foundItem, services)} min)</div>
                <div>📅 {formatDate(foundItem.date)} at {formatTime(foundItem.time)}</div>
                <div>💰 {formatPrice(servicePrice(foundItem, services))}</div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#2e7d32",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    onCheckedIn(foundItem.id, "in-progress");
                    onClose();
                  }}
                >
                  ✓ Check In &amp; Start Service
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#1565c0",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    onCheckedIn(foundItem.id, "confirmed");
                    onClose();
                  }}
                >
                  Mark Confirmed
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   SUPPORT MODAL
   ========================================================================== */

function SupportModal({ onClose }) {
  return (
    <div className="luxe-modal-backdrop" onClick={onClose}>
      <div className="luxe-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💬 Salon Management Staff Support</h3>
          <button className="modal-close-btn" type="button" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: "grid", gap: "16px" }}>
          <p style={{ fontSize: "13px", color: "var(--lx-muted)" }}>
            Need assistance with your schedule, emergency coverage, or inventory supply? Our management desk is available 7 days a week.
          </p>
          <div style={{ background: "var(--lx-champagne)", padding: "14px", borderRadius: "8px", display: "grid", gap: "8px" }}>
            <div><strong>Salon Floor Manager:</strong> Claudine Mukamana</div>
            <div><strong>Direct Desk:</strong> <a href="tel:+250788111222" style={{ color: "var(--lx-terracotta)" }}>+250 788 111 222</a></div>
            <div><strong>Salon Location:</strong> KG 9 Ave, Nyarutarama / Remera, Kigali</div>
            <div><strong>Operating Hours:</strong> Mon - Sun: 08:30 AM - 08:00 PM</div>
          </div>
          <a
            href="https://wa.me/250788111222?text=Hello%20Luxe%20Salon%20Management,%20I%20need%20staff%20support%20regarding%20my%20schedule."
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              borderRadius: "8px",
              background: "#25D366",
              color: "#ffffff",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: "14px"
            }}
          >
            <span>💬</span> Chat with Manager on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   SUB-VIEWS
   ========================================================================== */

// 1. My Appointments View
function AppointmentsView({ appointments, services, canViewContacts, onSelectView, onStatusChange, searchQuery }) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    return appointments.filter(item => {
      const matchFilter = filter === "all" || item.status === filter;
      const s = searchQuery.toLowerCase();
      const matchSearch =
        !s ||
        item.customer.toLowerCase().includes(s) ||
        (item.phone && item.phone.toLowerCase().includes(s)) ||
        serviceLabel(item, services).toLowerCase().includes(s);
      return matchFilter && matchSearch;
    });
  }, [appointments, filter, searchQuery, services]);

  return (
    <div>
      <div className="view-section-header">
        <div>
          <h2>My Appointments</h2>
          <p>Review, filter and manage all your assigned client bookings.</p>
        </div>
        <div className="filter-tabs-wrap">
          {["all", "booked", "confirmed", "in-progress", "completed", "cancelled"].map(statusKey => (
            <button
              key={statusKey}
              type="button"
              className={`filter-tab-pill${filter === statusKey ? " is-active" : ""}`}
              onClick={() => setFilter(statusKey)}
            >
              {statusKey === "all" ? "All Bookings" : statusLabel(statusKey)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="appointments-cards-grid">
          {filtered.map(item => (
            <div className="appointment-full-card" key={item.id}>
              <div>
                <div className="app-card-header">
                  <div>
                    <div className="app-card-customer">{item.customer}</div>
                    <div className="app-card-contact">
                      {canViewContacts && item.phone ? <a href={`tel:${item.phone}`}>📞 {item.phone}</a> : "Contact hidden"}
                    </div>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <div className="app-card-details" style={{ marginTop: "12px" }}>
                  <div className="app-card-details-item">
                    <span>Service</span>
                    <strong>{serviceLabel(item, services)}</strong>
                  </div>
                  <div className="app-card-details-item">
                    <span>Date &amp; Time</span>
                    <strong>{formatDate(item.date)} · {formatTime(item.time)}</strong>
                  </div>
                  <div className="app-card-details-item">
                    <span>Duration</span>
                    <strong>{serviceDuration(item, services)} min</strong>
                  </div>
                  <div className="app-card-details-item">
                    <span>Price</span>
                    <strong style={{ color: "var(--lx-terracotta)" }}>{formatPrice(servicePrice(item, services))}</strong>
                  </div>
                </div>
              </div>

              <div className="app-card-footer">
                <select
                  className="status-select-inline"
                  value={item.status}
                  onChange={e => onStatusChange(item.id, e.target.value)}
                  aria-label={`Change status for ${item.customer}`}
                >
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button className="table-action-btn" type="button" onClick={() => onSelectView(item)}>
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="luxe-panel panel-empty">No appointments found matching your selection.</div>
      )}
    </div>
  );
}

// 2. My Schedule View (Day Picker + Week Grid)
function ScheduleView({ mine, services, onSelectView, onStatusChange }) {
  const [date, setDate] = useState(() => localDate());
  const selectedDate = date || localDate();
  const dayItems = useMemo(() => mine.filter(item => item.date === selectedDate).sort(byTime), [mine, selectedDate]);

  const selected = new Date(`${selectedDate}T12:00:00`);
  const monday = new Date(selected);
  monday.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));

  function changeDay(offset) {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + offset);
    setDate(localDate(d));
  }

  return (
    <div>
      <div className="view-section-header">
        <div>
          <h2>My Schedule</h2>
          <p>Interactive day-by-day and weekly agenda view.</p>
        </div>
      </div>

      <div className="schedule-toolbar">
        <button className="schedule-btn" type="button" onClick={() => changeDay(-1)}>← Prev Day</button>
        <button className="schedule-btn" type="button" onClick={() => setDate(localDate())}>Today</button>
        <button className="schedule-btn" type="button" onClick={() => changeDay(1)}>Next Day →</button>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <span style={{ fontSize: "13px", color: "var(--lx-muted)", marginLeft: "auto" }}>
          <strong>{formatDate(selectedDate)}</strong> · {plural(dayItems.length, "appointment")}
        </span>
      </div>

      <div className="luxe-panel" style={{ marginBottom: "28px" }}>
        <div className="panel-header">
          <div className="panel-title-group">
            <h2>Appointments for {formatDate(selectedDate)}</h2>
            <span>{dayItems.length ? `${dayItems.length} clients scheduled` : "No appointments for this date"}</span>
          </div>
        </div>
        <div className="schedule-table-wrap">
          {dayItems.length ? (
            <table className="luxe-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dayItems.map(item => (
                  <tr key={item.id}>
                    <td className="table-time">{formatTime(item.time)}</td>
                    <td className="table-customer">
                      {item.customer}
                      <small>{item.phone || "No phone recorded"}</small>
                    </td>
                    <td className="table-service">
                      <strong>{serviceLabel(item, services)}</strong>
                      <small>{serviceDuration(item, services)} min · {formatPrice(servicePrice(item, services))}</small>
                    </td>
                    <td>
                      <select
                        className="status-select-inline"
                        value={item.status}
                        onChange={e => onStatusChange(item.id, e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="table-action-btn" type="button" onClick={() => onSelectView(item)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="panel-empty">No appointments are assigned to you for this day. Enjoy your free time!</div>
          )}
        </div>
      </div>

      <div className="luxe-panel">
        <div className="panel-header">
          <div className="panel-title-group">
            <h2>Week At A Glance</h2>
            <span>Weekly bookings breakdown (Monday – Sunday)</span>
          </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div className="week-grid-container">
            {WEEK_DAYS.map((day, idx) => {
              const d = new Date(monday);
              d.setDate(monday.getDate() + idx);
              const key = localDate(d);
              const isToday = key === localDate();
              const bookings = mine.filter(item => item.date === key).sort(byTime);
              return (
                <div key={day.key} className={`week-day-col${isToday ? " is-today" : ""}`}>
                  <div className="week-col-head">
                    <div className="week-col-name">{day.label}</div>
                    <div className="week-col-date">{formatDate(key)}</div>
                  </div>
                  <div className="week-col-bookings">
                    {bookings.length ? (
                      bookings.map(item => (
                        <div
                          key={item.id}
                          className="week-booking-chip"
                          onClick={() => onSelectView(item)}
                          style={{ cursor: "pointer" }}
                        >
                          <strong>{formatTime(item.time)}</strong>
                          <span>{item.customer}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: "11px", color: "var(--lx-muted-light)", textAlign: "center", marginTop: "12px" }}>
                        Free
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Availability Form View
function AvailabilityView({ profile, settings, onSaved }) {
  const stored = useMemo(() => availabilitySchedule(profile, settings), [profile, settings]);
  const storedKey = JSON.stringify(stored);
  const [draft, setDraft] = useState(stored);
  const [message, setMessage] = useState("");

  useEffect(() => { setDraft(JSON.parse(storedKey)); }, [storedKey]);

  const update = (key, patch) => setDraft(current => ({ ...current, [key]: { ...current[key], ...patch } }));

  function submit(event) {
    event.preventDefault();
    const availability = {};
    for (const day of WEEK_DAYS) {
      const { available, start, end } = draft[day.key];
      if (available && (!start || !end || start >= end)) {
        setMessage(`Set a valid end time after start time for ${day.label}, or mark the day OFF.`);
        return;
      }
      availability[day.key] = { available, start, end };
    }
    try {
      saveJson(KEYS.staff, staffProfiles().map(person => (person.id === profile.id ? { ...person, availability } : person)));
    } catch {
      setMessage("Could not save availability. Check browser storage.");
      return;
    }
    onSaved();
    setMessage("Weekly working hours saved successfully! Clients will only book during these hours.");
  }

  return (
    <div>
      <div className="view-section-header">
        <div>
          <h2>Working Hours &amp; Availability</h2>
          <p>Specify when you are in salon for appointments.</p>
        </div>
      </div>

      <div className="availability-card">
        <form onSubmit={submit}>
          {WEEK_DAYS.map(day => {
            const hours = draft[day.key];
            return (
              <div className="avail-row" key={day.key}>
                <label className="avail-day-toggle">
                  <input
                    type="checkbox"
                    checked={hours.available}
                    onChange={e => update(day.key, { available: e.target.checked })}
                    style={{ width: "18px", height: "18px", accentColor: "var(--lx-terracotta)" }}
                  />
                  <span>{day.label}</span>
                </label>
                <div className="avail-time-field">
                  <span>From:</span>
                  <input
                    type="time"
                    value={hours.start}
                    disabled={!hours.available}
                    onChange={e => update(day.key, { start: e.target.value })}
                  />
                </div>
                <div className="avail-time-field">
                  <span>To:</span>
                  <input
                    type="time"
                    value={hours.end}
                    disabled={!hours.available}
                    onChange={e => update(day.key, { end: e.target.value })}
                  />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: hours.available ? "#2e7d32" : "var(--lx-terracotta)" }}>
                  {hours.available ? "OPEN" : "OFF"}
                </span>
              </div>
            );
          })}

          {message && (
            <div style={{ marginTop: "16px", padding: "10px", borderRadius: "8px", background: "#e8f5e9", color: "#2e7d32", fontSize: "13px" }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            style={{
              marginTop: "20px",
              padding: "12px 24px",
              borderRadius: "8px",
              background: "var(--lx-espresso)",
              color: "#ffffff",
              fontWeight: 700,
              border: "none",
              cursor: "pointer"
            }}
          >
            Save Weekly Hours →
          </button>
        </form>
      </div>
    </div>
  );
}

// 4. Customers Directory View
function CustomersView({ customers, canViewContacts, searchQuery }) {
  const filtered = useMemo(() => {
    const s = searchQuery.toLowerCase();
    if (!s) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(s) || (c.phone && c.phone.includes(s)));
  }, [customers, searchQuery]);

  return (
    <div>
      <div className="view-section-header">
        <div>
          <h2>Guest Directory</h2>
          <p>Clients who have booked and received treatments with you.</p>
        </div>
        <span style={{ fontSize: "13px", color: "var(--lx-muted)" }}>{plural(filtered.length, "client")}</span>
      </div>

      {filtered.length ? (
        <div className="customer-grid">
          {filtered.map((item, idx) => (
            <div className="customer-card" key={idx}>
              <div className="customer-avatar">
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div className="customer-info">
                <h4>{item.name}</h4>
                <p>{canViewContacts && item.phone ? <a href={`tel:${item.phone}`} style={{ color: "var(--lx-terracotta)", textDecoration: "none" }}>📞 {item.phone}</a> : "Contact hidden"}</p>
                <div className="customer-meta">
                  {plural(item.visits, "visit")} · Last: {formatDate(item.last)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="luxe-panel panel-empty">No client records found.</div>
      )}
    </div>
  );
}

// 5. Services Menu View
function ServicesView({ services }) {
  return (
    <div>
      <div className="view-section-header">
        <div>
          <h2>Salon Service Menu</h2>
          <p>Available hair, beauty, nails and wellness offerings.</p>
        </div>
      </div>

      <div className="services-grid">
        {services.map(s => {
          const img = serviceImage(s);
          return (
            <div className="service-card" key={s.id} style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }}
              />
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: "0 0 6px" }}>{s.name}</h4>
                  <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--lx-ink-soft)" }}>
                    {s.description || "High-end salon treatment designed to enhance your natural beauty."}
                  </p>
                </div>
                <div className="service-meta" style={{ marginTop: "auto", borderTop: "1px solid var(--lx-border-subtle)", paddingTop: "10px" }}>
                  <span style={{ color: "var(--lx-muted)", fontSize: "12px" }}>⏱️ {s.duration} min · {s.category || "General"}</span>
                  <span className="service-price" style={{ fontWeight: 700, color: "var(--lx-terracotta)" }}>{formatPrice(s.price)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 6. Fast Status Update Board View
function StatusUpdateBoard({ appointments, services, onStatusChange }) {
  const activeBookings = useMemo(() => {
    return appointments.filter(a => a.status !== "cancelled").slice(0, 15);
  }, [appointments]);

  return (
    <div>
      <div className="view-section-header">
        <div>
          <h2>Update Appointment Status</h2>
          <p>Fast one-click status transitions. Automatically dispatches instant updates to the customer's portal.</p>
        </div>
      </div>

      <div className="status-board">
        {activeBookings.length ? (
          activeBookings.map(item => (
            <div className="status-board-card" key={item.id}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <strong style={{ fontSize: "15px" }}>{item.customer}</strong>
                  <StatusPill status={item.status} />
                </div>
                <div style={{ fontSize: "12px", color: "var(--lx-muted)" }}>
                  ✂️ {serviceLabel(item, services)} · 📅 {formatDate(item.date)} at {formatTime(item.time)}
                </div>
              </div>

              <div className="status-btn-group">
                {STATUSES.map(s => {
                  const isCurrent = item.status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      className={`status-btn-step ${s.pillClass}${isCurrent ? " current" : ""}`}
                      onClick={() => onStatusChange(item.id, s.value)}
                    >
                      {isCurrent ? `✓ ${s.label}` : s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="luxe-panel panel-empty">No active appointments to update.</div>
        )}
      </div>
    </div>
  );
}

// 7. Messages & Notifications View
function NotificationsView({ events }) {
  return (
    <div>
      <div className="view-section-header">
        <div>
          <h2>Messages &amp; Activity Log</h2>
          <p>Real-time salon alerts, booking confirmations and service completions.</p>
        </div>
      </div>

      <div className="luxe-panel">
        {events.length ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {events.map((e, idx) => (
              <div
                key={e.id || idx}
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--lx-border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px"
                }}
              >
                <div>
                  <strong style={{ fontSize: "13.5px", color: "var(--lx-ink)" }}>
                    {EVENT_LABELS[e.type] || String(e.type).replaceAll("-", " ")}
                  </strong>
                  <div style={{ fontSize: "12px", color: "var(--lx-muted)", marginTop: "2px" }}>
                    {[e.customerName, e.serviceName, e.date ? formatDate(e.date) : "", e.time ? formatTime(e.time) : ""].filter(Boolean).join(" · ") || "Salon notification"}
                  </div>
                </div>
                <time style={{ fontSize: "11px", color: "var(--lx-muted-light)", whiteSpace: "nowrap" }}>
                  {e.createdAt ? new Date(e.createdAt).toLocaleString("en-RW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <div className="panel-empty">No messages or activity logged yet.</div>
        )}
      </div>
    </div>
  );
}

// 8. Earnings & Commission View
function EarningsView({ completedHistory, services, commissionRate }) {
  const totalCompleted = completedHistory.reduce((sum, item) => sum + servicePrice(item, services), 0);
  const estimatedCommission = Math.round(totalCompleted * (commissionRate / 100));

  return (
    <div>
      <div className="view-section-header">
        <div>
          <h2>Earnings &amp; Commissions</h2>
          <p>Comprehensive overview of completed treatments and commission accruals.</p>
        </div>
      </div>

      <div className="earnings-overview-grid">
        <div className="earnings-card">
          <span>Completed Service Value</span>
          <strong>{formatPrice(totalCompleted)}</strong>
        </div>
        <div className="earnings-card">
          <span>Commission Rate</span>
          <strong style={{ color: "var(--lx-gold)" }}>{commissionRate}%</strong>
        </div>
        <div className="earnings-card">
          <span>Estimated Commission</span>
          <strong>{formatPrice(estimatedCommission)}</strong>
        </div>
      </div>

      <div className="luxe-panel">
        <div className="panel-header">
          <div className="panel-title-group">
            <h2>Completed Appointments History</h2>
            <span>{plural(completedHistory.length, "service")} fulfilled</span>
          </div>
        </div>
        <div className="schedule-table-wrap">
          {completedHistory.length ? (
            <table className="luxe-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Duration</th>
                  <th>List Price</th>
                  <th>Your Share ({commissionRate}%)</th>
                </tr>
              </thead>
              <tbody>
                {completedHistory.map((item, idx) => {
                  const price = servicePrice(item, services);
                  const share = Math.round(price * (commissionRate / 100));
                  return (
                    <tr key={item.id || idx}>
                      <td className="table-time">{formatDate(item.date)} at {formatTime(item.time)}</td>
                      <td className="table-customer">{item.customer}</td>
                      <td className="table-service"><strong>{serviceLabel(item, services)}</strong></td>
                      <td>{serviceDuration(item, services)} min</td>
                      <td><strong>{formatPrice(price)}</strong></td>
                      <td style={{ color: "#2e7d32", fontWeight: 800 }}>+{formatPrice(share)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="panel-empty">Completed appointments will appear here after marking them complete.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// 9. My Profile View
function ProfileView({ profile, onSaved }) {
  const [name, setName] = useState(profile.name || "");
  const [specialty, setSpecialty] = useState(profile.specialty || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [message, setMessage] = useState({ text: "", error: false });

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ text: "Name cannot be empty.", error: true });
      return;
    }
    const staff = staffProfiles();
    const updated = staff.map(person => {
      if (person.id !== profile.id) return person;
      return { ...person, name: name.trim(), specialty: specialty.trim(), phone: phone.trim() };
    });

    // Check if updating PIN
    if (newPin) {
      if (!/^\d{6,12}$/.test(newPin)) {
        setMessage({ text: "New PIN must be 6 to 12 digits.", error: true });
        return;
      }
      if (profile.pinHash) {
        if (!currentPin) {
          setMessage({ text: "Enter your current PIN to set a new one.", error: true });
          return;
        }
        const verify = await pinHash(currentPin, profile.pinSalt);
        if (verify !== profile.pinHash) {
          setMessage({ text: "Current PIN is incorrect.", error: true });
          return;
        }
      }
      const target = updated.find(p => p.id === profile.id);
      target.pinSalt = encodeHex(crypto.getRandomValues(new Uint8Array(16)));
      target.pinHash = await pinHash(newPin, target.pinSalt);
    }

    try {
      saveJson(KEYS.staff, updated);
      // Synchronize appointment stylist name if renamed
      if (profile.name !== name.trim()) {
        const apps = readList(KEYS.appointments);
        apps.forEach(item => { if (item.stylist === profile.name) item.stylist = name.trim(); });
        saveJson(KEYS.appointments, apps);
      }
      onSaved();
      setCurrentPin("");
      setNewPin("");
      setMessage({ text: "Profile details updated successfully!", error: false });
    } catch {
      setMessage({ text: "Could not save profile. Check storage permissions.", error: true });
    }
  }

  return (
    <div>
      <div className="view-section-header">
        <div>
          <h2>My Profile</h2>
          <p>Update your personal information, specialty description and security PIN.</p>
        </div>
      </div>

      <div className="availability-card" style={{ maxWidth: "560px" }}>
        <form onSubmit={submit}>
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--lx-ink-soft)", marginBottom: "6px" }}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1px solid var(--lx-border)" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--lx-ink-soft)", marginBottom: "6px" }}>Specialty / Title</label>
            <input
              type="text"
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              placeholder="e.g. Master Stylist, Knotless Braids Artist"
              style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1px solid var(--lx-border)" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--lx-ink-soft)", marginBottom: "6px" }}>Contact Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+250 788 000 000"
              style={{ width: "100%", height: "42px", padding: "0 12px", borderRadius: "8px", border: "1px solid var(--lx-border)" }}
            />
          </div>

          <div style={{ borderTop: "1px solid var(--lx-border-subtle)", paddingTop: "16px", marginTop: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Change Access PIN (Optional)</h4>
            {profile.pinHash && (
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--lx-muted)", marginBottom: "4px" }}>Current PIN</label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value)}
                  placeholder="Enter current PIN"
                  style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid var(--lx-border)" }}
                />
              </div>
            )}
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--lx-muted)", marginBottom: "4px" }}>New 6–12 Digit PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="New 6-12 digit PIN"
                style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid var(--lx-border)" }}
              />
            </div>
          </div>

          {message.text && (
            <div style={{ marginBottom: "16px", padding: "10px", borderRadius: "8px", background: message.error ? "#fdf2f2" : "#e8f5e9", color: message.error ? "#c62828" : "#2e7d32", fontSize: "13px" }}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              background: "var(--lx-espresso)",
              color: "#ffffff",
              fontWeight: 700,
              border: "none",
              cursor: "pointer"
            }}
          >
            Save Profile Changes →
          </button>
        </form>
      </div>
    </div>
  );
}

/* ==========================================================================
   WORKSPACE COMPONENT (LUXE SALON DASHBOARD)
   ========================================================================== */

function Workspace({ profile, data, onSignOut, onChange }) {
  const { appointments, services, settings, events } = data;
  const [currentView, setCurrentView] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Modals
  const [viewModalItem, setViewModalItem] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Stylist work status toggle (active vs busy)
  const [workStatus, setWorkStatus] = useState(profile.workStatus || "active");

  const [toast, setToast] = useState("");
  const toastTimer = useRef();
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback(text => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const canViewContacts = profile.permissions?.viewCustomerContacts !== false;
  const canUpdate = profile.permissions?.updateAppointments !== false;
  const today = localDate();

  const mine = useMemo(() => appointments.filter(item => item.stylist === profile.name), [appointments, profile.name]);
  const todayItems = useMemo(() => mine.filter(item => item.date === today).sort(byTime), [mine, today]);
  const completedToday = useMemo(() => todayItems.filter(item => item.status === "completed"), [todayItems]);
  const pendingToday = useMemo(() => todayItems.filter(item => item.status === "booked" || item.status === "confirmed"), [todayItems]);
  const completedHistory = useMemo(() => mine.filter(item => item.status === "completed").sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)), [mine]);
  const upcoming = useMemo(() => mine.filter(item => item.date >= today && ["booked", "confirmed", "in-progress"].includes(item.status)).sort(byDateTime), [mine, today]);

  const stylistEvents = useMemo(() => events.filter(e => e.stylist === profile.name).slice(0, 50), [events, profile.name]);
  const unreadEventsCount = stylistEvents.length ? Math.min(stylistEvents.length, 3) : 0;

  const customers = useMemo(() => {
    const map = new Map();
    mine.forEach(item => {
      const key = item.customerId || String(item.phone || item.customer).trim().toLowerCase();
      if (!map.has(key)) map.set(key, { name: item.customer, phone: item.phone, visits: 0, last: item.date });
      const c = map.get(key);
      c.visits += 1;
      if (item.date > c.last) c.last = item.date;
    });
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [mine]);

  const commissionRate = Number(profile.commissionRate) || 25;
  const todayValue = completedToday.reduce((sum, item) => sum + servicePrice(item, services), 0);
  const todayEarnings = Math.round(todayValue * (commissionRate / 100));

  function changeStatus(id, newStatus) {
    if (!canUpdate) {
      showToast("Your account cannot update appointment statuses.");
      return;
    }
    const items = readList(KEYS.appointments);
    const app = items.find(item => item.id === id && item.stylist === profile.name);
    if (!app || !STATUSES.some(s => s.value === newStatus)) return;
    const prev = app.status;
    app.status = newStatus;
    app.updatedAt = new Date().toISOString();
    try {
      saveJson(KEYS.appointments, items);
    } catch {
      showToast("Could not save status change.");
      return;
    }
    if (prev !== newStatus && app.customerId) {
      publishEvent(EVENT_TYPE_FOR_STATUS[newStatus], {
        appointmentId: app.id,
        customerId: app.customerId,
        customerName: app.customer,
        stylist: app.stylist,
        serviceName: serviceLabel(app, services),
        date: app.date,
        time: app.time
      });
    }
    onChange();
    showToast(TOAST_TEXT[newStatus] || "Status updated.");
  }

  function toggleWorkStatus(status) {
    setWorkStatus(status);
    const staff = staffProfiles().map(p => (p.id === profile.id ? { ...p, workStatus: status } : p));
    try {
      saveJson(KEYS.staff, staff);
      onChange();
      showToast(`Work status set to ${status.toUpperCase()}`);
    } catch {
      // storage
    }
  }

  const hours = useMemo(() => availabilitySchedule(profile, settings), [profile, settings]);
  const avatar = stylistAvatar(profile);
  const firstName = String(profile.name || "Stylist").split(" ")[0];

  return (
    <div className="stylist-layout">
      {/* SIDEBAR */}
      <aside className={`stylist-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">✂</div>
          <div>
            <div className="sidebar-brand-name">SALON MANAGEMENT</div>
            <div className="sidebar-brand-sub">EMPLOYEE WORKSPACE</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(nav => {
            const isActive = currentView === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                className={`nav-item${isActive ? " is-active" : ""}`}
                onClick={() => {
                  setCurrentView(nav.id);
                  setSidebarOpen(false);
                }}
              >
                <div className="nav-item-content">
                  <span className="nav-item-icon">{nav.icon}</span>
                  <span>{nav.label}</span>
                </div>
                {nav.showBadge && unreadEventsCount > 0 && (
                  <span className="nav-badge">{unreadEventsCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar bottom promo widget */}
        <div className="sidebar-promo">
          <img
            src="https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=300&q=80"
            alt="Hairstyle confidence"
            className="promo-thumb"
          />
          <div className="promo-text">
            <h4>Great Hair Builds Confidence</h4>
            <p>Keep shining today! ✨</p>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="logout-nav-btn" type="button" onClick={onSignOut}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="stylist-main-content">
        {/* TOPBAR */}
        <header className="stylist-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-mobile-toggle"
              type="button"
              onClick={() => setSidebarOpen(open => !open)}
              aria-label="Toggle navigation sidebar"
            >
              ☰
            </button>
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search customers, appointments, or services..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="topbar-right">
            {/* Notification Bell */}
            <div className="icon-btn-wrap">
              <button
                className="icon-btn"
                type="button"
                onClick={() => setNotificationsOpen(open => !open)}
                aria-label="Notifications"
              >
                🔔
              </button>
              {unreadEventsCount > 0 && <span className="icon-badge">{unreadEventsCount}</span>}

              {notificationsOpen && (
                <div className="profile-dropdown" style={{ width: "300px", right: 0 }}>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--lx-border)", fontWeight: 700, fontSize: "13px" }}>
                    Recent Notifications
                  </div>
                  <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                    {stylistEvents.length ? (
                      stylistEvents.slice(0, 5).map((e, i) => (
                        <div key={e.id || i} style={{ padding: "8px 12px", borderBottom: "1px solid var(--lx-border-subtle)", fontSize: "12px" }}>
                          <strong>{EVENT_LABELS[e.type] || e.type}</strong>
                          <p style={{ margin: "2px 0 0", color: "var(--lx-muted)" }}>{e.customerName} · {e.serviceName}</p>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: "12px", textAlign: "center", color: "var(--lx-muted)", fontSize: "12px" }}>No recent alerts</div>
                    )}
                  </div>
                  <button
                    className="dropdown-link"
                    type="button"
                    onClick={() => {
                      setCurrentView("notifications");
                      setNotificationsOpen(false);
                    }}
                  >
                    View All Activity →
                  </button>
                </div>
              )}
            </div>

            {/* Stylist Profile Chip with Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                className="stylist-profile-chip"
                type="button"
                onClick={() => setProfileDropdownOpen(open => !open)}
              >
                <div className="chip-avatar-wrap">
                  <img src={avatar} alt={profile.name} className="chip-avatar" />
                  <span className={`chip-status-dot${workStatus === "busy" ? " busy" : ""}`} />
                </div>
                <div className="chip-info">
                  <div className="chip-name">{firstName}</div>
                  <div className="chip-role">{profile.specialty || "Stylist"}</div>
                </div>
                <span className="chip-chevron">▼</span>
              </button>

              {profileDropdownOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-status-toggle">
                    <span>Status:</span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        className={workStatus === "active" ? "status-btn-active" : ""}
                        onClick={() => toggleWorkStatus("active")}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        className={workStatus === "busy" ? "status-btn-busy" : ""}
                        onClick={() => toggleWorkStatus("busy")}
                      >
                        Busy
                      </button>
                    </div>
                  </div>
                  <button
                    className="dropdown-link"
                    type="button"
                    onClick={() => {
                      setCurrentView("profile");
                      setProfileDropdownOpen(false);
                    }}
                  >
                    👤 My Profile
                  </button>
                  <button
                    className="dropdown-link"
                    type="button"
                    onClick={() => {
                      setQrModalOpen(true);
                      setProfileDropdownOpen(false);
                    }}
                  >
                    📱 QR Check-In
                  </button>
                  <button
                    className="dropdown-link danger"
                    type="button"
                    onClick={onSignOut}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE BODY */}
        <main className="dashboard-scroll-body">
          {currentView === "overview" && (
            <div>
              {/* HERO WELCOME BANNER */}
              <div className="hero-banner">
                <div className="hero-banner-content">
                  <h1>Hello, {firstName}! 👋</h1>
                  <p>
                    Welcome to your employee dashboard. You have{" "}
                    <strong>{plural(todayItems.length, "appointment")}</strong> scheduled for today.
                  </p>
                  <button
                    className="hero-cta-btn"
                    type="button"
                    onClick={() => setCurrentView("schedule")}
                  >
                    <span>📅</span> View My Schedule
                  </button>
                </div>
                <div className="hero-banner-badge">
                  <span className="hero-badge-title">Good Hair Happy People ♡</span>
                  <span className="hero-badge-sub">Salon Management Atelier</span>
                </div>
              </div>

              {/* 4 STAT METRIC CARDS */}
              <div className="stat-cards-grid">
                <div className="stat-card">
                  <div className="stat-icon-wrap stat-icon-peach">📅</div>
                  <div className="stat-info">
                    <span className="stat-label">Today's Appointments</span>
                    <strong className="stat-value">{todayItems.length}</strong>
                    <span className="stat-note">Assigned for today</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrap stat-icon-green">✅</div>
                  <div className="stat-info">
                    <span className="stat-label">Completed Today</span>
                    <strong className="stat-value">{completedToday.length}</strong>
                    <span className="stat-note">{todayItems.length - completedToday.length} remaining</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrap stat-icon-amber">⏳</div>
                  <div className="stat-info">
                    <span className="stat-label">Pending Appointments</span>
                    <strong className="stat-value">{pendingToday.length}</strong>
                    <span className="stat-note">Requires confirmation</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrap stat-icon-lavender">👥</div>
                  <div className="stat-info">
                    <span className="stat-label">Total Customers</span>
                    <strong className="stat-value">{customers.length}</strong>
                    <span className="stat-note">Unique clients served</span>
                  </div>
                </div>
              </div>

              {/* 2-COLUMN DASHBOARD GRID */}
              <div className="dashboard-two-col">
                {/* LEFT COLUMN */}
                <div className="col-left">
                  {/* Today's Schedule Card */}
                  <div className="luxe-panel">
                    <div className="panel-header">
                      <div className="panel-title-group">
                        <h2>Today's Schedule</h2>
                        <span>{formatDate(today)}</span>
                      </div>
                      <button
                        className="panel-header-btn"
                        type="button"
                        onClick={() => setCurrentView("schedule")}
                      >
                        View All →
                      </button>
                    </div>

                    <div className="schedule-table-wrap">
                      {todayItems.length ? (
                        <table className="luxe-table">
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Customer</th>
                              <th>Service</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {todayItems.map(item => (
                              <tr key={item.id}>
                                <td className="table-time">{formatTime(item.time)}</td>
                                <td className="table-customer">
                                  {item.customer}
                                  <small>{canViewContacts && item.phone ? item.phone : "Contact hidden"}</small>
                                </td>
                                <td className="table-service">
                                  <strong>{serviceLabel(item, services)}</strong>
                                  <small>{serviceDuration(item, services)} min · {formatPrice(servicePrice(item, services))}</small>
                                </td>
                                <td>
                                  <StatusPill status={item.status} />
                                </td>
                                <td>
                                  <button
                                    className="table-action-btn"
                                    type="button"
                                    onClick={() => setViewModalItem(item)}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="panel-empty">No appointments scheduled for today. Have a relaxing day!</div>
                      )}
                    </div>
                  </div>

                  {/* Upcoming Appointments */}
                  <div className="luxe-panel">
                    <div className="panel-header">
                      <div className="panel-title-group">
                        <h2>Upcoming Appointments</h2>
                        <span>{plural(upcoming.length, "booking")} ahead</span>
                      </div>
                      <button
                        className="panel-header-btn"
                        type="button"
                        onClick={() => setCurrentView("appointments")}
                      >
                        View All →
                      </button>
                    </div>

                    {upcoming.length ? (
                      <div className="upcoming-cards-wrap">
                        {upcoming.slice(0, 4).map(item => (
                          <div
                            className="upcoming-mini-card"
                            key={item.id}
                            onClick={() => setViewModalItem(item)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="mini-card-top">
                              <div className="mini-card-guest">
                                <div className="mini-avatar">{item.customer.charAt(0).toUpperCase()}</div>
                                <span className="mini-guest-name">{item.customer}</span>
                              </div>
                              <StatusPill status={item.status} />
                            </div>
                            <div className="mini-card-service">{serviceLabel(item, services)}</div>
                            <div className="mini-card-time">
                              <span>📅</span> {formatDate(item.date)} at {formatTime(item.time)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="panel-empty">No upcoming appointments in your queue.</div>
                    )}
                  </div>

                  {/* Quick Actions Panel */}
                  <div className="luxe-panel quick-actions-panel">
                    <div className="quick-actions-title">⚡ Quick Actions</div>
                    <div className="quick-actions-pills">
                      <button className="quick-pill" type="button" onClick={() => setCurrentView("appointments")}>
                        📅 View My Appointments
                      </button>
                      <button className="quick-pill" type="button" onClick={() => setCurrentView("status")}>
                        🔄 Update Appointment Status
                      </button>
                      <button className="quick-pill" type="button" onClick={() => setCurrentView("customers")}>
                        👥 View Customers
                      </button>
                      <button className="quick-pill" type="button" onClick={() => setCurrentView("notifications")}>
                        💬 Check Messages
                      </button>
                      <button className="quick-pill" type="button" onClick={() => setCurrentView("services")}>
                        ✂️ Manage Services
                      </button>
                      <button className="quick-pill accent" type="button" onClick={() => setQrModalOpen(true)}>
                        📱 QR Code Check-in
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="col-right">
                  {/* 1. Stylist Profile Card */}
                  <div className="luxe-panel profile-widget-card">
                    <div className="profile-widget-avatar-wrap">
                      <img src={avatar} alt={profile.name} className="profile-widget-avatar" />
                      <span className={`widget-status-dot${workStatus === "busy" ? " busy" : ""}`} />
                    </div>
                    <div className="profile-widget-name">{profile.name}</div>
                    <div className="profile-widget-role">{profile.specialty || "Senior Stylist"}</div>
                    <div className="profile-widget-rating">
                      <span>⭐⭐⭐⭐⭐</span> 4.9 (124 reviews)
                    </div>
                    <div className="profile-widget-status-bar">
                      <button
                        type="button"
                        className={`status-toggle-btn${workStatus === "active" ? " is-active" : ""}`}
                        onClick={() => toggleWorkStatus("active")}
                      >
                        ● Active
                      </button>
                      <button
                        type="button"
                        className={`status-toggle-btn${workStatus === "busy" ? " is-busy" : ""}`}
                        onClick={() => toggleWorkStatus("busy")}
                      >
                        ● Busy
                      </button>
                    </div>
                  </div>

                  {/* 2. Today's Summary Card */}
                  <div className="luxe-panel summary-widget-card">
                    <div className="summary-widget-title">
                      <span>Today's Summary</span>
                      <span style={{ fontSize: "11px", color: "var(--lx-muted)" }}>{formatDate(today)}</span>
                    </div>
                    <div className="summary-items-list">
                      <div className="summary-item">
                        <span>Total Appointments:</span>
                        <strong>{todayItems.length}</strong>
                      </div>
                      <div className="summary-item">
                        <span>Completed:</span>
                        <strong style={{ color: "#2e7d32" }}>{completedToday.length}</strong>
                      </div>
                      <div className="summary-item">
                        <span>Pending / In Progress:</span>
                        <strong style={{ color: "#e65100" }}>{pendingToday.length}</strong>
                      </div>
                    </div>
                    <div className="summary-earnings-box">
                      <span>Today's Commission:</span>
                      <strong>{formatPrice(todayEarnings)}</strong>
                    </div>
                  </div>

                  {/* 3. Performance Card */}
                  <div className="luxe-panel perf-widget-card">
                    <div className="perf-title">My Performance</div>
                    <div className="perf-metric">
                      <div className="perf-metric-header">
                        <span>Completed Services Goal</span>
                        <strong>92%</strong>
                      </div>
                      <div className="perf-bar-bg">
                        <div className="perf-bar-fill" style={{ width: "92%" }} />
                      </div>
                    </div>
                    <div className="perf-scores-grid">
                      <div className="perf-mini-stat">
                        <strong>98%</strong>
                        <span>Satisfaction ⭐</span>
                      </div>
                      <div className="perf-mini-stat">
                        <strong>96%</strong>
                        <span>On-time Rate</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Working Hours Card */}
                  <div className="luxe-panel hours-widget-card">
                    <div className="hours-widget-header">
                      <h3>Working Hours</h3>
                      <button
                        className="panel-header-btn"
                        type="button"
                        onClick={() => setCurrentView("availability")}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                    <div className="hours-list">
                      {WEEK_DAYS.map(day => {
                        const h = hours[day.key];
                        return (
                          <div className="hours-row" key={day.key}>
                            <span className="hours-day">{day.label.slice(0, 3)}:</span>
                            {h.available ? (
                              <span className="hours-time">{formatTime(h.start)} – {formatTime(h.end)}</span>
                            ) : (
                              <span className="hours-off">OFF</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Need Help Card */}
                  <div className="help-widget-card">
                    <h3>🎧 Need Help?</h3>
                    <p>Have questions about bookings or need manager assistance? Our team is on standby.</p>
                    <button
                      className="help-chat-btn"
                      type="button"
                      onClick={() => setSupportModalOpen(true)}
                    >
                      💬 Chat with Support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === "appointments" && (
            <AppointmentsView
              appointments={mine}
              services={services}
              canViewContacts={canViewContacts}
              onSelectView={item => setViewModalItem(item)}
              onStatusChange={changeStatus}
              searchQuery={searchQuery}
            />
          )}

          {currentView === "schedule" && (
            <ScheduleView
              mine={mine}
              services={services}
              onSelectView={item => setViewModalItem(item)}
              onStatusChange={changeStatus}
            />
          )}

          {currentView === "customers" && (
            <CustomersView
              customers={customers}
              canViewContacts={canViewContacts}
              searchQuery={searchQuery}
            />
          )}

          {currentView === "services" && <ServicesView services={services} />}

          {currentView === "status" && (
            <StatusUpdateBoard
              appointments={mine}
              services={services}
              onStatusChange={changeStatus}
            />
          )}

          {currentView === "notifications" && <NotificationsView events={stylistEvents} />}

          {currentView === "earnings" && (
            <EarningsView
              completedHistory={completedHistory}
              services={services}
              commissionRate={commissionRate}
            />
          )}

          {currentView === "availability" && (
            <AvailabilityView profile={profile} settings={settings} onSaved={onChange} />
          )}

          {currentView === "profile" && (
            <ProfileView profile={profile} onSaved={onChange} />
          )}

          {currentView === "support" && (
            <div className="luxe-panel" style={{ maxWidth: "600px", padding: "28px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Help &amp; Support</h2>
              <p style={{ color: "var(--lx-muted)", fontSize: "13.5px", marginBottom: "20px" }}>
                Connect directly with salon administration or view staff support documentation.
              </p>
              <div style={{ display: "grid", gap: "12px" }}>
                <button
                  type="button"
                  style={{
                    padding: "14px 20px",
                    borderRadius: "8px",
                    background: "#25D366",
                    color: "#ffffff",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  onClick={() => window.open("https://wa.me/250788111222?text=Hello%20Management,%20I%20need%20staff%20support.", "_blank")}
                >
                  <span>💬</span> WhatsApp Salon Manager
                </button>
                <button
                  type="button"
                  style={{
                    padding: "14px 20px",
                    borderRadius: "8px",
                    background: "var(--lx-espresso)",
                    color: "#ffffff",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  onClick={() => setSupportModalOpen(true)}
                >
                  <span>📞</span> View Contact Details &amp; Hours
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {viewModalItem && (
        <AppointmentModal
          item={viewModalItem}
          services={services}
          canViewContacts={canViewContacts}
          onClose={() => setViewModalItem(null)}
          onUpdateStatus={changeStatus}
        />
      )}

      {qrModalOpen && (
        <QrCheckinModal
          appointments={mine}
          services={services}
          onClose={() => setQrModalOpen(false)}
          onCheckedIn={changeStatus}
        />
      )}

      {supportModalOpen && (
        <SupportModal onClose={() => setSupportModalOpen(false)} />
      )}

      {/* TOAST */}
      <div className={`stylist-toast${toast ? " visible" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

/* ==========================================================================
   PAGE ENTRY POINT
   ========================================================================== */

export default function Stylist() {
  const [version, bump] = useReducer(value => value + 1, 0);
  const [activeId, setActiveId] = useState(readSessionId);
  const data = useMemo(loadData, [version]);
  const profile = activeId ? data.profiles.find(person => person.id === activeId && person.active !== false) : null;

  // Live updates when admin or another tab changes shared data.
  useEffect(() => {
    window.addEventListener("storage", bump);
    window.addEventListener(LOCAL_CHANGE, bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener(LOCAL_CHANGE, bump);
    };
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = "Salon Management | Employee Dashboard";
    return () => { document.title = previous; };
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setActiveId(null);
  }, []);

  // Profile removed or deactivated elsewhere: end the session like the original.
  useEffect(() => {
    if (activeId && !profile) signOut();
  }, [activeId, profile, signOut]);

  const handleSignedIn = useCallback(id => {
    bump();
    setActiveId(id);
  }, []);

  return (
    <div className={`stylist-app${profile ? "" : " is-gate"}`}>
      {profile ? (
        <Workspace profile={profile} data={data} onSignOut={signOut} onChange={bump} />
      ) : (
        <Gate profiles={data.profiles} onSignedIn={handleSignedIn} />
      )}
    </div>
  );
}

