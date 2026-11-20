import { useState } from "react";
import { WEEK_KEYS } from "../../lib/adminData.js";
import { Empty, PageHeading, useAdmin } from "./ui.jsx";

const ACTIVE_STATUSES = ["booked", "confirmed", "in-progress"];
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");

async function hashPin(pin) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 150000, hash: "SHA-256" }, key, 256);
  return { pinSalt: salt, pinHash: hex(bits) };
}

function blankForm(services, settings, person = null) {
  const availability = person?.availability || {};
  return {
    original: person?.name || "",
    name: person?.name || "",
    specialty: person?.specialty || "",
    phone: person?.phone || "",
    commissionRate: person?.commissionRate ?? 0,
    pin: "",
    active: person?.active !== false,
    assigned: Array.isArray(person?.assignedServices) ? person.assignedServices : services.map(s => s.id),
    hours: Object.fromEntries(WEEK_KEYS.map(day => {
      const entry = availability[day];
      return [day, { available: entry ? entry.available !== false : true, start: entry?.start || settings.openTime, end: entry?.end || settings.closeTime }];
    }))
  };
}

export default function Staff() {
  const { staff, setStaff, services, appointments, settings, showToast } = useAdmin();
  const [form, setForm] = useState(() => blankForm(services, settings));
  const [editing, setEditing] = useState(false);
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const setHours = (day, patch) => setForm(current => ({ ...current, hours: { ...current.hours, [day]: { ...current.hours[day], ...patch } } }));
  const reset = () => { setForm(blankForm(services, settings)); setEditing(false); };
  const hasActive = person => appointments.some(item => item.stylist === person.name && ACTIVE_STATUSES.includes(item.status));

  const submit = async event => {
    event.preventDefault();
    const existing = staff.find(person => person.name === form.original);
    if (staff.some(person => person.id !== existing?.id && person.name.trim().toLowerCase() === form.name.trim().toLowerCase())) {
      showToast("A stylist with that name already exists."); return;
    }
    if (!form.assigned.length) { showToast("Assign at least one service to this employee."); return; }
    for (const day of WEEK_KEYS) {
      const { available, start, end } = form.hours[day];
      if (available && (!start || !end || start >= end)) { showToast(`Set valid working hours for ${day}, or mark the day OFF.`); return; }
    }
    const person = {
      ...existing,
      id: existing?.id || `stylist-${crypto.randomUUID()}`,
      name: form.name.trim(),
      specialty: form.specialty.trim(),
      phone: form.phone.trim(),
      commissionRate: Number(form.commissionRate) || 0,
      active: form.active,
      assignedServices: form.assigned,
      availability: form.hours
    };
    if (form.pin) {
      if (!/^\d{6,12}$/.test(form.pin)) { showToast("PIN must contain 6–12 digits."); return; }
      Object.assign(person, await hashPin(form.pin));
    }
    setStaff(form.original ? staff.map(item => (item.name === form.original ? person : item)) : [...staff, person]);
    reset();
    showToast("Employee saved.");
  };

  const toggle = person => {
    const nextActive = person.active === false;
    if (!nextActive && hasActive(person)) { showToast("Reassign this employee's active appointments before deactivating."); return; }
    setStaff(staff.map(item => (item.id === person.id ? { ...item, active: nextActive } : item)));
    showToast(nextActive ? "Employee activated." : "Employee deactivated.");
  };

  const remove = person => {
    if (hasActive(person)) { showToast("Reassign this stylist's upcoming appointments before deleting."); return; }
    if (!window.confirm(`Delete ${person.name} from the stylist list?`)) return;
    setStaff(staff.filter(item => item.id !== person.id));
  };

  return (
    <>
      <PageHeading eyebrow="Team" title="Employees">Stylist profiles, services, working hours, commission and sign-in PINs.</PageHeading>
      <div className="management-layout">
        <form className="panel stack" onSubmit={submit}>
          <h2>{editing ? "Edit stylist" : "Add stylist"}</h2>
          <div className="field"><label htmlFor="s-name">Name</label><input id="s-name" required maxLength={80} value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div className="field"><label htmlFor="s-spec">Specialty</label><input id="s-spec" maxLength={100} placeholder="Hair, nails, makeup" value={form.specialty} onChange={e => set("specialty", e.target.value)} /></div>
          <div className="field"><label htmlFor="s-phone">Phone (optional)</label><input id="s-phone" type="tel" maxLength={24} value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div className="field"><label htmlFor="s-comm">Commission rate (%)</label><input id="s-comm" type="number" min="0" max="100" step="0.5" required value={form.commissionRate} onChange={e => set("commissionRate", e.target.value)} /></div>
          <div className="field"><label htmlFor="s-pin">Employee access PIN {editing && "(leave blank to keep current)"}</label>
            <input id="s-pin" type="password" inputMode="numeric" minLength={6} maxLength={12} autoComplete="new-password" value={form.pin} onChange={e => set("pin", e.target.value)} placeholder="6–12 digits" /></div>
          <label className="check"><input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)} /> Active employee (available for bookings)</label>
          <fieldset>
            <legend>Assigned services</legend>
            <div className="check-grid">
              {services.map(service => (
                <label className="check" key={service.id}>
                  <input type="checkbox" checked={form.assigned.includes(service.id)} onChange={e => set("assigned", e.target.checked ? [...form.assigned, service.id] : form.assigned.filter(id => id !== service.id))} />
                  {service.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Weekly working hours</legend>
            {WEEK_KEYS.map(day => {
              const entry = form.hours[day];
              return (
                <div className="hours-row" key={day}>
                  <label className="check"><input type="checkbox" checked={entry.available} onChange={e => setHours(day, { available: e.target.checked })} /> {day[0].toUpperCase() + day.slice(1)}</label>
                  <input type="time" value={entry.start} disabled={!entry.available} aria-label={`${day} start time`} onChange={e => setHours(day, { start: e.target.value })} />
                  <input type="time" value={entry.end} disabled={!entry.available} aria-label={`${day} end time`} onChange={e => setHours(day, { end: e.target.value })} />
                  {!entry.available && <span className="meta">OFF</span>}
                </div>
              );
            })}
          </fieldset>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit">Save employee</button>
            <button className="btn btn-outline" type="button" onClick={reset}>Reset</button>
          </div>
        </form>

        <section className="panel">
          <h2>Team</h2>
          {staff.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Specialty</th><th>Phone</th><th>Commission</th><th>Access</th><th>Actions</th></tr></thead>
                <tbody>
                  {staff.map(person => {
                    const permissions = person.permissions || {};
                    const access = [permissions.viewCustomerContacts !== false ? "Contacts" : "No contacts", permissions.updateAppointments !== false ? "Status updates" : "Read only"].join(" · ");
                    const assigned = Array.isArray(person.assignedServices) ? person.assignedServices.map(id => services.find(s => s.id === id)?.name).filter(Boolean).join(", ") : "All services";
                    return (
                      <tr key={person.id}>
                        <td><strong>{person.name}</strong><small>{person.active === false ? "Inactive" : "Active"}</small></td>
                        <td>{person.specialty || "—"}</td>
                        <td>{person.phone || "—"}</td>
                        <td>{Number(person.commissionRate) > 0 ? `${Number(person.commissionRate)}%` : "Not set"}</td>
                        <td>{access}<small>{assigned} · {person.availability ? "Custom hours" : "Salon hours"} · {person.pinHash ? "PIN set" : "First sign-in setup"}</small></td>
                        <td>
                          <div className="btn-row">
                            <button type="button" className="btn btn-sm" onClick={() => { setForm(blankForm(services, settings, person)); setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                            <button type="button" className="btn btn-sm" onClick={() => toggle(person)}>{person.active === false ? "Activate" : "Deactivate"}</button>
                            <button type="button" className="btn btn-sm danger" onClick={() => remove(person)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty>No stylists yet.</Empty>}
        </section>
      </div>
    </>
  );
}
