// Same localStorage keys as the existing admin, stylist and customer pages,
// so data stays shared when everything is served from one origin.
export const KEYS = {
  appointments: "kigali-beauty-appointments-v1",
  staff: "kigali-beauty-staff-v1",
  services: "kigali-beauty-services-v1",
  offers: "kigali-beauty-offers-v1",
  reviews: "kigali-beauty-reviews-v1",
  settings: "kigali-beauty-settings-v1",
  payments: "kigali-beauty-payments-v1",
  users: "kigali-beauty-local-users-v1",
  session: "kigali-beauty-local-session-v1",
  pendingBooking: "kigali-beauty-pending-booking-v1",
  notificationLog: "kigali-beauty-notification-log-v1",
  notificationEvent: "kigali-beauty-notification-event-v1",
  favoritesPrefix: "kigali-beauty-customer-favorites-v1:",
  products: "kigali-beauty-products-v1",
  expenses: "kigali-beauty-expenses-v1",
  adminCustomers: "kigali-beauty-admin-customers-v1",
  stockMovements: "kigali-beauty-stock-movements-v1",
  adminCredential: "kigali-beauty-admin-credential-v1",
  adminSession: "kigali-beauty-admin-session-v1"
};

export const LOCAL_CHANGE = "kigali-beauty-local-change";

// Writes and notifies same-tab listeners (the native "storage" event only fires in other tabs).
export function saveJson(key, value) {
  writeJson(key, value);
  window.dispatchEvent(new CustomEvent(LOCAL_CHANGE, { detail: key }));
}

export function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function readList(key) {
  const value = readJson(key, []);
  return Array.isArray(value) ? value : [];
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
