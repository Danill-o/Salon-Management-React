import { useEffect, useMemo, useState } from "react";
import { KEYS } from "../lib/storage.js";
import {
  appointmentQrPayload, commitBooking, formatDate, formatPrice, formatTime,
  getBookableServices, getSettings, getStylists, localDate, loyaltySummary, serviceImage, slotGrid
} from "../lib/salon.js";
import { BRANCHES, PAYMENT_CHOICES, PHONE_HINT, normalizeRwandaPhone } from "../lib/rwanda.js";
import QrCode from "./QrCode.jsx";

const DEFAULT_AVATARS = {
  jean: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80",
  marie: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
  sarah: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80"
};

function stylistPhoto(stylist) {
  if (stylist?.avatar) return stylist.avatar;
  const name = String(stylist?.name || "").toLowerCase();
  if (name.includes("jean")) return DEFAULT_AVATARS.jean;
  if (name.includes("marie")) return DEFAULT_AVATARS.marie;
  if (name.includes("sarah")) return DEFAULT_AVATARS.sarah;
  return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80";
}

function readPendingDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(KEYS.pendingBooking) || "null");
  } catch {
    return null;
  }
}

export default function CustomerBookingPage({
  customer,
  version,
  preselectedServiceId,
  onBookingSuccess,
  onGoToAppointments
}) {
  const services = useMemo(getBookableServices, [version]);
  const stylists = useMemo(getStylists, [version]);
  const settings = useMemo(getSettings, [version]);
  const loyalty = useMemo(() => loyaltySummary(customer?.id), [customer?.id, version]);

  const [serviceCategory, setServiceCategory] = useState("all");
  const [serviceSearch, setServiceSearch] = useState("");

  const pending = useMemo(readPendingDraft, []);

  const [form, setForm] = useState(() => {
    return {
      serviceId: preselectedServiceId || pending?.serviceId || services[0]?.id || "",
      stylist: pending?.stylist || "any",
      date: pending?.date && pending.date >= localDate() ? pending.date : localDate(),
      time: pending?.time || "",
      branch: pending?.branch || settings.branches?.[0] || BRANCHES[0] || "Kigali - Downtown Atelier",
      paymentMethod: pending?.paymentMethod || "MTN Mobile Money",
      notes: pending?.notes || "",
      phone: customer?.phone || pending?.customerPhone || ""
    };
  });

  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tick, setTick] = useState(0);

  // Update preselected service if passed dynamically
  useEffect(() => {
    if (preselectedServiceId) {
      setForm(prev => ({ ...prev, serviceId: preselectedServiceId }));
    }
  }, [preselectedServiceId]);

  // Keep phone synced with customer profile
  useEffect(() => {
    if (customer?.phone && !form.phone) {
      setForm(prev => ({ ...prev, phone: customer.phone }));
    }
  }, [customer?.phone]);

  const selectedService = useMemo(
    () => services.find(s => s.id === form.serviceId) || services[0],
    [services, form.serviceId]
  );

  const categories = useMemo(() => {
    const list = Array.from(new Set(services.map(s => s.category).filter(Boolean)));
    return ["all", ...list];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchCat = serviceCategory === "all" || s.category?.toLowerCase() === serviceCategory.toLowerCase();
      const matchSearch = !serviceSearch.trim() ||
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.description?.toLowerCase().includes(serviceSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [services, serviceCategory, serviceSearch]);

  // Dynamic slot grid computed based on service, stylist working hours, breaks, and existing appointments
  const grid = useMemo(() => {
    if (!selectedService || !form.stylist || !form.date) return [];
    return slotGrid({
      service: selectedService,
      stylist: form.stylist,
      date: form.date
    });
  }, [selectedService, form.stylist, form.date, version, tick]);

  const availableSlots = useMemo(() => grid.filter(s => s.status === "available"), [grid]);

  // Reset selected time if it's no longer available on date/stylist change
  useEffect(() => {
    if (form.time && !availableSlots.some(s => s.time === form.time)) {
      setForm(prev => ({ ...prev, time: "" }));
    }
  }, [grid, availableSlots]);

  // Quick date shortcuts
  const todayStr = localDate();
  const dateOptions = useMemo(() => {
    const now = new Date();
    const list = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const val = localDate(d);
      let label = "Today";
      if (i === 1) label = "Tomorrow";
      else if (i === 2) label = "+2 Days";
      else if (i === 3) label = d.toLocaleDateString("en-RW", { weekday: "short", month: "short", day: "numeric" });
      list.push({ label, value: val });
    }
    return list;
  }, []);

  const price = selectedService ? Number(selectedService.price || 0) : 0;
  const discountAmount = loyalty.discountPercent > 0 ? Math.round(price * (loyalty.discountPercent / 100)) : 0;
  const finalPrice = Math.max(0, price - discountAmount);

  const selectedStylistObj = useMemo(() => {
    if (form.stylist === "any") return null;
    return stylists.find(s => s.name === form.stylist) || null;
  }, [stylists, form.stylist]);

  const handleSubmit = async e => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedService) {
      setErrorMessage("Please select a salon service.");
      return;
    }
    if (!form.stylist) {
      setErrorMessage("Please select a stylist or choose 'Any Available Stylist'.");
      return;
    }
    if (!form.date) {
      setErrorMessage("Please select an appointment date.");
      return;
    }
    if (!form.time) {
      setErrorMessage("Please select an available time slot for your appointment.");
      return;
    }

    const validPhone = normalizeRwandaPhone(form.phone || customer?.phone);
    if (!validPhone) {
      setErrorMessage(`Please provide a valid Rwandan phone number (${PHONE_HINT}).`);
      return;
    }

    // Save pending draft to ensure continuity
    try {
      sessionStorage.setItem(KEYS.pendingBooking, JSON.stringify({
        ...form,
        customerName: customer.name,
        customerPhone: validPhone
      }));
    } catch {
      // ignore
    }

    setIsSubmitting(true);

    try {
      const result = await commitBooking({
        customer: {
          ...customer,
          phone: validPhone
        },
        service: selectedService,
        draft: {
          ...form,
          phone: validPhone,
          customerPhone: validPhone
        }
      });

      if (result.status === "unavailable") {
        setTick(t => t + 1);
        setErrorMessage("That time slot is no longer available. Please select another time or stylist.");
        setIsSubmitting(false);
        return;
      }

      if (result.status === "storage-error") {
        setErrorMessage("Could not save appointment due to local storage constraints. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Success! Clear pending booking draft
      try { sessionStorage.removeItem(KEYS.pendingBooking); } catch { /* ignore */ }

      setConfirmedBooking(result.appointment);
      setIsSubmitting(false);
      if (onBookingSuccess) {
        onBookingSuccess(result.appointment);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to confirm booking. Please try again.");
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (confirmedBooking) {
    return (
      <div className="cb-success-wrapper">
        <div className="cb-success-card">
          <div className="cb-success-badge">✓ APPOINTMENT CONFIRMED</div>
          <h2 className="cb-success-title">Your Chair is Reserved!</h2>
          <p className="cb-success-sub">
            We are excited to welcome you, <strong>{customer.name}</strong>. A confirmation has been generated and added to your appointments.
          </p>

          <div className="cb-success-qr-box">
            <QrCode
              value={appointmentQrPayload(confirmedBooking)}
              size={180}
              label="Salon Appointment Check-In QR Code"
            />
            <span className="cb-success-qr-ref">Booking Ref: <strong>{confirmedBooking.id}</strong></span>
            <small style={{ color: "#78716c", fontSize: "0.82rem" }}>Show this QR code at the salon reception upon arrival for fast check-in.</small>
          </div>

          <div className="cb-success-details-grid">
            <div className="cb-success-detail-item">
              <span className="cb-label">Service</span>
              <span className="cb-value">💇 {confirmedBooking.serviceName}</span>
            </div>
            <div className="cb-success-detail-item">
              <span className="cb-label">Stylist</span>
              <span className="cb-value">✂️ {confirmedBooking.stylist}</span>
            </div>
            <div className="cb-success-detail-item">
              <span className="cb-label">Date &amp; Time</span>
              <span className="cb-value">📅 {formatDate(confirmedBooking.date)} at {formatTime(confirmedBooking.time)}</span>
            </div>
            <div className="cb-success-detail-item">
              <span className="cb-label">Location</span>
              <span className="cb-value">📍 {confirmedBooking.branch}</span>
            </div>
            <div className="cb-success-detail-item">
              <span className="cb-label">Total Amount</span>
              <span className="cb-value cb-price">{formatPrice(confirmedBooking.servicePrice)}</span>
            </div>
            <div className="cb-success-detail-item">
              <span className="cb-label">Payment Method</span>
              <span className="cb-value">💳 {confirmedBooking.paymentMethod}</span>
            </div>
          </div>

          <div className="cb-success-actions">
            <button
              type="button"
              className="cb-btn-primary"
              onClick={() => onGoToAppointments && onGoToAppointments()}
            >
              📅 View in My Appointments →
            </button>
            <button
              type="button"
              className="cb-btn-secondary"
              onClick={() => {
                setConfirmedBooking(null);
                setForm(prev => ({ ...prev, time: "" }));
              }}
            >
              + Book Another Service
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cb-booking-page">
      {/* Hero Intro Banner */}
      <div className="cb-hero-banner">
        <div className="cb-hero-content">
          <span className="cb-hero-eyebrow">BESPOKE BEAUTY &amp; ATELIER</span>
          <h1 className="cb-hero-title">Book an Appointment</h1>
          <p className="cb-hero-desc">
            Reserve your luxury session with our dedicated master stylists. Choose your desired treatment, select your stylist, and pick a convenient time.
          </p>
        </div>
        <div className="cb-hero-pill-badge">
          <span>✨</span>
          <div>
            <strong>Instant Confirmation</strong>
            <small>Free cancellation up to 2 hours before</small>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="cb-alert-error" role="alert">
          <span className="cb-alert-icon">⚠️</span>
          <div className="cb-alert-text">{errorMessage}</div>
        </div>
      )}

      {/* Main 2-Column Booking Layout */}
      <form className="cb-layout-grid" onSubmit={handleSubmit}>
        {/* LEFT COLUMN: FORM SECTIONS */}
        <div className="cb-form-column">
          {/* 1. Customer Information Card */}
          <div className="cb-section-card">
            <div className="cb-section-header">
              <span className="cb-section-number">1</span>
              <div>
                <h2 className="cb-section-title">Client Information</h2>
                <p className="cb-section-subtitle">Auto-filled from your registered client account</p>
              </div>
            </div>

            <div className="cb-client-info-box">
              <div className="cb-client-avatar">
                {customer?.name ? customer.name.slice(0, 2).toUpperCase() : "CL"}
              </div>
              <div className="cb-client-details">
                <div className="cb-client-name">
                  <strong>{customer?.name || "Valued Client"}</strong>
                  <span className="cb-verified-chip">✓ Verified Account</span>
                </div>
                <div className="cb-client-meta">
                  <span>✉️ {customer?.email || "—"}</span>
                  <span>📱 {form.phone || customer?.phone || "No phone on file"}</span>
                </div>
                {loyalty.points > 0 && (
                  <div className="cb-loyalty-chip">
                    ⭐ {loyalty.points} Loyalty Points ({loyalty.discountPercent}% Off Available)
                  </div>
                )}
              </div>
            </div>

            <div className="cb-field-row" style={{ marginTop: "16px" }}>
              <div className="cb-field-group">
                <label htmlFor="cb-phone-input">Contact Phone (for SMS / WhatsApp confirmation)</label>
                <input
                  id="cb-phone-input"
                  type="tel"
                  className="cb-input"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. 0788123456 or +250 788 123 456"
                  required
                />
                <small className="cb-field-hint">Used for appointment reminders and reception check-in.</small>
              </div>
            </div>
          </div>

          {/* 2. Service Selection Card */}
          <div className="cb-section-card">
            <div className="cb-section-header">
              <span className="cb-section-number">2</span>
              <div>
                <h2 className="cb-section-title">Select Service</h2>
                <p className="cb-section-subtitle">Choose from our luxury hair, beauty, nails and wellness offerings</p>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="cb-service-controls">
              <div className="cb-cat-pills">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`cb-cat-pill${serviceCategory === cat ? " is-active" : ""}`}
                    onClick={() => setServiceCategory(cat)}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="cb-service-search"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
              />
            </div>

            {/* Service Cards Grid */}
            <div className="cb-services-grid">
              {filteredServices.map(service => {
                const isSelected = form.serviceId === service.id;
                const img = serviceImage(service);
                return (
                  <div
                    key={service.id}
                    className={`cb-service-card${isSelected ? " is-selected" : ""}`}
                    onClick={() => setForm(prev => ({ ...prev, serviceId: service.id }))}
                  >
                    <div className="cb-service-card-media">
                      <img src={img.src} alt={img.alt} className="cb-service-card-img" loading="lazy" />
                      <span className="cb-service-cat-badge">{service.category || "Hair"}</span>
                    </div>
                    <div className="cb-service-card-content">
                      <div className="cb-service-card-top">
                        <span className="cb-service-duration">⏱️ {service.duration} min</span>
                      </div>
                      <h3 className="cb-service-name">{service.name}</h3>
                      <p className="cb-service-desc">{service.description || "Professional salon service."}</p>
                      <div className="cb-service-card-bottom">
                        <span className="cb-service-price">{formatPrice(service.price)}</span>
                        <span className="cb-select-indicator">
                          {isSelected ? "✓ Selected" : "Select"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Choose Stylist Card */}
          <div className="cb-section-card">
            <div className="cb-section-header">
              <span className="cb-section-number">3</span>
              <div>
                <h2 className="cb-section-title">Choose Stylist</h2>
                <p className="cb-section-subtitle">Select your favorite specialist or pick any available master artist</p>
              </div>
            </div>

            <div className="cb-stylists-grid">
              {/* Option: Any Available Stylist */}
              <div
                className={`cb-stylist-card${form.stylist === "any" ? " is-selected" : ""}`}
                onClick={() => setForm(prev => ({ ...prev, stylist: "any" }))}
              >
                <div className="cb-stylist-any-avatar">⚡</div>
                <div className="cb-stylist-info">
                  <strong className="cb-stylist-name">Any Available Stylist</strong>
                  <span className="cb-stylist-role">Fastest appointment slot</span>
                  <span className="cb-stylist-badge active">● Best Availability</span>
                </div>
              </div>

              {/* Individual Stylists */}
              {stylists.map(stylist => {
                const isSelected = form.stylist === stylist.name;
                const photo = stylistPhoto(stylist);
                const isBusy = stylist.workStatus === "busy";
                return (
                  <div
                    key={stylist.id}
                    className={`cb-stylist-card${isSelected ? " is-selected" : ""}`}
                    onClick={() => setForm(prev => ({ ...prev, stylist: stylist.name }))}
                  >
                    <img
                      src={photo}
                      alt={stylist.name}
                      className="cb-stylist-photo"
                      loading="lazy"
                    />
                    <div className="cb-stylist-info">
                      <div className="cb-stylist-name-row">
                        <strong className="cb-stylist-name">{stylist.name}</strong>
                        <span className="cb-stylist-rating">⭐ {stylist.rating || 4.8}</span>
                      </div>
                      <span className="cb-stylist-role">{stylist.specialty || "Master Stylist"}</span>
                      <span className={`cb-stylist-badge ${isBusy ? "busy" : "active"}`}>
                        ● {isBusy ? "In Service" : "Available Today"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Select Date Card */}
          <div className="cb-section-card">
            <div className="cb-section-header">
              <span className="cb-section-number">4</span>
              <div>
                <h2 className="cb-section-title">Select Appointment Date</h2>
                <p className="cb-section-subtitle">Pick a convenient day for your styling session</p>
              </div>
            </div>

            {/* Quick Date Presets */}
            <div className="cb-date-presets">
              {dateOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`cb-date-pill${form.date === opt.value ? " is-active" : ""}`}
                  onClick={() => setForm(prev => ({ ...prev, date: opt.value }))}
                >
                  <span className="cb-date-pill-label">{opt.label}</span>
                  <span className="cb-date-pill-val">{formatDate(opt.value)}</span>
                </button>
              ))}
            </div>

            <div className="cb-field-group" style={{ marginTop: "14px" }}>
              <label htmlFor="cb-date-picker">Or choose a custom date:</label>
              <input
                id="cb-date-picker"
                type="date"
                className="cb-input cb-date-input"
                min={todayStr}
                value={form.date}
                onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* 5. Available Time Slots Card */}
          <div className="cb-section-card">
            <div className="cb-section-header">
              <span className="cb-section-number">5</span>
              <div>
                <h2 className="cb-section-title">Available Time Slots</h2>
                <p className="cb-section-subtitle">
                  {availableSlots.length
                    ? `${availableSlots.length} available slots for ${form.stylist === "any" ? "any stylist" : form.stylist} on ${formatDate(form.date)}`
                    : `Checking schedule for ${formatDate(form.date)}...`}
                </p>
              </div>
            </div>

            {availableSlots.length > 0 ? (
              <div className="cb-slots-grid">
                {grid.map(slot => {
                  const isAvailable = slot.status === "available";
                  const isSelected = form.time === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!isAvailable}
                      className={`cb-time-slot${isSelected ? " is-selected" : ""}${!isAvailable ? ` is-${slot.status}` : ""}`}
                      onClick={() => isAvailable && setForm(prev => ({ ...prev, time: slot.time }))}
                      title={slot.status === "booked" ? "Already booked" : slot.status === "break" ? "Staff lunch break" : "Available"}
                    >
                      <span className="cb-slot-time">{formatTime(slot.time)}</span>
                      <span className="cb-slot-status">
                        {isAvailable ? "Open" : slot.status === "booked" ? "Booked" : slot.status === "break" ? "Break" : "Past"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="cb-no-slots">
                <span className="cb-no-slots-icon">🕒</span>
                <p>No available slots match this stylist's working schedule on {formatDate(form.date)}.</p>
                <small>Try choosing another date above or selecting <strong>Any Available Stylist</strong>.</small>
              </div>
            )}
          </div>

          {/* 6. Special Requests & Preferences Card */}
          <div className="cb-section-card">
            <div className="cb-section-header">
              <span className="cb-section-number">6</span>
              <div>
                <h2 className="cb-section-title">Special Requests &amp; Branch</h2>
                <p className="cb-section-subtitle">Provide instructions for your stylist and pick your salon branch</p>
              </div>
            </div>

            <div className="cb-field-row">
              <div className="cb-field-group">
                <label htmlFor="cb-branch">Salon Branch Location</label>
                <select
                  id="cb-branch"
                  className="cb-input"
                  value={form.branch}
                  onChange={e => setForm(prev => ({ ...prev, branch: e.target.value }))}
                >
                  {(settings.branches || BRANCHES).map((b, idx) => (
                    <option key={`branch-${b}-${idx}`} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="cb-field-group">
                <label htmlFor="cb-payment">Preferred Payment Method</label>
                <select
                  id="cb-payment"
                  className="cb-input"
                  value={form.paymentMethod}
                  onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  {PAYMENT_CHOICES.map((c, idx) => (
                    <option key={`pay-${c.value}-${idx}`} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="cb-field-group" style={{ marginTop: "14px" }}>
              <label htmlFor="cb-notes">Special Requests &amp; Notes (Optional)</label>
              <textarea
                id="cb-notes"
                className="cb-textarea"
                rows="3"
                placeholder="Mention hair length preferences, scalp sensitivity, preferred extension color, or any questions..."
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                maxLength="300"
              />
              <small className="cb-field-hint">{form.notes.length}/300 characters</small>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY BOOKING SUMMARY */}
        <div className="cb-summary-column">
          <div className="cb-summary-card">
            <div className="cb-summary-header">
              <div className="cb-summary-brand">
                <span className="cb-summary-mark">✂</span>
                <div>
                  <strong>SALON MANAGEMENT</strong>
                  <span>RESERVATION SUMMARY</span>
                </div>
              </div>
            </div>

            <div className="cb-summary-body">
              {/* Selected Service Row */}
              <div className="cb-summary-item">
                <span className="cb-summary-label">Selected Service</span>
                <div className="cb-summary-val-group">
                  <strong>{selectedService?.name || "No service selected"}</strong>
                  <span className="cb-summary-sub">
                    {selectedService?.category} · ⏱️ {selectedService?.duration || 0} min
                  </span>
                </div>
              </div>

              {/* Selected Stylist Row */}
              <div className="cb-summary-item">
                <span className="cb-summary-label">Stylist</span>
                <div className="cb-summary-val-group">
                  <strong>
                    {form.stylist === "any" ? "⚡ Any Available Stylist" : form.stylist}
                  </strong>
                  {selectedStylistObj && (
                    <span className="cb-summary-sub">
                      {selectedStylistObj.specialty} · ⭐ {selectedStylistObj.rating}
                    </span>
                  )}
                </div>
              </div>

              {/* Date & Time Row */}
              <div className="cb-summary-item">
                <span className="cb-summary-label">Date &amp; Time</span>
                <div className="cb-summary-val-group">
                  <strong>📅 {formatDate(form.date)}</strong>
                  <span className="cb-summary-sub">
                    {form.time ? `🕒 ${formatTime(form.time)}` : "Select a time slot"}
                  </span>
                </div>
              </div>

              {/* Location & Client Row */}
              <div className="cb-summary-item">
                <span className="cb-summary-label">Location</span>
                <div className="cb-summary-val-group">
                  <span>📍 {form.branch}</span>
                </div>
              </div>

              <div className="cb-summary-item">
                <span className="cb-summary-label">Client</span>
                <div className="cb-summary-val-group">
                  <span>👤 {customer.name} ({form.phone || customer.phone || "No phone"})</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="cb-summary-divider" />

              <div className="cb-pricing-row">
                <span>Service Price</span>
                <span>{formatPrice(price)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="cb-pricing-row cb-discount-row">
                  <span>Loyalty Discount ({loyalty.discountPercent}%)</span>
                  <span>- {formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="cb-pricing-row cb-total-row">
                <strong>Total Amount</strong>
                <strong className="cb-total-price">{formatPrice(finalPrice)}</strong>
              </div>

              {/* Confirm Button */}
              <button
                type="submit"
                className="cb-btn-confirm"
                disabled={isSubmitting || !selectedService || !form.stylist || !form.date || !form.time}
              >
                {isSubmitting ? "Confirming Booking..." : "✓ Confirm Appointment"}
              </button>

              {!form.time && (
                <p className="cb-hint-missing">
                  👉 Please choose an available start time from Section 5 to confirm.
                </p>
              )}

              <div className="cb-summary-footer-notes">
                <p>🔒 Instant booking confirmed directly in our salon management database.</p>
                <p>💬 You will receive full appointment details and check-in QR code immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
