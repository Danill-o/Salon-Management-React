import { useState, useMemo } from "react";
import { getBookableServices, getStylists, availableTimes, updateAppointment } from "../lib/salon.js";

export default function RescheduleDialog({ appointment, onClose, onDone }) {
  const service = getBookableServices().find(s => s.id === appointment.serviceId);
  const [date, setDate] = useState(appointment.date);
  const [stylist, setStylist] = useState(appointment.stylist);
  const [time, setTime] = useState(appointment.time);

  const times = useMemo(() => {
    return availableTimes({ service, stylist, date, exceptId: appointment.id });
  }, [service, stylist, date, appointment.id]);

  const submit = () => {
    if (!date || !time || !stylist) return;
    const updated = {
      ...appointment,
      date,
      time,
      stylist,
      status: "booked",
      updatedAt: new Date().toISOString()
    };
    const ok = updateAppointment(updated);
    if (ok) onDone();
    else alert("Could not reschedule. Please try again.");
  };

  return (
    <div className="dialog">
      <h2>Reschedule Appointment</h2>
      <label>
        Date
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </label>
      <label>
        Stylist
        <select value={stylist} onChange={e => setStylist(e.target.value)}>
          <option value="any">Any available</option>
          {getStylists().map(st => (
            <option key={st.id} value={st.name}>{st.name}</option>
          ))}
        </select>
      </label>
      <label>
        Time
        <select value={time} onChange={e => setTime(e.target.value)}>
          {times.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <div className="dialog-actions">
        <button onClick={onClose}>Cancel</button>
        <button onClick={submit}>Save</button>
      </div>
    </div>
  );
}

