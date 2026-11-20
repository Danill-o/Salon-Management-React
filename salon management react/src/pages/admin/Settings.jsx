import { useState } from "react";
import { PageHeading, useAdmin } from "./ui.jsx";
import { seedSampleData } from "../../lib/sampleData.js";

export default function Settings() {
  const { settings, setSettings, showToast } = useAdmin();
  const [form, setForm] = useState({ name: settings.name, phone: settings.phone || "", email: settings.email || "", openTime: settings.openTime, closeTime: settings.closeTime });
  const [message, setMessage] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = event => {
    event.preventDefault();
    if (form.closeTime <= form.openTime) {
      setMessage({ text: "Closing time must be later than opening time.", error: true });
      return;
    }
    setSettings({ ...settings, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), openTime: form.openTime, closeTime: form.closeTime });
    setMessage({ text: "Settings saved. Customers see the new hours when the booking page next loads." });
  };

  const handleSeed = () => {
    if (window.confirm("Reload comprehensive realistic sample data? This will populate active appointments, employees, customers, payments, inventory, expenses and reviews across all dashboards.")) {
      setSeeding(true);
      try {
        seedSampleData(true);
        showToast("Realistic sample data reloaded successfully! Reloading in 1s...");
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        showToast("Error reloading data: " + err.message);
        setSeeding(false);
      }
    }
  };

  return (
    <>
      <PageHeading eyebrow="Business details" title="Settings">Opening hours drive booking availability.</PageHeading>
      <form className="panel stack narrow-panel" onSubmit={submit}>
        <h2>Salon information</h2>
        <div className="field"><label htmlFor="st-name">Salon name</label><input id="st-name" required maxLength={100} value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div className="field"><label htmlFor="st-phone">Contact phone</label><input id="st-phone" type="tel" maxLength={30} value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
        <div className="field"><label htmlFor="st-email">Contact email</label><input id="st-email" type="email" maxLength={160} value={form.email} onChange={e => set("email", e.target.value)} /></div>
        <div className="field"><label htmlFor="st-open">Opens at</label><input id="st-open" type="time" required value={form.openTime} onChange={e => set("openTime", e.target.value)} /></div>
        <div className="field"><label htmlFor="st-close">Closes at</label><input id="st-close" type="time" required value={form.closeTime} onChange={e => set("closeTime", e.target.value)} /></div>
        {message && <p className={`form-message${message.error ? " is-error" : ""}`} role="status">{message.text}</p>}
        <div><button className="btn btn-primary" type="submit">Save settings</button></div>
      </form>

      <section className="panel stack narrow-panel" style={{ marginTop: "24px" }}>
        <h2>Realistic Sample Data</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          Populate all 3 dashboards (Customer Portal, Stylist/Employee Workspace, and Admin Management) with realistic bookings for today and this week, MoMo payments, stock levels, expenses, customer profiles, and service photos.
        </p>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: "#7a3e1d", borderColor: "#7a3e1d" }}
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? "Populating Data..." : "⚡ Seed / Reset Realistic Sample Data"}
          </button>
        </div>
      </section>
    </>
  );
}
