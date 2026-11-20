import { KEYS, readJson, readList, saveJson } from "./storage.js";
import { getServices } from "./salon.js";

export const INVENTORY_CATEGORIES = ["Shampoo", "Hair products", "Nail products", "Cosmetics", "Hair extensions", "Towels", "Other salon materials"];
export const EXPENSE_CATEGORIES = ["Supplies", "Rent", "Utilities", "Payroll", "Marketing", "Other"];
export const PAYMENT_METHODS = ["Cash", "MTN Mobile Money", "Airtel Money", "Bank transfer", "Other"];
export const WEEK_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const STARTER_INVENTORY = [
  { id: "starter-shampoo", name: "Hydrating Shampoo", category: "Shampoo", quantity: 18, reorderLevel: 6, unitCost: 4500 },
  { id: "starter-hair-serum", name: "Repair Hair Serum", category: "Hair products", quantity: 12, reorderLevel: 5, unitCost: 6500 },
  { id: "starter-nail-gel", name: "Nail Strengthener Gel", category: "Nail products", quantity: 10, reorderLevel: 4, unitCost: 5200 },
  { id: "starter-lipstick", name: "Velvet Lipstick Set", category: "Cosmetics", quantity: 9, reorderLevel: 4, unitCost: 7800 },
  { id: "starter-extensions", name: "Silk Hair Extensions", category: "Hair extensions", quantity: 6, reorderLevel: 3, unitCost: 24000 },
  { id: "starter-towels", name: "Salon Towels", category: "Towels", quantity: 25, reorderLevel: 8, unitCost: 1600 }
];

export function seedInventory() {
  if (!readList(KEYS.products).length) saveJson(KEYS.products, STARTER_INVENTORY);
}

export const readServices = () => getServices();

export function readStaff() {
  const saved = readList(KEYS.staff);
  if (saved.length) return saved;
  return ["Jean", "Marie", "Sarah"].map((name, index) => ({ id: `stylist-${index + 1}`, name, specialty: "", phone: "" }));
}

export function readSettings() {
  const saved = readJson(KEYS.settings, null);
  const settings = { name: "Salon Management", phone: "", email: "", openTime: "09:00", closeTime: "18:00", ...(saved && typeof saved === "object" ? saved : {}) };
  if (settings.name === "Kigali Beauty Salon" || settings.name === "Saloon Management") settings.name = "Salon Management";
  return settings;
}

export const customerKey = (phone, email, id) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits || String(email || id || "").trim().toLowerCase();
};

export const appointmentCustomerKey = item => (item.customerId ? `id:${item.customerId}` : `phone:${customerKey(item.phone, "", "")}`);

// Merges appointment guests, registered accounts and admin-managed profiles.
export function buildCustomerDirectory(appointments, accounts, adminCustomers) {
  const map = new Map();
  appointments.forEach(item => {
    const key = appointmentCustomerKey(item);
    if (!map.has(key)) map.set(key, { id: item.customerId || `walk-in-${key}`, key, name: item.customer, phone: item.phone, email: "", visits: 0, last: "", managed: false, source: "appointment" });
    const customer = map.get(key);
    customer.visits += 1;
    if (item.date > customer.last) customer.last = item.date;
  });
  accounts.forEach(user => {
    const key = `id:${user.id}`;
    const customer = map.get(key) || { id: user.id, key, name: user.name, phone: user.phone, email: user.email, visits: 0, last: "", managed: true, source: "account" };
    Object.assign(customer, { id: user.id, name: user.name || customer.name, phone: user.phone || customer.phone, email: user.email || "", managed: true, source: "account" });
    map.set(key, customer);
  });
  adminCustomers.forEach(user => {
    const key = `phone:${customerKey(user.phone, user.email, "")}`;
    const customer = map.get(key) || { id: user.id, key, name: user.name, phone: user.phone, email: user.email || "", visits: 0, last: "", managed: true, source: "admin" };
    Object.assign(customer, { name: user.name, phone: user.phone, email: user.email || "", managed: true, source: "admin" });
    map.set(key, customer);
  });
  return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export function customerCount(appointments, accounts, adminCustomers) {
  const keys = new Set();
  appointments.forEach(item => keys.add(customerKey(item.phone, "", item.customerId)));
  accounts.forEach(user => keys.add(customerKey(user.phone, user.email, user.id)));
  adminCustomers.forEach(user => keys.add(customerKey(user.phone, user.email, user.id)));
  keys.delete("");
  return keys.size;
}

export function messagingPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) {
    if (digits.length !== 10) return "";
    digits = `250${digits.slice(1)}`;
  } else if (digits.length === 9) digits = `250${digits}`;
  if (digits.startsWith("250")) return digits.length === 12 ? digits : "";
  return digits.length >= 7 && digits.length <= 15 ? digits : "";
}

export const inRange = (date, start, end) => date >= start && date <= end;

export function startOfWeek(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
}

export function endOfWeek(dateString) {
  const end = new Date(`${startOfWeek(dateString)}T12:00:00`);
  end.setDate(end.getDate() + 6);
  return end.toISOString().slice(0, 10);
}

export const paymentDay = payment => payment.paymentDate || String(payment.createdAt || "").slice(0, 10);
export const sumBy = (items, pick) => items.reduce((total, item) => total + Number(pick(item) || 0), 0);

export function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
