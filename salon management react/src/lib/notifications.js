import { KEYS, readList, writeJson } from "./storage.js";

export function showNotification(title, body, tag) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, tag, renotify: false });
    return true;
  } catch {
    return false;
  }
}

export function publishEvent(type, details) {
  const event = { id: crypto.randomUUID(), type, ...details, createdAt: new Date().toISOString() };
  try {
    writeJson(KEYS.notificationLog, [event, ...readList(KEYS.notificationLog)].slice(0, 250));
    writeJson(KEYS.notificationEvent, event);
  } catch {
    return null;
  }
  return event;
}

export function listEvents({ customerId, limit = 50 } = {}) {
  return readList(KEYS.notificationLog)
    .filter(event => !customerId || event.customerId === customerId)
    .slice(0, limit);
}
