import { useState } from "react";
import { publishEvent } from "../../lib/notifications.js";
import { localDate } from "../../lib/salon.js";
import { PAYMENT_METHODS, paymentDay, sumBy } from "../../lib/adminData.js";
import { Empty, PageHeading, money, shortDate, useAdmin } from "./ui.jsx";

const BLANK = { appointmentId: "", amount: "", method: PAYMENT_METHODS[0], reference: "" };

export default function Payments() {
  const { payments, setPayments, appointments, services, showToast } = useAdmin();
  const [form, setForm] = useState(BLANK);
  const eligible = appointments.filter(item => item.status !== "cancelled");
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const serviceName = item => services.find(s => s.id === item.serviceId)?.name || item.serviceName || "Service";
  const needsReference = form.method.includes("Mobile Money");

  const submit = event => {
    event.preventDefault();
    const appointment = appointments.find(item => item.id === (form.appointmentId || eligible[0]?.id));
    if (!appointment) { showToast("Choose a valid appointment."); return; }
    const paid = sumBy(payments.filter(item => item.appointmentId === appointment.id), item => item.amount);
    const due = Number(appointment.servicePrice ?? services.find(s => s.id === appointment.serviceId)?.price ?? 0) - paid;
    if (Number(form.amount) > due) { showToast(`Amount exceeds the remaining recorded balance (${money(Math.max(0, due))}).`); return; }
    const payment = {
      id: `payment-${crypto.randomUUID()}`, appointmentId: appointment.id, customerId: appointment.customerId || null,
      customerName: appointment.customer, serviceName: appointment.serviceName || serviceName(appointment),
      amount: Number(form.amount), method: form.method, reference: form.reference.trim(),
      paymentDate: localDate(), createdAt: new Date().toISOString(), manual: true
    };
    setPayments([payment, ...payments]);
    setForm(BLANK);
    showToast("Manual payment record saved. Verify it against your external receipt.");
    if (payment.customerId) {
      publishEvent("payment-recorded", {
        paymentId: payment.id, appointmentId: payment.appointmentId, customerId: payment.customerId, customerName: payment.customerName,
        stylist: appointment.stylist, serviceName: payment.serviceName, date: appointment.date, time: appointment.time, amount: payment.amount
      });
    }
  };

  const remove = payment => {
    if (window.confirm("Remove this manual payment record?")) setPayments(payments.filter(item => item.id !== payment.id));
  };

  return (
    <>
      <PageHeading eyebrow="Revenue" title="Payments">Manual records only; entries are not verified against cash or mobile-money providers.</PageHeading>
      <div className="management-layout">
        <form className="panel stack" onSubmit={submit}>
          <h2>Record payment</h2>
          <div className="field"><label htmlFor="pay-appt">Appointment</label>
            <select id="pay-appt" required value={form.appointmentId || eligible[0]?.id || ""} onChange={e => set("appointmentId", e.target.value)}>
              {eligible.length
                ? eligible.map(item => <option key={item.id} value={item.id}>{item.customer} · {serviceName(item)} · {shortDate(item.date)}</option>)
                : <option value="">No appointments to select</option>}
            </select></div>
          <div className="field"><label htmlFor="pay-amount">Amount received (RWF)</label><input id="pay-amount" type="number" min="1" step="1" required value={form.amount} onChange={e => set("amount", e.target.value)} /></div>
          <div className="field"><label htmlFor="pay-method">Method</label>
            <select id="pay-method" value={form.method} onChange={e => set("method", e.target.value)}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div className="field"><label htmlFor="pay-ref">{needsReference ? "Transaction reference (required)" : "Reference (optional)"}</label>
            <input id="pay-ref" maxLength={100} required={needsReference} value={form.reference} onChange={e => set("reference", e.target.value)} /></div>
          <div><button className="btn btn-primary" type="submit" disabled={!eligible.length}>Save payment record</button></div>
        </form>
        <section className="panel">
          <h2>Payment records</h2>
          {payments.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Customer</th><th>Method</th><th>Reference</th><th>Amount</th><th /></tr></thead>
                <tbody>
                  {[...payments].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(payment => (
                    <tr key={payment.id}>
                      <td>{shortDate(paymentDay(payment))}</td>
                      <td>{appointments.find(item => item.id === payment.appointmentId)?.customer || payment.customerName || "Appointment"}</td>
                      <td>{payment.method}</td>
                      <td>{payment.reference || "—"}</td>
                      <td>{money(payment.amount)}</td>
                      <td><button type="button" className="btn btn-sm danger" onClick={() => remove(payment)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No payment records yet.</Empty>}
        </section>
      </div>
    </>
  );
}
