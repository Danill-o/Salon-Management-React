import { KEYS, LOCAL_CHANGE, readJson, readList, saveJson, writeJson } from "./storage.js";
import { publishEvent } from "./notifications.js";
import { BRANCHES } from "./rwanda.js";

const photo = (id, host = "pexels") => host === "pexels"
  ? `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`
  : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

const HAIR = { src: photo(7388936), alt: "Hair stylist cutting and styling a client's hair" };
const BEAUTY = { src: photo(7446906), alt: "Makeup artist preparing a client" };
const SKIN = { src: photo("1570172619644-dfd03ed5d881", "unsplash"), alt: "Client receiving a facial treatment" };

export const SERVICE_PHOTOS = {
  haircut: HAIR,
  hair: HAIR,
  grooming: { src: photo(7388968), alt: "Men's luxury grooming and styling" },
  "men-haircut": { src: photo(1805600), alt: "Classic men's haircut and fade" },
  "children-haircut": { src: photo(7388936), alt: "Gentle haircut for kids" },
  "beard-shaving": { src: photo(2040189), alt: "Hot towel beard shave" },
  "hair-styling": { src: photo(7388971), alt: "Silk press and hair styling" },
  nails: { src: photo("1632345031435-8727f6897d53", "unsplash"), alt: "Nail artist creating a detailed manicure" },
  beauty: BEAUTY,
  makeup: BEAUTY,
  bridal: { src: photo(2065195), alt: "Bridal hair and makeup styling" },
  occasion: { src: photo(2065195), alt: "Occasion styling" },
  braids: { src: photo(36441633), alt: "African woman having protective hair braiding" },
  dreadlocks: { src: photo(16736032), alt: "Woman with long healthy dreadlocks" },
  facial: SKIN,
  skin: SKIN,
  "natural-hair": { src: photo(8342801), alt: "Natural afro hair care and hydration" }
};

export const DEFAULT_SERVICES = [
  { id: "haircut", name: "Haircut & Wash", category: "Hair", price: 5000, duration: 30, description: "Professional haircuts, wash, shape and finish.", image: photo(7388936) },
  { id: "nails", name: "Nails Care & Gel Polish", category: "Beauty", price: 10000, duration: 60, description: "Manicure care, gel polish, and nail art.", image: photo("1632345031435-8727f6897d53", "unsplash") },
  { id: "makeup", name: "Glam & Soft Makeup", category: "Beauty", price: 20000, duration: 60, description: "A polished glam or natural look for your occasion.", image: photo(7446906) },
  { id: "braids", name: "Protective Braids", category: "Hair", price: 25000, duration: 180, description: "Protective braiding, knotless & box braids styled to suit you.", image: photo(36441633) },
  { id: "dreadlocks", name: "Dreadlocks Care & Retwist", category: "Hair", price: 50000, duration: 180, description: "Loc installation, maintenance, interlocking & style refresh.", image: photo(16736032) },
  { id: "facial", name: "Organic Glow Facial", category: "Skin", price: 15000, duration: 60, description: "A relaxing skin-care, exfoliating & deep glow treatment.", image: photo("1570172619644-dfd03ed5d881", "unsplash") },
  { id: "natural-hair", name: "Natural Hair Hydration", category: "Hair", price: 20000, duration: 120, description: "Care, deep hydration, and styling for natural textures.", image: photo(8342801) },
  { id: "bridal", name: "Bridal Styling & Beauty", category: "Occasion", price: 80000, duration: 180, description: "Special-occasion styling and bridal beauty preparation.", image: photo(2065195) },
  { id: "grooming", name: "Men's Luxury Grooming", category: "Hair", price: 5000, duration: 40, description: "Beard trim, hairline shaping and haircut grooming.", image: photo(7388968) },
  { id: "men-haircut", name: "Classic Men's Haircut", category: "Hair", price: 3000, duration: 30, description: "Classic taper fade, scissor work, and clean neck shave.", image: photo(1805600) },
  { id: "children-haircut", name: "Children's Haircut", category: "Hair", price: 2000, duration: 20, description: "Gentle and patient haircut for kids.", image: photo(7388936) },
  { id: "beard-shaving", name: "Hot Towel Beard Shave", category: "Hair", price: 1500, duration: 20, description: "Professional hot-towel beard trim and razor shave.", image: photo(2040189) },
  { id: "hair-styling", name: "Silk Press & Hair Styling", category: "Hair", price: 4000, duration: 45, description: "Thermal silk press, curling, blow-dry or custom updos.", image: photo(7388971) }
];

const DEFAULT_STYLISTS = [
  { id: "stylist-jean", name: "Jean", specialty: "Hair Stylist", rating: 4.9, avatar: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80", phone: "+250 788 111 222", bio: "Expert in haircuts, styling, and hair care treatment." },
  { id: "stylist-marie", name: "Marie", specialty: "Braider", rating: 4.8, avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80", phone: "+250 788 222 333", bio: "Specialist in protective braids and knotless styles." },
  { id: "stylist-sarah", name: "Sarah", specialty: "Nail Artist", rating: 4.9, avatar: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80", phone: "+250 788 333 444", bio: "Creative nail art, gel manicures, and extension master." }
];

const DEFAULT_OFFERS = [
  { id: "offer-weekend", title: "Weekend Beauty Offer", description: "Get 15% OFF selected hair services this weekend.", serviceId: "haircut", discount: "15% OFF", badge: "WEEKEND OFFER" },
  { id: "offer-bridal", title: "Bridal Glow Package", description: "Save 20% OFF when booking Hair & Makeup together for your special day.", serviceId: "bridal", discount: "20% OFF", badge: "SPECIAL PACKAGE" },
  { id: "offer-nails", title: "Nails & Skin Pamper", description: "Complimentary skin-hydration facial massage with any gel manicure.", serviceId: "nails", discount: "FREE BONUS", badge: "LIMITED TIME" }
];

const DEFAULT_REVIEWS = [
  { id: "rev-1", name: "Aline M.", location: "Kigali", rating: 5, comment: "The service was excellent and the booking process was very easy. Marie did my braids perfectly!" },
  { id: "rev-2", name: "Grace K.", location: "Remera, Kigali", rating: 5, comment: "Clean and comfortable environment, polite staff, and my nails look stunning! Best salon in Kigali." },
  { id: "rev-3", name: "Patrick N.", location: "Nyarutarama, Kigali", rating: 5, comment: "Jean is an absolute master with dreadlocks and hair care. I won't go anywhere else." },
  { id: "rev-4", name: "Divine U.", location: "Kacyiru, Kigali", rating: 5, comment: "Easy online booking. Walked in and got my bridal makeup done perfectly on time." }
];

const arrayOr = (key, fallback) => {
  const value = readJson(key, null);
  return Array.isArray(value) ? value : fallback;
};

export const getServices = () => arrayOr(KEYS.services, DEFAULT_SERVICES);
export const getBookableServices = () => getServices().filter(service => service.available !== false);
export const getOffers = () => arrayOr(KEYS.offers, DEFAULT_OFFERS);
export const getReviews = () => arrayOr(KEYS.reviews, DEFAULT_REVIEWS);

export function getStaffProfiles() {
  return readList(KEYS.staff);
}

export function getStylists() {
  const stored = getStaffProfiles();
  if (!stored.length) return DEFAULT_STYLISTS;
  return stored
    .map((person, index) => ({
      id: person.id || `stylist-${index + 1}`,
      name: person.name || `Stylist ${index + 1}`,
      specialty: person.specialty || "Hair Stylist",
      rating: person.rating || 4.8,
      avatar: person.avatar || DEFAULT_STYLISTS[index % DEFAULT_STYLISTS.length].avatar,
      phone: person.phone || "+250 788 000 000",
      bio: person.bio,
      workStatus: person.workStatus === "busy" ? "busy" : "available",
      active: person.active !== false,
      availability: person.availability,
      assignedServices: person.assignedServices
    }))
    .filter(person => person.active);
}

export function getSettings() {
  const saved = readJson(KEYS.settings, null);
  const settings = {
    name: "Salon Management",
    phone: "",
    email: "",
    whatsapp: "",
    openTime: "09:00",
    closeTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    branches: BRANCHES,
    ...(saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {})
  };
  if (settings.name === "Kigali Beauty Salon" || settings.name === "Saloon Management") {
    settings.name = "Salon Management";
  }
  return settings;
}

export const formatPrice = value => `RWF ${Number(value || 0).toLocaleString("en-RW")}`;

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function timeMinutes(value) {
  const [hours, minutes] = String(value || "09:00").split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

export function formatTime(value = "09:00") {
  const [hours, minutes] = String(value).split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes || 0).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

export function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-RW", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

const minutesToTime = minutes => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Returns "available", "booked", "break" or "off" so the booking form can explain each time slot.
export function staffSlotStatus({ stylist, date, start, duration, serviceId, exceptId }) {
  const profiles = getStaffProfiles();
  const appointments = readList(KEYS.appointments);
  const services = getServices();
  const settings = getSettings();
  const profile = profiles.find(person => person.name === stylist);
  if (profile?.active === false) return "off";
  if (Array.isArray(profile?.assignedServices) && !profile.assignedServices.includes(serviceId)) return "off";

  let opening = settings.openTime;
  let closing = settings.closeTime;
  if (profile?.availability) {
    const day = profile.availability[WEEK_DAYS[new Date(`${date}T12:00:00`).getDay()]];
    if (!day?.available || !day.start || !day.end) return "off";
    opening = day.start;
    closing = day.end;
  }

  const end = start + duration;
  if (start < timeMinutes(opening) || end > timeMinutes(closing)) return "off";
  if (settings.breakStart && settings.breakEnd && start < timeMinutes(settings.breakEnd) && timeMinutes(settings.breakStart) < end) return "break";
  const clash = appointments.some(item => {
    if (item.id === exceptId || item.date !== date || item.stylist !== stylist || item.status === "cancelled") return false;
    const otherDuration = Number(item.serviceDuration || services.find(service => service.id === item.serviceId)?.duration || 0);
    if (!otherDuration) return false;
    const otherStart = timeMinutes(item.time);
    return start < otherStart + otherDuration && otherStart < end;
  });
  return clash ? "booked" : "available";
}

// `exceptId` lets a reschedule ignore the appointment being moved.
export const isStaffAvailable = args => staffSlotStatus(args) === "available";

// Every half-hour slot of the day with its status, for the smart booking grid.
export function slotGrid({ service, stylist, date, exceptId }) {
  if (!service || !stylist || !date) return [];
  const names = stylist === "any" ? getStylists().map(person => person.name) : [stylist];
  const settings = getSettings();
  const duration = Number(service.duration);
  const now = new Date();
  const slots = [];
  for (let start = timeMinutes(settings.openTime); start < timeMinutes(settings.closeTime); start += 30) {
    const time = minutesToTime(start);
    if (date === localDate() && start <= now.getHours() * 60 + now.getMinutes()) { slots.push({ time, status: "past" }); continue; }
    const statuses = names.map(name => staffSlotStatus({ stylist: name, date, start, duration, serviceId: service.id, exceptId }));
    const status = statuses.includes("available") ? "available"
      : statuses.includes("booked") ? "booked"
      : statuses.includes("break") ? "break" : "off";
    slots.push({ time, status });
  }
  return slots;
}

export function availableTimes({ service, stylist, date, exceptId }) {
  if (!service || !stylist || !date) return [];
  const names = stylist === "any" ? getStylists().map(person => person.name) : [stylist];
  const settings = getSettings();
  const duration = Number(service.duration);
  const now = new Date();
  const times = [];
  for (let start = timeMinutes(settings.openTime); start + duration <= timeMinutes(settings.closeTime); start += 30) {
    if (date === localDate() && start <= now.getHours() * 60 + now.getMinutes()) continue;
    if (names.some(name => isStaffAvailable({ stylist: name, date, start, duration, serviceId: service.id, exceptId }))) {
      times.push(minutesToTime(start));
    }
  }
  return times;
}

function withBookingLock(task) {
  return navigator.locks?.request ? navigator.locks.request("kigali-beauty-appointment-booking", task) : Promise.resolve(task());
}

// Rechecks availability inside the lock so two tabs cannot take the same slot.
export function commitBooking({ customer, service, draft }) {
  return withBookingLock(() => {
    const names = draft.stylist === "any" ? getStylists().map(person => person.name) : [draft.stylist];
    const start = timeMinutes(draft.time);
    const now = new Date();
    const isPast = draft.date === localDate() && start <= now.getHours() * 60 + now.getMinutes();
    const open = isPast
      ? []
      : names.filter(name => isStaffAvailable({ stylist: name, date: draft.date, start, duration: Number(service.duration), serviceId: service.id }));
    const stylist = draft.stylist === "any" ? open[0] : draft.stylist;
    if (!stylist || !open.includes(stylist)) return { status: "unavailable" };

    const appointment = {
      id: `KBS-${Date.now().toString(36).toUpperCase()}`,
      customerId: customer.id,
      customer: customer.name,
      phone: customer.phone,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceDuration: service.duration,
      stylist,
      date: draft.date,
      time: draft.time,
      branch: draft.branch || getSettings().branches?.[0] || "",
      paymentMethod: draft.paymentMethod || "Cash",
      notes: String(draft.notes || "").trim().slice(0, 300),
      status: "booked",
      createdAt: new Date().toISOString()
    };
    try {
      saveJson(KEYS.appointments, [...readList(KEYS.appointments), appointment]);
    } catch {
      return { status: "storage-error" };
    }
    publishEvent("booking-created", {
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      customerName: appointment.customer,
      stylist: appointment.stylist,
      serviceName: appointment.serviceName,
      date: appointment.date,
      time: appointment.time
    });
    return { status: "saved", appointment };
  });
}

export function ownedAppointments(customerId) {
  return readList(KEYS.appointments)
    .filter(item => item.customerId === customerId)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

export function ownedPayments(customerId) {
  const ids = new Set(ownedAppointments(customerId).map(item => item.id));
  return readList(KEYS.payments)
    .filter(item => item.customerId === customerId || ids.has(item.appointmentId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export const appointmentQrPayload = item =>
  ["SALON", item.id, item.customer, item.serviceName, item.stylist, item.date, item.time].join("|");

// Accepts a scanned QR payload or a typed booking reference.
export const appointmentIdFromCode = text => {
  const value = String(text || "").trim();
  return value.startsWith("SALON|") ? value.split("|")[1] || "" : value.toUpperCase();
};

export const referralCodeFor = customerId => `KB${String(customerId).replace(/^customer-/, "").replace(/-/g, "").slice(0, 6).toUpperCase()}`;

// Booking = 10 points, review = 5, referral = 50.
export function loyaltySummary(customerId) {
  const bookings = ownedAppointments(customerId).filter(item => item.status !== "cancelled").length;
  const reviews = readList(KEYS.reviews).filter(item => item.customerId === customerId).length;
  const referrals = readList(KEYS.users).filter(user => user.referredBy === customerId).length;
  const points = bookings * 10 + reviews * 5 + referrals * 50;
  const returningCustomer = ownedAppointments(customerId).filter(item => item.status === "completed").length >= 2;
  const discountPercent = points >= 200 ? 15 : points >= 100 ? 10 : points >= 50 ? 5 : 0;
  const status = points >= 200 ? "Gold loyalty" : points >= 100 ? "Silver loyalty" : returningCustomer ? "Returning guest" : "New guest";
  let specialOffer = "Book your next visit to unlock rewards.";
  if (discountPercent) specialOffer = `Reward unlocked: ${discountPercent}% off your next service.`;
  return {
    points, bookings, reviews, referrals, cashReward: Math.floor(points / 100) * 1000,
    discountPercent, specialOffer, returningCustomer, status
  };
}

export function getFavorites(customerId) {
  const saved = readJson(`${KEYS.favoritesPrefix}${customerId}`, {}) || {};
  return {
    services: Array.isArray(saved.services) ? saved.services : [],
    stylists: Array.isArray(saved.stylists) ? saved.stylists : []
  };
}

export function toggleFavorite(customerId, type, value) {
  const favorites = getFavorites(customerId);
  const list = favorites[type];
  const index = list.indexOf(value);
  if (index >= 0) list.splice(index, 1);
  else list.push(value);
  writeJson(`${KEYS.favoritesPrefix}${customerId}`, favorites);
  return index < 0;
}

export const serviceImage = service => {
  if (service?.image) return { src: service.image, alt: service.name || "Salon service" };
  const found = SERVICE_PHOTOS[service?.id] || SERVICE_PHOTOS[String(service?.category || "").toLowerCase()];
  return found || HAIR;
};

export const GALLERY = [
  { src: photo("1521590832167-7bcbfaa6381f", "unsplash"), category: "interior", caption: "Our salon", alt: "Modern salon interior with styling stations" },
  { src: photo(7388968), category: "hairstyles", caption: "Color & style", alt: "Hairstylist coloring a client's hair" },
  { src: photo(7388971), category: "hairstyles", caption: "Blow-dry finish", alt: "Hairstylist blow-drying a client's hair" },
  { src: photo(36441633), category: "braids", caption: "African hair braiding", alt: "Woman having her hair braided" },
  { src: photo(8342801), category: "hairstyles", caption: "Natural hair care", alt: "Natural hair-care session" },
  { src: photo("1604654894610-df63bc536371", "unsplash"), category: "nails", caption: "Nail artistry", alt: "Nail artist creating a manicure" },
  { src: photo(7446906), category: "makeup", caption: "Makeup artistry", alt: "Professional makeup artistry and beauty styling" },
  { src: photo("1487412720507-e7ab37603c6f", "unsplash"), category: "before-after", caption: "Finished look", alt: "Client showing off a finished hairstyle" }
];

// ----- Appointment mutation helpers -----
/** Cancel an appointment by ID (only if it belongs to the current customer and is pending/confirmed). */
export function cancelAppointment(id) {
  const all = readList(KEYS.appointments);
  const idx = all.findIndex(a => a.id === id);
  if (idx === -1) return false;
  const appt = all[idx];
  if (!["booked", "confirmed"].includes(appt.status)) return false;
  // Mark as cancelled
  appt.status = "cancelled";
  appt.cancelledAt = new Date().toISOString();
  writeJson(KEYS.appointments, all);
  publishEvent("cancellation", {
    appointmentId: id,
    customerId: appt.customerId,
    customerName: appt.customer,
    stylist: appt.stylist,
    serviceName: appt.serviceName || serviceById(appt.serviceId)?.name,
    date: appt.date,
    time: appt.time
  });
  return true;
}

/** Update an existing appointment (used for rescheduling). */
export function updateAppointment(updated) {
  const all = readList(KEYS.appointments);
  const idx = all.findIndex(a => a.id === updated.id);
  if (idx === -1) return false;
  const base = all[idx];
  // Preserve immutable fields and merge changes
  const merged = {
    ...base,
    ...updated,
    status: "booked",
    updatedAt: new Date().toISOString()
  };
  all[idx] = merged;
  writeJson(KEYS.appointments, all);
  publishEvent("appointment-rescheduled", { appointmentId: merged.id, ...merged });
  return true;
}
