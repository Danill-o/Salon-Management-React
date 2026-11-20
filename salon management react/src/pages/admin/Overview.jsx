import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { localDate } from "../../lib/salon.js";
import { customerCount, paymentDay, sumBy } from "../../lib/adminData.js";
import { Empty, PageHeading, money, shortTime, statusLabel, useAdmin } from "./ui.jsx";

Chart.register(...registerables);

const COLORS = { primary: "rgb(168, 71, 62)", primaryLight: "rgba(168, 71, 62, 0.1)", green: "rgb(71, 116, 97)", gold: "rgb(166, 117, 39)" };
const DONUT = [COLORS.primary, COLORS.green, COLORS.gold, "rgb(195, 135, 109)", "rgb(197, 182, 157)", "rgb(168, 136, 113)"];
const FONT = { family: "'DM Sans', sans-serif", size: 10 };

function ChartCanvas({ type, data, label }) {
  const canvas = useRef(null);
  useEffect(() => {
    const chart = new Chart(canvas.current, {
      type,
      data,
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { labels: { font: FONT, color: "#65756e" } } },
        scales: type === "doughnut" ? {} : {
          y: { beginAtZero: true, ticks: { font: FONT, color: "#a6aca1" }, grid: { color: "#eff0eb" } },
          x: { ticks: { font: FONT, color: "#a6aca1" }, grid: { display: false } }
        }
      }
    });
    return () => chart.destroy();
  }, [type, JSON.stringify(data)]);
  return <div className="chart-box"><canvas ref={canvas} role="img" aria-label={label} /></div>;
}

export default function Overview() {
  const { appointments, payments, expenses, products, staff, services, accounts, adminCustomers, settings, goTo } = useAdmin();
  const today = localDate();
  const month = today.slice(0, 7);

  const todays = appointments.filter(item => item.date === today && item.status !== "cancelled").sort((a, b) => a.time.localeCompare(b.time));
  const low = products.filter(product => Number(product.quantity) <= Number(product.reorderLevel));
  const monthlyRevenue = sumBy(payments.filter(p => paymentDay(p).slice(0, 7) === month), p => p.amount);
  const spent = sumBy(expenses.filter(e => String(e.date || "").slice(0, 7) === month), e => e.amount);
  const inMonth = appointments.filter(item => String(item.date || "").slice(0, 7) === month && item.status !== "cancelled");
  const serviceName = item => item.serviceName || services.find(s => s.id === item.serviceId)?.name;

  const days = Array.from({ length: 31 }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
  const labels = days.map((_, index) => String(index + 1));
  const revenue = days.map(day => sumBy(payments.filter(p => paymentDay(p) === day), p => p.amount));
  const perDay = days.map(day => inMonth.filter(item => item.date === day).length);
  const byService = services.map(s => [s.name, inMonth.filter(item => serviceName(item) === s.name).length]).filter(([, n]) => n > 0);
  const byStaff = staff.map(person => [person.name, inMonth.filter(item => item.stylist === person.name).length]).filter(([, n]) => n > 0);

  const kpis = [
    ["Customers", customerCount(appointments, accounts, adminCustomers)],
    ["Employees", staff.length],
    ["Today's appointments", todays.length],
    ["Monthly revenue", money(monthlyRevenue)],
    ["Pending bookings", appointments.filter(item => item.status === "booked").length],
    ["Completed services", appointments.filter(item => item.status === "completed").length],
    ["Active employees", staff.filter(person => person.active !== false).length],
    ["Monthly expenses", money(spent)],
    ["Low-stock products", low.length]
  ];

  return (
    <>
      <PageHeading eyebrow={settings.name} title="Dashboard">Today's activity at a glance.</PageHeading>
      <div className="kpi-grid">
        {kpis.map(([label, value]) => (
          <article className="kpi" key={label}><span>{label}</span><strong>{value}</strong></article>
        ))}
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><h2>Today's schedule</h2><button type="button" className="link-btn" onClick={() => goTo("appointments")}>All bookings ↗</button></div>
          {todays.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Customer</th><th>Service</th><th>Stylist</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {todays.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.customer}</strong></td>
                      <td>{serviceName(item) || "Service"}</td>
                      <td>{item.stylist}</td>
                      <td>{shortTime(item.time)}</td>
                      <td><span className={`pill status-${item.status}`}>{statusLabel(item.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No appointments scheduled for today.</Empty>}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Low stock</h2><button type="button" className="link-btn" onClick={() => goTo("inventory")}>Inventory ↗</button></div>
          {low.length
            ? low.slice(0, 5).map(item => <div className="report-row" key={item.id}><span>{item.name}</span><strong>{Number(item.quantity)} left</strong></div>)
            : <Empty>No low-stock products.</Empty>}
        </section>
      </div>

      <div className="two-col">
        <section className="panel"><h2>Revenue this month</h2>
          <ChartCanvas label="Revenue by day" type="line" data={{ labels, datasets: [{ label: "Revenue (RWF)", data: revenue, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight, fill: true, tension: 0.4 }] }} /></section>
        <section className="panel"><h2>Appointments this month</h2>
          <ChartCanvas label="Appointments by day" type="bar" data={{ labels, datasets: [{ label: "Appointments", data: perDay, backgroundColor: COLORS.green, borderRadius: 3 }] }} /></section>
        <section className="panel"><h2>Popular services</h2>
          {byService.length
            ? <ChartCanvas label="Appointments by service" type="doughnut" data={{ labels: byService.map(([n]) => n), datasets: [{ data: byService.map(([, n]) => n), backgroundColor: DONUT, borderColor: "#fff", borderWidth: 2 }] }} />
            : <Empty>No bookings this month.</Empty>}</section>
        <section className="panel"><h2>Bookings per employee</h2>
          {byStaff.length
            ? <ChartCanvas label="Bookings per employee" type="bar" data={{ labels: byStaff.map(([n]) => n), datasets: [{ label: "Bookings", data: byStaff.map(([, n]) => n), backgroundColor: COLORS.gold, borderRadius: 3 }] }} />
            : <Empty>No bookings this month.</Empty>}</section>
      </div>
    </>
  );
}
