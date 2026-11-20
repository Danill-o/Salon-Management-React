import { useMemo, useState } from "react";
import { localDate } from "../../lib/salon.js";
import { downloadFile, endOfWeek, inRange, paymentDay, startOfWeek, sumBy } from "../../lib/adminData.js";
import { Empty, PageHeading, money, shortDate, useAdmin } from "./ui.jsx";

const rangeFor = (period, custom) => {
  const today = localDate();
  if (period === "day") return { start: today, end: today };
  if (period === "week") return { start: startOfWeek(today), end: endOfWeek(today) };
  if (period === "month") return { start: `${today.slice(0, 7)}-01`, end: today };
  return custom;
};

const tally = (items, key) => {
  const counts = new Map();
  items.forEach(item => counts.set(key(item), (counts.get(key(item)) || 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1]);
};

export default function Reports() {
  const { appointments, payments, expenses, services } = useAdmin();
  const today = localDate();
  const [period, setPeriod] = useState("day");
  const [custom, setCustom] = useState({ start: `${today.slice(0, 7)}-01`, end: today });
  const { start, end } = rangeFor(period, custom);
  const valid = Boolean(start && end && end >= start);

  const report = useMemo(() => {
    if (!valid) return null;
    const records = appointments.filter(item => inRange(item.date, start, end));
    const active = records.filter(item => item.status !== "cancelled");
    const periodPayments = payments.filter(item => inRange(paymentDay(item), start, end));
    const periodExpenses = expenses.filter(item => inRange(item.date, start, end));
    const income = sumBy(periodPayments, p => p.amount);
    const outgoing = sumBy(periodExpenses, e => e.amount);
    const priceOf = item => Number(item.servicePrice ?? services.find(s => s.id === item.serviceId)?.price ?? 0);
    const stylists = new Map();
    active.forEach(item => {
      const name = item.stylist || "Unassigned";
      const current = stylists.get(name) || { visits: 0, revenue: 0 };
      stylists.set(name, { visits: current.visits + 1, revenue: current.revenue + priceOf(item) });
    });
    return {
      active, income, outgoing, periodPayments, periodExpenses,
      cancelled: records.filter(item => item.status === "cancelled").length,
      completed: records.filter(item => item.status === "completed").length,
      services: tally(active, item => item.serviceName || services.find(s => s.id === item.serviceId)?.name || "Service"),
      customers: tally(active, item => item.customer).slice(0, 5),
      stylists: [...stylists].sort((a, b) => b[1].visits - a[1].visits)
    };
  }, [appointments, payments, expenses, services, start, end, valid]);

  const revenue = (from, to) => sumBy(payments.filter(p => inRange(paymentDay(p), from, to)), p => p.amount);

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ["Type", "Date", "Description", "Amount RWF"],
      ...report.periodPayments.map(item => ["Payment", paymentDay(item), item.method, item.amount]),
      ...report.periodExpenses.map(item => ["Expense", item.date, `${item.category}: ${item.description}`, -Number(item.amount)])
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    downloadFile(`salon-report-${start}-to-${end}.csv`, csv, "text/csv;charset=utf-8");
  };

  const label = { day: "daily", week: "weekly", month: "monthly", custom: "custom" }[period];

  return (
    <>
      <PageHeading eyebrow="Insights" title="Reports">Reports reflect recorded entries, not audited accounting data.</PageHeading>
      <form className="panel inline-form" onSubmit={event => event.preventDefault()}>
        <div className="field"><label htmlFor="r-period">Period</label>
          <select id="r-period" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="day">Daily revenue</option><option value="week">Weekly revenue</option>
            <option value="month">Monthly revenue</option><option value="custom">Custom range</option>
          </select></div>
        <div className="field"><label htmlFor="r-start">From</label>
          <input id="r-start" type="date" value={start} disabled={period !== "custom"} onChange={e => setCustom({ ...custom, start: e.target.value })} /></div>
        <div className="field"><label htmlFor="r-end">To</label>
          <input id="r-end" type="date" value={end} disabled={period !== "custom"} onChange={e => setCustom({ ...custom, end: e.target.value })} /></div>
        <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!report}>Export CSV</button>
      </form>

      <section className="kpi-grid">
        {[["Today", money(revenue(today, today))], ["This week", money(revenue(startOfWeek(today), today))], ["This month", money(revenue(`${today.slice(0, 7)}-01`, today))],
          ["Cancelled appointments", report?.cancelled ?? 0], ["Completed appointments", report?.completed ?? 0]].map(([name, value]) => (
          <article className="kpi" key={name}><span>{name}</span><strong>{value}</strong></article>
        ))}
      </section>

      {!report ? <p className="form-message is-error">Choose a valid date range.</p> : (
        <>
          <p className="form-note">Showing {label} revenue from {shortDate(start)} to {shortDate(end)}.</p>
          <div className="kpi-grid">
            {[["Appointments", report.active.length], ["Payments received", money(report.income)], ["Expenses", money(report.outgoing)],
              ["Profit", money(report.income - report.outgoing)]].map(([name, value]) => (
              <article className="kpi" key={name}><span>{name}</span><strong>{value}</strong></article>
            ))}
          </div>
          <div className="two-col">
            <section className="panel"><h2>Services booked</h2>
              {report.services.length ? report.services.map(([name, count]) => <div className="report-row" key={name}><span>{name}</span><strong>{count} bookings</strong></div>) : <Empty>No appointments for this period.</Empty>}</section>
            <section className="panel"><h2>Top customers</h2>
              {report.customers.length ? report.customers.map(([name, count]) => <div className="report-row" key={name}><span>{name}</span><strong>{count} visits</strong></div>) : <Empty>No customer activity for this period.</Empty>}</section>
            <section className="panel"><h2>Stylists</h2>
              {report.stylists.length ? report.stylists.map(([name, data]) => <div className="report-row" key={name}><span>{name}</span><strong>{data.visits} visits · {money(data.revenue)}</strong></div>) : <Empty>No stylist activity for this period.</Empty>}</section>
          </div>
        </>
      )}
    </>
  );
}
