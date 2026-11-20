import { KEYS, readJson, readList, writeJson } from "./storage.js";
import { PHONE_HINT, normalizeRwandaPhone } from "./rwanda.js";
import { referralCodeFor } from "./salon.js";

function encode(bytes) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  if (!globalThis.crypto?.subtle) throw new Error("Secure password hashing requires localhost or HTTPS.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 150000, hash: "SHA-256" },
    key,
    256
  );
  return encode(bits);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function currentCustomer() {
  const session = readJson(KEYS.session, null);
  if (!session?.id) return null;
  return readList(KEYS.users).find(user => user.id === session.id) || null;
}

export async function registerCustomer({ name, phone, email, password, referralCode }) {
  name = String(name || "").trim();
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");
  const normalizedPhone = normalizeRwandaPhone(phone);
  if (name.length < 2 || !EMAIL.test(email) || password.length < 10) {
    throw new Error("Check your name, email, and password (10 characters minimum).");
  }
  if (!normalizedPhone) throw new Error(`Enter a valid Rwanda phone number. ${PHONE_HINT}`);
  const users = readList(KEYS.users);
  if (users.some(user => user.email === email)) throw new Error("An account with this email already exists.");
  let referredBy = "";
  const code = String(referralCode || "").trim().toUpperCase();
  if (code) {
    const referrer = users.find(user => referralCodeFor(user.id) === code);
    if (!referrer) throw new Error("That referral code was not found.");
    referredBy = referrer.id;
  }
  const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
  const user = {
    id: `customer-${crypto.randomUUID()}`,
    name,
    phone: normalizedPhone,
    email,
    salt,
    passwordHash: await hashPassword(password, salt),
    referredBy,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeJson(KEYS.users, users);
  writeJson(KEYS.session, { id: user.id });
  return user;
}

export async function loginCustomer({ email, password }) {
  email = String(email || "").trim().toLowerCase();
  const user = readList(KEYS.users).find(item => item.email === email);
  if (!user || (await hashPassword(String(password || ""), user.salt)) !== user.passwordHash) {
    throw new Error("Email or password is incorrect.");
  }
  writeJson(KEYS.session, { id: user.id });
  return user;
}

export function updateCustomerProfile({ id, name, phone, email, preferences }) {
  name = String(name || "").trim();
  email = String(email || "").trim().toLowerCase();
  const normalizedPhone = normalizeRwandaPhone(phone);
  if (name.length < 2 || !EMAIL.test(email)) throw new Error("Enter a valid name and email address.");
  if (!normalizedPhone) throw new Error(`Enter a valid Rwanda phone number. ${PHONE_HINT}`);
  const users = readList(KEYS.users);
  const user = users.find(item => item.id === id);
  if (!user) throw new Error("This customer account could not be found.");
  if (users.some(item => item.id !== id && item.email === email)) throw new Error("An account with this email already exists.");
  Object.assign(user, { name, phone: normalizedPhone, email, preferences: String(preferences || "").trim().slice(0, 300) });
  writeJson(KEYS.users, users);
  return user;
}

export function logoutCustomer() {
  localStorage.removeItem(KEYS.session);
}
