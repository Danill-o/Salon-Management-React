import { useStored } from "../../hooks.js";
import { KEYS, readList } from "../../lib/storage.js";
import { Empty, PageHeading, money, shortDate, shortTime } from "./ui.jsx";

const LABELS = {
  "booking-created": "New booking", "appointment-confirmed": "Appointment confirmed", "appointment-in-progress": "Service in progress",
  cancellation: "Appointment cancelled", "payment-recorded": "Payment recorded", "appointment-completed": "Appointment completed",
  "appointment-rescheduled": "Appointment rescheduled", "low-stock": "Low inventory"
};

export default function Notifications() {
  const [log] = useStored(KEYS.notificationLog, readList);
  const events = log.slice(0, 100);
  return (
    <>
      <PageHeading eyebrow="Activity" title="Notifications">Bookings, payments and stock alerts from this browser.</PageHeading>
      <section className="panel">
        {events.map(event => {
          const detail = [event.customerName, event.serviceName, event.productName, event.quantity != null ? `${event.quantity} remaining` : "",
            event.date ? shortDate(event.date) : "", event.time ? shortTime(event.time) : "", event.amount ? money(event.amount) : ""].filter(Boolean).join(" · ");
          return (
            <article className="activity-row" key={event.id}>
              <div className="activity-main">
                <strong>{LABELS[event.type] || String(event.type).replaceAll("-", " ")}</strong>
                <p className="meta">{detail || "Salon activity"}</p>
              </div>
              <time className="meta">{event.createdAt && new Date(event.createdAt).toLocaleString("en-RW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
            </article>
          );
        })}
        {!events.length && <Empty>No notifications yet.</Empty>}
      </section>
    </>
  );
}
