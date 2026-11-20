export const BRANCHES = ["Kigali", "Musanze", "Huye", "Rubavu"];
export const PAYMENT_CHOICES = ["Cash", "MTN Mobile Money", "Airtel Money"];

// Accepts 07XXXXXXXX, 7XXXXXXXX, 2507XXXXXXXX and +2507XXXXXXXX (MTN 078/079, Airtel 072/073).
export function normalizeRwandaPhone(value) {
  const digits = String(value || "").replace(/[\s().-]/g, "").replace(/^\+/, "");
  const match = /^(?:250|0)?(7[2389]\d{7})$/.exec(digits);
  if (!match) return null;
  const local = match[1];
  return `+250 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export const PHONE_HINT = "Use a Rwanda number like 0788 123 456 or +250 788 123 456.";

export const whatsappLink = (phone, text = "") => {
  const normalized = normalizeRwandaPhone(phone);
  if (!normalized) return "";
  return `https://wa.me/${normalized.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};
