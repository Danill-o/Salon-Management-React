import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { localDate } from "../../lib/salon.js";
import { paymentDay, sumBy } from "../../lib/adminData.js";
import { Empty, PageHeading, money, useAdmin } from "./ui.jsx";

Chart.register(...registerables);

const COLORS = {
  primary: "rgb(168, 71, 62)",
  primaryLight: "rgba(168, 71, 62, 0.12)",
  green: "rgb(71, 116, 97)",
  greenLight: "rgba(71, 116, 97, 0.12)",
  gold: "rgb(166, 117, 39)"
};

function ChartCanvas({ type, data, label }) {
  const canvas = useRef(null);

  useEffect(() => {
    const chart = new Chart(canvas.current, {
      type,
      data,
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { labels: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: "#65756e" } }
        },
        scales: type === "doughnut" ? {} : {
          y: { beginAtZero: true, ticks: { font: { size: 10 }, color: "#a6aca1" }, grid: { color: "#eff0eb" } },
          x: { ticks: { font: { size: 10 }, color: "#a6aca1" }, grid: { display: false } }
        }
      }
    });
    return () => chart.destroy();
  }, [type, JSON.stringify(data)]);

  return <div className="chart-box"><canvas ref={canvas} role="img" aria-label={label} /></div>;
}

function shiftDate(date, amount) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default function Analytics() {
  const { appointments, payments, expenses, services, settings } = useAdmin();
  const [days, setDays] = useState("30");
  const today = localDate();

  const analytics = useMemo(() => {
    const length = Number(days);
    const start = shiftDate(today, -(length - 1));
    const dateLabels = Array.from({ length }, (_, index) => shiftDate(start, index));

    const periodAppointments = appointments.filter(item => item.date >= start && item.date <= today);
    const activeAppointments = periodAppointments.filter(item => item.status !== "cancelled");
    const periodPayments = payments.filter(item => {
      const date = paymentDay(item);
      return date >= start && date <= today;
    });
    const periodExpenses = expenses.filter(item => item.date >= start && item.date <= today);
    const revenue = sumBy(periodPayments, item => item.amount);
    const outgoing = sumBy(periodExpenses, item => item.amount);
    const completed = periodAppointments.filter(item => item.status === "completed").length;

    const serviceCounts = new Map();
    activeAppointments.forEach(item => {
      const name = item.serviceName || services.find(service => service.id === item.serviceId)?.name || "Service";
      serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
    });
    const topServices = [...serviceCounts].sort((a, b) => b[1] - a[1]).slice(0, 6);

    const revenueByDay = dateLabels.map(date =>
      sumBy(periodPayments.filter(item => paymentDay(item) === date), item => item.amount)
    );
    const expensesByDay = dateLabels.map(date =>
      sumBy(periodExpenses.filter(item => item.date === date), item => item.amount)
    );
    const bookingsByDay = dateLabels.map(date =>
      periodAppointments.filter(item => item.date === date && item.status !== "cancelled").length
    );
    const labelInterval = length <= 7 ? 1 : length <= 30 ? 5 : 10;
    const chartLabels = dateLabels.map((date, index) => index % labelInterval === 0 ? date.slice(5) : "");

    const statusCounts = ["completed", "booked", "confirmed", "cancelled"].map(status => ({
      status,
      count: periodAppointments.filter(item => item.status === status).length
    })).filter(item => item.count > 0);

    return {
      start,
      revenue,
      outgoing,
      completed,
      activeAppointments,
      periodAppointments,
      topServices,
      revenueByDay,
      expensesByDay,
      bookingsByDay,
      chartLabels,
      statusCounts
    };
  }, [appointments, payments, expenses, services, days, today]);

  const net = analytics.revenue - analytics.outgoing;
  const averageBooking = analytics.activeAppointments.length ? analytics.revenue / analytics.activeAppointments.length : 0;
  const completionRate = analytics.periodAppointments.length
    ? Math.round((analytics.completed / analytics.periodAppointments.length) * 100)
    : 0;

  const statusLabels = analytics.statusCounts.map(item => item.status[0].toUpperCase() + item.status.slice(1));

  return (
    <>
      <div className="panel-head">
        <PageHeading eyebrow={settings.name} title="Analytics">Performance trends and operational insights.</PageHeading>
        <div className="field" style={{ minWidth: "150px" }}>
          <label htmlFor="analytics-period">Period</label>
          <select id="analytics-period" value={days} onChange={event => setDays(event.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      <section className="kpi-grid">
        {[
          ["Revenue", money(analytics.revenue)],
          ["Net result", money(net)],
          ["Active bookings", analytics.activeAppointments.length],
          ["Avg. booking value", money(averageBooking)],
          ["Completion rate", `${completionRate}%`]
        ].map(([label, value]) => (
          <article className="kpi" key={label}><span>{label}</span><strong>{value}</strong></article>
        ))}
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Revenue &amp; expenses</h2>
          <ChartCanvas
            label="Revenue and expenses trend"
            type="line"
            data={{
              labels: analytics.chartLabels,
              datasets: [
                { label: "Revenue (RWF)", data: analytics.revenueByDay, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight, fill: true, tension: 0.35 },
                { label: "Expenses (RWF)", data: analytics.expensesByDay, borderColor: COLORS.green, backgroundColor: COLORS.greenLight, fill: true, tension: 0.35 }
              ]
            }}
          />
        </section>
        <section className="panel">
          <h2>Bookings</h2>
          <ChartCanvas
            label="Bookings trend"
            type="bar"
            data={{
              labels: analytics.chartLabels,
              datasets: [{ label: "Appointments", data: analytics.bookingsByDay, backgroundColor: COLORS.gold, borderRadius: 4 }]
            }}
          />
        </section>
        <section className="panel">
          <h2>Top services</h2>
          {analytics.topServices.length
            ? <ChartCanvas
                label="Top services"
                type="doughnut"
                data={{
                  labels: analytics.topServices.map(([name]) => name),
                  datasets: [{
                    data: analytics.topServices.map(([, count]) => count),
                    backgroundColor: [COLORS.primary, COLORS.green, COLORS.gold, "#c3876d", "#c5b69d", "#a88871"],
                    borderColor: "#fff",
                    borderWidth: 2
                  }]
                }}
              />
            : <Empty>No bookings in this period.</Empty>}
        </section>
        <section className="panel">
          <h2>Appointment status</h2>
          {analytics.statusCounts.length
            ? <ChartCanvas
                label="Appointments by status"
                type="bar"
                data={{
                  labels: statusLabels,
                  datasets: [{ label: "Appointments", data: analytics.statusCounts.map(item => item.count), backgroundColor: [COLORS.green, COLORS.gold, COLORS.primary, "#c3876d"], borderRadius: 4 }]
                }}
              />
            : <Empty>No appointment records in this period.</Empty>}
        </section>
      </div>
    </>
  );
}
