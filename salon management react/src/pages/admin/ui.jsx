import { createContext, useContext } from "react";

export const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

export function PageHeading({ eyebrow, title, children }) {
  return (
    <div className="admin-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}

export const Empty = ({ children }) => <p className="admin-empty">{children}</p>;

export function Pill({ tone, children }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Row({ left, right, tone }) {
  return (
    <div className="report-row">
      <span>{left}</span>
      <strong className={tone}>{right}</strong>
    </div>
  );
}

export const money = value => `RWF ${Number(value || 0).toLocaleString("en-RW")}`;

export const shortDate = value =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" }) : "—";

export const shortTime = value => {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
};

export const statusLabel = status => (status === "booked" ? "Pending" : status === "in-progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1));
