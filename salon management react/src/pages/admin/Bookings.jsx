import { useState } from "react";
import { publishEvent } from "../../lib/notifications.js";
import { localDate } from "../../lib/salon.js";
import { messagingPhone, sumBy } from "../../lib/adminData.js";
import { Empty, PageHeading, money, shortDate, shortTime, statusLabel, useAdmin } from "./ui.jsx";

const STATUSES = ["booked", "confirmed", "in-progress", "completed", "cancelled"];
const EVENT_FOR_STATUS = {
  cancelled: "cancellation", confirmed: "appointment-confirmed", "in-progress": "appointment-in-progress",
  completed: "appointment-completed", booked: "booking-created"
};

export default function Bookings() {
  const { appointments, setAppointments, services, payments, settings, showToast } = useAdmin();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(null);

  const serviceOf = item => services.find(s => s.id === item.serviceId);
  const rows = appointments
    .filter(item => !selected || item.date === selected)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const year = month.getFullYear();
  const mon = month.getMonth();
  const offset = (new Date(year, mon, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, index) => new Date(year, mon, index - offset + 1));

  const shiftMonth = delta => {
    setMonth(new Date(year, mon + delta, 1));
    setSelected(null);
  };

  const paymentState = (item, total) => {
    if (item.status === "cancelled") return ["Cancelled", "low"];
    const paid = sumBy(payments.filter(p => p.appointmentId === item.id), p => p.amount);
    if (paid <= 0) return ["Unpaid", "low"];
    return paid < total ? ["Partial", "partial"] : ["Paid", "ok"];
  };

  const changeStatus = (item, status) => {
    if (!STATUSES.includes(status) || status === item.status) return;
    setAppointments(appointments.map(row => (row.id === item.id ? { ...row, status } : row)));
    showToast("Appointment status updated.");
    if (item.customerId) {
      publishEvent(EVENT_FOR_STATUS[status], {
        appointmentId: item.id, customerId: item.customerId, customerName: item.customer, stylist: item.stylist,
        serviceName: item.serviceName || serviceOf(item)?.name, date: item.date, time: item.time
      });
    }
  };

  return (
    <>
      <PageHeading eyebrow="Appointments" title="Bookings">Review the calendar, confirm bookings and update their status.</PageHeading>

      <section className="panel">
        <div className="panel-head">
          <h2>{month.toLocaleDateString("en-RW", { month: "long", year: "numeric" })}</h2>
          <div className="btn-row">
            <button type="button" className="btn btn-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
            <button type="button" className="btn btn-sm" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
            <button type="button" className="btn btn-sm" onClick={() => setSelected(null)}>Clear filter</button>
          </div>
        </div>
        <p className="form-note">{selected ? `Bookings for ${shortDate(selected)}.` : "Select a date to filter bookings."}</p>
        <div className="calendar" role="grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span className="calendar-dow" key={day}>{day}</span>)}
          {cells.map(date => {
            const key = localDate(date);
            const count = appointments.filter(item => item.date === key && item.status !== "cancelled").length;
            const label = date.toLocaleDateString("en-RW", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
            return (
              <button
                key={key}
                type="button"
                className={`calendar-day${date.getMonth() === mon ? "" : " outside"}${key === localDate() ? " is-today" : ""}${selected === key ? " is-selected" : ""}`}
                aria-pressed={selected === key}
                aria-label={`${label}, ${count} appointments`}
                onClick={() => setSelected(key)}
              >
                <b>{date.getDate()}</b>
                <small>{count ? `${count} booking${count === 1 ? "" : "s"}` : ""}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Appointments</h2>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Customer</th><th>Service</th><th>Stylist</th><th>When</th><th>Price</th><th>Payment</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map(item => {
                  const total = Number(item.servicePrice ?? serviceOf(item)?.price ?? 0);
                  const [label, tone] = paymentState(item, total);
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.customer}</strong><small>{item.phone}</small></td>
                      <td>{item.serviceName || serviceOf(item)?.name || "Service"}</td>
                      <td>{item.stylist}</td>
                      <td>{shortDate(item.date)}<small>{shortTime(item.time)}</small></td>
                      <td>{money(total)}</td>
                      <td><span className={`pill ${tone}`}>{label}</span></td>
                      <td>
                        <select className="status-select" value={item.status} aria-label={`Status for ${item.customer}`} onChange={e => changeStatus(item, e.target.value)}>
                          {STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Empty>No appointments {selected ? "on this date" : "yet"}.</Empty>}
      </section>

      <section className="panel">
        <h2>Customer reminders</h2>
        {rows.filter(item => item.status !== "cancelled").map(item => {
          const phone = messagingPhone(item.phone);
          const name = item.serviceName || serviceOf(item)?.name || "salon appointment";
          const message = encodeURIComponent(`Hi ${item.customer}, a reminder for your ${name} at ${settings.name} on ${shortDate(item.date)} at ${shortTime(item.time)}. Reply if you need to reschedule.`);
          return (
            <div className="list-row" key={item.id}>
              <div><strong>{item.customer}</strong><p className="meta">{shortDate(item.date)} · {shortTime(item.time)} · {name}</p></div>
              {phone ? (
                <div className="btn-row">
                  <a className="btn btn-sm" href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  <a className="btn btn-sm" href={`sms:+${phone}?body=${message}`}>SMS</a>
                </div>
              ) : <span className="meta">No valid phone</span>}
            </div>
          );
        })}
        {!rows.some(item => item.status !== "cancelled") && <Empty>No appointments to remind.</Empty>}
      </section>
    </>
  );
}
