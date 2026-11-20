import { KEYS, readJson, writeJson } from "./storage.js";

export const DEFAULT_ADMIN = { name: "Salon Admin", email: "admin@saloon.com", password: "Admin@123" };
const SESSION_LENGTH = 8 * 60 * 60 * 1000;

const hex = bytes => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");

async function derive(password, salt) {
  if (!globalThis.crypto?.subtle) throw new Error("Admin sign-in requires localhost or HTTPS.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 200000, hash: "SHA-256" },
    key,
    256
  );
  return hex(bits);
}

export const hasAdminAccount = () => Boolean(readJson(KEYS.adminCredential, null));

export function hasValidAdminSession() {
  const session = readJson(KEYS.adminSession, null);
  if (!session || session.expiresAt <= Date.now() || session.role !== "admin") {
    localStorage.removeItem(KEYS.adminSession);
    return false;
  }
  return true;
}

async function storeCredential({ name, email }, password) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const credential = { name, email, salt, hash: await derive(password, salt) };
  writeJson(KEYS.adminCredential, credential);
  return credential;
}

export async function seedDefaultAdmin(force = false) {
  const existing = readJson(KEYS.adminCredential, null);
  if (existing && !force) return existing;
  return storeCredential(DEFAULT_ADMIN, DEFAULT_ADMIN.password);
}

function openSession(email) {
  writeJson(KEYS.adminSession, { role: "admin", email, expiresAt: Date.now() + SESSION_LENGTH });
}

export async function loginAdmin({ email, password }) {
  await seedDefaultAdmin();
  const saved = readJson(KEYS.adminCredential, null);
  const normalized = String(email || "").trim().toLowerCase();
  if (!saved) throw new Error("Create an admin account before signing in.");
  if (normalized !== saved.email || (await derive(String(password || ""), saved.salt)) !== saved.hash) {
    throw new Error("Email or password is incorrect.");
  }
  openSession(saved.email);
}

export async function setupAdmin({ name, email, password }) {
  const normalized = String(email || "").trim().toLowerCase();
  await storeCredential({ name: String(name || "").trim(), email: normalized }, String(password || ""));
  openSession(normalized);
}

export const signOutAdmin = () => localStorage.removeItem(KEYS.adminSession);
