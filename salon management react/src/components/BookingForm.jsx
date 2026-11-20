import { useEffect, useMemo, useState } from "react";
import { KEYS } from "../lib/storage.js";
import {
  appointmentQrPayload, commitBooking, formatDate, formatPrice, formatTime, getBookableServices, getSettings,
  getStylists, localDate, slotGrid
} from "../lib/salon.js";
import { PAYMENT_CHOICES, PHONE_HINT, normalizeRwandaPhone } from "../lib/rwanda.js";
import { useLang } from "../lib/i18n.jsx";
import QrCode from "./QrCode.jsx";

function readPending() {
  try { return JSON.parse(sessionStorage.getItem(KEYS.pendingBooking) || "null"); } catch { return null; }
}

export default function BookingForm({ customer, version, bookingRequest, onNeedLogin }) {
  const services = useMemo(getBookableServices, [version]);
  const stylists = useMemo(getStylists, [version]);
  const [form, setForm] = useState(() => {
    const pending = readPending();
    return {
      serviceId: pending?.serviceId || "",
      stylist: pending?.stylist || "",
      date: pending?.date && pending.date >= localDate() ? pending.date : localDate(),
      time: pending?.time || "",
      customerName: pending?.customerName || "",
      customerPhone: pending?.customerPhone || ""
    };
  });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [confirmed, setConfirmed] = useState(null);
  const { t } = useLang();
  const branches = useMemo(() => getSettings().branches || [], [version]);

  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!customer) return;
    setForm(current => ({
      ...current,
      customerName: current.customerName || customer.name,
      customerPhone: current.customerPhone || customer.phone
    }));
  }, [customer]);

  useEffect(() => {
    if (bookingRequest?.serviceId) setForm(current => ({ ...current, serviceId: bookingRequest.serviceId }));
  }, [bookingRequest]);

  const service = services.find(item => item.id === form.serviceId);
  const grid = useMemo(
    () => (service && form.stylist ? slotGrid({ service, stylist: form.stylist, date: form.date }) : []),
    [service, form.stylist, form.date, version, tick]
  );
  const times = grid.filter(slot => slot.status === "available").map(slot => slot.time);

  useEffect(() => {
    if (form.time && !times.includes(form.time)) set("time", "");
  }, [grid]);

  const submit = async event => {
    event.preventDefault();
    setMessage(null);
    if (!service || !form.stylist || !form.date || !form.time) {
      setMessage({ error: true, text: "Choose a service, stylist, date and an available time." });
      return;
    }
    const phone = normalizeRwandaPhone(form.customerPhone);
    if (!phone) {
      setMessage({ error: true, text: PHONE_HINT });
      return;
    }
    set("customerPhone", phone);
    try { sessionStorage.setItem(KEYS.pendingBooking, JSON.stringify(form)); }
    catch {
      setMessage({ error: true, text: "Your browser could not keep this booking. Enable session storage and try again." });
      return;
    }
    if (!customer) {
      onNeedLogin();
      return;
    }

    setBusy(true);
    try {
      const result = await commitBooking({ customer, service, draft: { ...form, customerPhone: phone } });
      if (result.status === "unavailable") {
        setTick(value => value + 1);
        setMessage({ error: true, text: "That time is no longer available. Choose another time or stylist." });
      } else if (result.status === "storage-error") {
        setMessage({ error: true, text: "Could not save your booking. Check browser storage settings and try again." });
      } else {
        try { sessionStorage.removeItem(KEYS.pendingBooking); } catch { /* storage disabled */ }
        setConfirmed(result.appointment);
        setBusy(false);
        return;
      }
    } catch (error) {
      setMessage({ error: true, text: error.message || "The booking could not be saved. Please try again." });
    }
    setBusy(false);
  };

  if (confirmed) {
    return (
      <div className="booking-confirmed">
        <h3>✅ {t("Appointment Confirmed")}</h3>
        <p><strong>{confirmed.customer}</strong> · {confirmed.serviceName}</p>
        <p>{confirmed.stylist} · {formatDate(confirmed.date)} · {formatTime(confirmed.time)}{confirmed.branch ? ` · ${confirmed.branch}` : ""}</p>
        <QrCode value={appointmentQrPayload(confirmed)} size={180} label="Booking QR code" />
        <p className="form-note">{t("Show this QR code at the salon to check in.")}</p>
        <div className="booking-confirmed-actions">
          <a className="btn btn-primary" href="#/account">{t("View my appointments")}</a>
          <button type="button" className="btn btn-outline" onClick={() => { setConfirmed(null); set("time", ""); }}>{t("Book another")}</button>
        </div>
      </div>
    );
  }

  const note = !service || !form.stylist
    ? "Choose a service, stylist and date to view available times."
    : times.length
      ? `${times.length} available start times for ${form.stylist === "any" ? "any stylist" : form.stylist}.`
      : "No times match this stylist's schedule. Try another date or stylist.";

  return (
    <form className="booking-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="booking-service">Service</label>
        <select id="booking-service" required value={form.serviceId} onChange={e => set("serviceId", e.target.value)}>
          <option value="">Select service</option>
          {services.map(item => (
            <option key={item.id} value={item.id}>{item.name} • {formatPrice(item.price)}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="booking-stylist">Stylist</label>
        <select id="booking-stylist" required value={form.stylist} onChange={e => set("stylist", e.target.value)}>
          <option value="">Select stylist</option>
          <option value="any">Any available stylist</option>
          {stylists.map(person => <option key={person.id} value={person.name}>{person.name} — {person.specialty}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="booking-date">Date</label>
        <input id="booking-date" type="date" required min={localDate()} value={form.date} onChange={e => set("date", e.target.value)} />
      </div>
      <div className="field full">
        <label>{t("Time")}</label>
        {grid.length ? (
          <div className="slot-grid" role="listbox" aria-label="Time slots">
            {grid.map(slot => (
              <button
                key={slot.time}
                type="button"
                role="option"
                aria-selected={form.time === slot.time}
                disabled={slot.status !== "available"}
                className={`slot slot-${slot.status}${form.time === slot.time ? " is-selected" : ""}`}
                onClick={() => set("time", slot.time)}
              >
                {formatTime(slot.time)} {slot.status === "available" ? "✅" : slot.status === "booked" ? "❌" : slot.status === "break" ? "☕" : ""}
                {slot.status === "booked" && <small>{t("Booked")}</small>}
                {slot.status === "break" && <small>{t("Break")}</small>}
              </button>
            ))}
          </div>
        ) : <p className="form-note">{t("Select a service, stylist and date first")}</p>}
      </div>
      {branches.length > 0 && (
        <div className="field">
          <label htmlFor="booking-branch">{t("Branch")}</label>
          <select id="booking-branch" value={form.branch || ""} onChange={e => set("branch", e.target.value)}>
            <option value="">{t("Select branch")}</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="booking-pay">{t("Payment method")}</label>
        <select id="booking-pay" value={form.paymentMethod || ""} onChange={e => set("paymentMethod", e.target.value)}>
          <option value="">{t("Choose later")}</option>
          {PAYMENT_CHOICES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="field full">
        <label htmlFor="booking-notes">{t("Notes / preferences")}</label>
        <input id="booking-notes" maxLength={300} value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="booking-name">Full name</label>
        <input id="booking-name" required minLength={2} autoComplete="name" value={form.customerName} onChange={e => set("customerName", e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="booking-phone">Phone</label>
        <input id="booking-phone" required type="tel" minLength={9} placeholder="+250 78X XXX XXX" autoComplete="tel" value={form.customerPhone} onChange={e => set("customerPhone", e.target.value)} />
      </div>
      {service && (
        <div className="full booking-service-preview" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 1.2rem",
          background: "var(--bg-subtle)",
          borderRadius: "10px",
          border: "1px solid var(--gold-border)",
          fontSize: "0.9rem"
        }}>
          <div>
            <strong style={{ color: "var(--brand-dark)" }}>{service.name}</strong>
            <span style={{ color: "var(--muted)", marginLeft: "8px" }}>· {service.duration} mins ({service.category || "Salon"})</span>
          </div>
          <strong style={{ color: "var(--brand)", fontSize: "1.05rem" }}>{formatPrice(service.price)}</strong>
        </div>
      )}
      <p className="form-note full">{note}</p>
      {message && <p className={`form-message full${message.error ? " is-error" : ""}`} role="status">{message.text}</p>}
      <div className="full" style={{ marginTop: "0.5rem" }}>
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "0.85rem 1.6rem" }}>
          {busy ? "Securing your appointment…" : customer ? "Confirm Appointment Reservation ↗" : "Sign in to Reserve Appointment ↗"}
        </button>
        {!customer && <span className="form-note" style={{ display: "block", marginTop: "8px", textAlign: "center" }}> You will be invited to sign in or create an account; your selections are kept.</span>}
      </div>
    </form>
  );
}
