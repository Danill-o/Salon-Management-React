import { KEYS, saveJson, writeJson, readList, readJson, LOCAL_CHANGE } from "./storage.js";
import { localDate } from "./salon.js";

// Helper to calculate relative ISO date strings (YYYY-MM-DD)
export function getRelativeDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Sample photo helper
const photo = (id, host = "pexels") => host === "pexels"
  ? `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`
  : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

// 1. SERVICES WITH PHOTOS
export const SAMPLE_SERVICES = [
  {
    id: "haircut",
    name: "Haircut & Wash",
    category: "Hair",
    price: 5000,
    duration: 30,
    description: "Professional wash, precision cutting, shape-up and blow-dry finish.",
    image: photo(7388936),
    available: true
  },
  {
    id: "nails",
    name: "Nails Care & Gel Polish",
    category: "Beauty",
    price: 10000,
    duration: 60,
    description: "Complete manicure care, cuticle grooming, gel polish, and custom nail art.",
    image: photo("1632345031435-8727f6897d53", "unsplash"),
    available: true
  },
  {
    id: "makeup",
    name: "Glam & Soft Makeup",
    category: "Beauty",
    price: 20000,
    duration: 60,
    description: "A polished glam or soft natural evening look tailored for your occasion.",
    image: photo(7446906),
    available: true
  },
  {
    id: "braids",
    name: "Protective Braids",
    category: "Hair",
    price: 25000,
    duration: 180,
    description: "Protective knotless, box braids or cornrows styled gently to protect edges.",
    image: photo(36441633),
    available: true
  },
  {
    id: "dreadlocks",
    name: "Dreadlocks Care & Retwist",
    category: "Hair",
    price: 50000,
    duration: 180,
    description: "Loc installation, interlocking, root retwist and refreshing herbal wash.",
    image: photo(16736032),
    available: true
  },
  {
    id: "facial",
    name: "Organic Glow Facial",
    category: "Skin",
    price: 15000,
    duration: 60,
    description: "Deep cleansing, exfoliating steam, herbal mask and relaxing facial massage.",
    image: photo("1570172619644-dfd03ed5d881", "unsplash"),
    available: true
  },
  {
    id: "natural-hair",
    name: "Natural Hair Hydration Treatment",
    category: "Hair",
    price: 20000,
    duration: 120,
    description: "Deep hydration steam, protein treatment, and styling for natural afro textures.",
    image: photo(8342801),
    available: true
  },
  {
    id: "bridal",
    name: "Bridal Beauty & Hair Styling",
    category: "Occasion",
    price: 80000,
    duration: 180,
    description: "Comprehensive bridal hair updo, veil placement, and radiant bridal makeup.",
    image: photo(2065195),
    available: true
  },
  {
    id: "grooming",
    name: "Men's Luxury Grooming",
    category: "Hair",
    price: 5000,
    duration: 40,
    description: "Haircut, beard trim, hairline razor shape-up, and relaxing facial steam.",
    image: photo(7388968),
    available: true
  },
  {
    id: "men-haircut",
    name: "Classic Men's Haircut",
    category: "Hair",
    price: 3000,
    duration: 30,
    description: "Classic taper fade, scissor work, and clean neck shave.",
    image: photo(1805600),
    available: true
  },
  {
    id: "children-haircut",
    name: "Children's Haircut",
    category: "Hair",
    price: 2000,
    duration: 20,
    description: "Patient, gentle and comfortable haircut tailored for kids.",
    image: photo(7388936),
    available: true
  },
  {
    id: "beard-shaving",
    name: "Hot Towel Beard Shave",
    category: "Hair",
    price: 1500,
    duration: 20,
    description: "Hot towel wrap, soothing shaving cream, and razor sharp finish.",
    image: photo(2040189),
    available: true
  },
  {
    id: "hair-styling",
    name: "Silk Press & Hair Styling",
    category: "Hair",
    price: 4000,
    duration: 45,
    description: "Thermal silk press, curling, blow-dry or custom updos for any event.",
    image: photo(7388971),
    available: true
  }
];

// 2. STAFF / EMPLOYEES (With pre-hashed PIN 123456)
export const SAMPLE_STAFF = [
  {
    id: "stylist-1",
    name: "Jean",
    specialty: "Master Hair Stylist & Loc Specialist",
    rating: 4.9,
    avatar: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80",
    phone: "+250 788 111 222",
    commissionRate: 25,
    workStatus: "active",
    active: true,
    pinSalt: "kigali_salt_stylist",
    pinHash: "1097aa4ffd8bbc1897542ddbc2d17361acb4490b7f2bdaff9b5c4c5feaf9f3b9", // 123456
    bio: "10+ years specializing in precision fading, dreadlocks interlocking, and texture care."
  },
  {
    id: "stylist-2",
    name: "Marie",
    specialty: "Braiding & Natural Hair Specialist",
    rating: 4.8,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
    phone: "+250 788 222 333",
    commissionRate: 25,
    workStatus: "active",
    active: true,
    pinSalt: "kigali_salt_stylist",
    pinHash: "1097aa4ffd8bbc1897542ddbc2d17361acb4490b7f2bdaff9b5c4c5feaf9f3b9", // 123456
    bio: "Kigali's favorite braider known for painless, neat protective knotless braids and cornrows."
  },
  {
    id: "stylist-3",
    name: "Sarah",
    specialty: "Nail Artist & Esthetician",
    rating: 4.9,
    avatar: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80",
    phone: "+250 788 333 444",
    commissionRate: 25,
    workStatus: "active",
    active: true,
    pinSalt: "kigali_salt_stylist",
    pinHash: "1097aa4ffd8bbc1897542ddbc2d17361acb4490b7f2bdaff9b5c4c5feaf9f3b9", // 123456
    bio: "Creative nail designer, gel polish master, and certified organic skincare specialist."
  }
];

// 3. SAMPLE REGISTERED CUSTOMERS (Password: Password123!)
export const SAMPLE_USERS = [
  {
    id: "customer-clarisse",
    name: "Clarisse Umutoni",
    phone: "+250 788 123 456",
    email: "clarisse@gmail.com",
    salt: "kigali_salt_user",
    passwordHash: "c9a2813a4507f8beb6e7d37d9a890b0838d8e7ecc5f8cdd598182fedf0863870", // Password123!
    preferences: "Sensitive scalp, prefers gentle blow-dry and knotless braids.",
    referredBy: "",
    createdAt: "2026-09-15T09:00:00.000Z"
  },
  {
    id: "customer-david",
    name: "David Mugisha",
    phone: "+250 788 456 789",
    email: "david@gmail.com",
    salt: "kigali_salt_user",
    passwordHash: "c9a2813a4507f8beb6e7d37d9a890b0838d8e7ecc5f8cdd598182fedf0863870",
    preferences: "Skin sensitive to alcohol aftershaves; prefers tea tree oil and razor edge-up.",
    referredBy: "customer-clarisse",
    createdAt: "2026-09-20T10:00:00.000Z"
  },
  {
    id: "customer-keza",
    name: "Keza Uwase",
    phone: "+250 788 987 654",
    email: "keza@gmail.com",
    salt: "kigali_salt_user",
    passwordHash: "c9a2813a4507f8beb6e7d37d9a890b0838d8e7ecc5f8cdd598182fedf0863870",
    preferences: "Loves nude gel polish and almond nail shaping.",
    referredBy: "customer-clarisse",
    createdAt: "2026-10-01T14:00:00.000Z"
  },
  {
    id: "customer-eric",
    name: "Eric Habimana",
    phone: "+250 788 654 321",
    email: "eric@gmail.com",
    salt: "kigali_salt_user",
    passwordHash: "c9a2813a4507f8beb6e7d37d9a890b0838d8e7ecc5f8cdd598182fedf0863870",
    preferences: "Low taper fade, natural beard alignment.",
    referredBy: "",
    createdAt: "2026-10-05T11:00:00.000Z"
  },
  {
    id: "customer-aline",
    name: "Aline Mukamana",
    phone: "+250 788 777 888",
    email: "aline@gmail.com",
    salt: "kigali_salt_user",
    passwordHash: "c9a2813a4507f8beb6e7d37d9a890b0838d8e7ecc5f8cdd598182fedf0863870",
    preferences: "Bridal beauty consultation; prefers light hydrating foundation.",
    referredBy: "",
    createdAt: "2026-10-08T16:00:00.000Z"
  }
];

// 4. SAMPLE APPOINTMENTS GENERATOR (Relative to today)
export function getSampleAppointments() {
  const today = getRelativeDate(0);
  const dayMinus3 = getRelativeDate(-3);
  const dayMinus2 = getRelativeDate(-2);
  const dayMinus1 = getRelativeDate(-1);
  const dayPlus1 = getRelativeDate(1);
  const dayPlus2 = getRelativeDate(2);
  const dayPlus3 = getRelativeDate(3);

  return [
    // --- Past Completed Appointments (Generates Revenue & Completed Stats) ---
    {
      id: "KBS-HIST-01",
      customerId: "customer-clarisse",
      customer: "Clarisse Umutoni",
      phone: "+250 788 123 456",
      serviceId: "braids",
      serviceName: "Protective Braids",
      servicePrice: 25000,
      serviceDuration: 180,
      stylist: "Marie",
      date: dayMinus3,
      time: "09:30",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "MTN Mobile Money",
      notes: "Mid-back knotless braids with curly ends.",
      status: "completed",
      createdAt: `${dayMinus3}T08:00:00.000Z`
    },
    {
      id: "KBS-HIST-02",
      customerId: "customer-david",
      customer: "David Mugisha",
      phone: "+250 788 456 789",
      serviceId: "grooming",
      serviceName: "Men's Luxury Grooming",
      servicePrice: 5000,
      serviceDuration: 40,
      stylist: "Jean",
      date: dayMinus2,
      time: "11:00",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "Cash",
      notes: "Gentle beard shaping, tea tree hot towel.",
      status: "completed",
      createdAt: `${dayMinus2}T09:00:00.000Z`
    },
    {
      id: "KBS-HIST-03",
      customerId: "customer-keza",
      customer: "Keza Uwase",
      phone: "+250 788 987 654",
      serviceId: "nails",
      serviceName: "Nails Care & Gel Polish",
      servicePrice: 10000,
      serviceDuration: 60,
      stylist: "Sarah",
      date: dayMinus2,
      time: "14:00",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "MTN Mobile Money",
      notes: "Nude pink gel polish with subtle chrome powder finish.",
      status: "completed",
      createdAt: `${dayMinus2}T12:00:00.000Z`
    },
    {
      id: "KBS-HIST-04",
      customerId: "customer-aline",
      customer: "Aline Mukamana",
      phone: "+250 788 777 888",
      serviceId: "bridal",
      serviceName: "Bridal Beauty & Hair Styling",
      servicePrice: 80000,
      serviceDuration: 180,
      stylist: "Sarah",
      date: dayMinus1,
      time: "10:00",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "Bank transfer",
      notes: "Bridal trial: soft glam makeup and textured low bun with pearl pins.",
      status: "completed",
      createdAt: `${dayMinus1}T08:30:00.000Z`
    },
    {
      id: "KBS-HIST-05",
      customerId: "customer-eric",
      customer: "Eric Habimana",
      phone: "+250 788 654 321",
      serviceId: "men-haircut",
      serviceName: "Classic Men's Haircut",
      servicePrice: 3000,
      serviceDuration: 30,
      stylist: "Jean",
      date: dayMinus1,
      time: "15:30",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "Airtel Money",
      notes: "Clean skin fade with razor line-up.",
      status: "completed",
      createdAt: `${dayMinus1}T14:00:00.000Z`
    },

    // --- TODAY'S APPOINTMENTS (October 13, 2026) ---
    {
      id: "KBS-TODAY-01",
      customerId: "customer-clarisse",
      customer: "Clarisse Umutoni",
      phone: "+250 788 123 456",
      serviceId: "haircut",
      serviceName: "Haircut & Wash",
      servicePrice: 5000,
      serviceDuration: 30,
      stylist: "Jean",
      date: today,
      time: "09:00",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "MTN Mobile Money",
      notes: "Quick trim and hydrating wash before work.",
      status: "completed",
      createdAt: `${today}T07:30:00.000Z`
    },
    {
      id: "KBS-TODAY-02",
      customerId: "customer-david",
      customer: "David Mugisha",
      phone: "+250 788 456 789",
      serviceId: "beard-shaving",
      serviceName: "Hot Towel Beard Shave",
      servicePrice: 1500,
      serviceDuration: 20,
      stylist: "Jean",
      date: today,
      time: "10:30",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "Cash",
      notes: "Clean shave with eucalyptus oil.",
      status: "in-progress",
      createdAt: `${today}T08:00:00.000Z`
    },
    {
      id: "KBS-TODAY-03",
      customerId: "customer-keza",
      customer: "Keza Uwase",
      phone: "+250 788 987 654",
      serviceId: "nails",
      serviceName: "Nails Care & Gel Polish",
      servicePrice: 10000,
      serviceDuration: 60,
      stylist: "Sarah",
      date: today,
      time: "11:30",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "MTN Mobile Money",
      notes: "Cuticle care and burgundy gel tips.",
      status: "confirmed",
      createdAt: `${today}T08:15:00.000Z`
    },
    {
      id: "KBS-TODAY-04",
      customerId: "customer-eric",
      customer: "Eric Habimana",
      phone: "+250 788 654 321",
      serviceId: "natural-hair",
      serviceName: "Natural Hair Hydration Treatment",
      servicePrice: 20000,
      serviceDuration: 120,
      stylist: "Marie",
      date: today,
      time: "14:00",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "Airtel Money",
      notes: "Deep conditioning steam treatment for dry scalp.",
      status: "confirmed",
      createdAt: `${today}T08:45:00.000Z`
    },
    {
      id: "KBS-TODAY-05",
      customerId: "customer-walkin-grace",
      customer: "Grace Kamanzi",
      phone: "+250 788 555 444",
      serviceId: "facial",
      serviceName: "Organic Glow Facial",
      servicePrice: 15000,
      serviceDuration: 60,
      stylist: "Sarah",
      date: today,
      time: "16:00",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "Cash",
      notes: "First time visit. Needs gentle organic aloe vera mask.",
      status: "booked",
      createdAt: `${today}T09:10:00.000Z`
    },

    // --- UPCOMING APPOINTMENTS (Tomorrow & Next Days) ---
    {
      id: "KBS-UPCOMING-01",
      customerId: "customer-clarisse",
      customer: "Clarisse Umutoni",
      phone: "+250 788 123 456",
      serviceId: "hair-styling",
      serviceName: "Silk Press & Hair Styling",
      servicePrice: 4000,
      serviceDuration: 45,
      stylist: "Jean",
      date: dayPlus1,
      time: "10:00",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "MTN Mobile Money",
      notes: "Silk press with light shine spray.",
      status: "confirmed",
      createdAt: `${today}T10:00:00.000Z`
    },
    {
      id: "KBS-UPCOMING-02",
      customerId: "customer-patrick",
      customer: "Patrick Nzeyimana",
      phone: "+250 788 888 999",
      serviceId: "dreadlocks",
      serviceName: "Dreadlocks Care & Retwist",
      servicePrice: 50000,
      serviceDuration: 180,
      stylist: "Jean",
      date: dayPlus1,
      time: "13:00",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "MTN Mobile Money",
      notes: "Interlocking and organic tea tree scalp wash.",
      status: "booked",
      createdAt: `${today}T11:00:00.000Z`
    },
    {
      id: "KBS-UPCOMING-03",
      customerId: "customer-divine",
      customer: "Divine Uwera",
      phone: "+250 788 333 111",
      serviceId: "makeup",
      serviceName: "Glam & Soft Makeup",
      servicePrice: 20000,
      serviceDuration: 60,
      stylist: "Sarah",
      date: dayPlus2,
      time: "15:00",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "MTN Mobile Money",
      notes: "Evening gala makeup with natural lashes.",
      status: "booked",
      createdAt: `${today}T12:00:00.000Z`
    },
    {
      id: "KBS-UPCOMING-04",
      customerId: "customer-aline",
      customer: "Aline Mukamana",
      phone: "+250 788 777 888",
      serviceId: "braids",
      serviceName: "Protective Braids",
      servicePrice: 25000,
      serviceDuration: 180,
      stylist: "Marie",
      date: dayPlus3,
      time: "09:30",
      branch: "Kigali Heights, Kimihurura",
      paymentMethod: "MTN Mobile Money",
      notes: "Small knotless braids, color 1B/30 mix.",
      status: "booked",
      createdAt: `${today}T13:00:00.000Z`
    }
  ];
}

// Generate consistent historical records so charts and reports have meaningful data.
export function getHistoricalAppointments() {
  const customers = [
    ["customer-clarisse", "Clarisse Umutoni", "+250 788 123 456"],
    ["customer-david", "David Mugisha", "+250 788 456 789"],
    ["customer-keza", "Keza Uwase", "+250 788 987 654"],
    ["customer-eric", "Eric Habimana", "+250 788 654 321"],
    ["customer-aline", "Aline Mukamana", "+250 788 777 888"],
    ["customer-grace", "Grace Kamanzi", "+250 788 555 444"],
    ["customer-patrick", "Patrick Nzeyimana", "+250 788 888 999"]
  ];
  const staffNames = ["Jean", "Marie", "Sarah"];
  const times = ["09:00", "10:30", "12:00", "14:00", "16:00"];
  const records = [];

  for (let offset = -89; offset <= -4; offset += 1) {
    const date = getRelativeDate(offset);
    const count = offset % 7 === 0 || offset % 5 === 0 ? 3 : 2;
    for (let index = 0; index < count; index += 1) {
      const customer = customers[(Math.abs(offset) + index) % customers.length];
      const service = SAMPLE_SERVICES[(Math.abs(offset) * 2 + index) % SAMPLE_SERVICES.length];
      const staff = staffNames[(Math.abs(offset) + index) % staffNames.length];
      const cancelled = (Math.abs(offset) + index) % 17 === 0;
      records.push({
        id: `KBS-HIST-${String(Math.abs(offset)).padStart(3, "0")}-${index + 1}`,
        customerId: customer[0],
        customer: customer[1],
        phone: customer[2],
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.duration,
        stylist: staff,
        date,
        time: times[(index + Math.abs(offset)) % times.length],
        branch: "Kigali Heights, Kimihurura",
        paymentMethod: ["Cash", "MTN Mobile Money", "Airtel Money", "Bank transfer"][(index + Math.abs(offset)) % 4],
        notes: "Seeded historical salon appointment.",
        status: cancelled ? "cancelled" : "completed",
        createdAt: `${date}T08:${String(index * 10).padStart(2, "0")}:00.000Z`
      });
    }
  }
  return records;
}

export function getHistoricalPayments(appointments) {
  return appointments
    .filter(item => item.status === "completed")
    .map((item, index) => ({
      id: `PAY-HIST-${String(index + 1).padStart(4, "0")}`,
      appointmentId: item.id,
      customerId: item.customerId,
      customerName: item.customer,
      serviceName: item.serviceName,
      amount: item.servicePrice,
      method: item.paymentMethod,
      reference: `SEED-${String(index + 1).padStart(6, "0")}`,
      paymentDate: item.date,
      createdAt: `${item.date}T${item.time}:00.000Z`,
      manual: false
    }));
}

export function getHistoricalExpenses() {
  const records = [];
  for (let offset = -89; offset <= -1; offset += 7) {
    const date = getRelativeDate(offset);
    records.push({
      id: `exp-week-${Math.abs(offset)}`,
      description: "Weekly professional supplies and salon consumables",
      category: "Supplies",
      amount: 65000 + (Math.abs(offset) % 4) * 12000,
      date
    });
  }
  return records;
}

// 5. SAMPLE PAYMENTS (Matched to Completed Appointments)
export function getSamplePayments() {
  const dayMinus3 = getRelativeDate(-3);
  const dayMinus2 = getRelativeDate(-2);
  const dayMinus1 = getRelativeDate(-1);
  const today = getRelativeDate(0);

  return [
    {
      id: "PAY-1001",
      appointmentId: "KBS-HIST-01",
      customerId: "customer-clarisse",
      customerName: "Clarisse Umutoni",
      serviceName: "Protective Braids",
      amount: 25000,
      method: "MTN Mobile Money",
      reference: "MTN-MOMO-829103",
      paymentDate: dayMinus3,
      createdAt: `${dayMinus3}T12:35:00.000Z`,
      manual: false
    },
    {
      id: "PAY-1002",
      appointmentId: "KBS-HIST-02",
      customerId: "customer-david",
      customerName: "David Mugisha",
      serviceName: "Men's Luxury Grooming",
      amount: 5000,
      method: "Cash",
      reference: "CASH-REC-0192",
      paymentDate: dayMinus2,
      createdAt: `${dayMinus2}T11:45:00.000Z`,
      manual: true
    },
    {
      id: "PAY-1003",
      appointmentId: "KBS-HIST-03",
      customerId: "customer-keza",
      customerName: "Keza Uwase",
      serviceName: "Nails Care & Gel Polish",
      amount: 10000,
      method: "MTN Mobile Money",
      reference: "MTN-MOMO-910244",
      paymentDate: dayMinus2,
      createdAt: `${dayMinus2}T15:05:00.000Z`,
      manual: false
    },
    {
      id: "PAY-1004",
      appointmentId: "KBS-HIST-04",
      customerId: "customer-aline",
      customerName: "Aline Mukamana",
      serviceName: "Bridal Beauty & Hair Styling",
      amount: 80000,
      method: "Bank transfer",
      reference: "BK-TXN-71829",
      paymentDate: dayMinus1,
      createdAt: `${dayMinus1}T13:10:00.000Z`,
      manual: false
    },
    {
      id: "PAY-1005",
      appointmentId: "KBS-HIST-05",
      customerId: "customer-eric",
      customerName: "Eric Habimana",
      serviceName: "Classic Men's Haircut",
      amount: 3000,
      method: "Airtel Money",
      reference: "AIRTEL-004912",
      paymentDate: dayMinus1,
      createdAt: `${dayMinus1}T16:05:00.000Z`,
      manual: false
    },
    {
      id: "PAY-1006",
      appointmentId: "KBS-TODAY-01",
      customerId: "customer-clarisse",
      customerName: "Clarisse Umutoni",
      serviceName: "Haircut & Wash",
      amount: 5000,
      method: "MTN Mobile Money",
      reference: "MTN-MOMO-993811",
      paymentDate: today,
      createdAt: `${today}T09:35:00.000Z`,
      manual: false
    }
  ];
}

// 6. SAMPLE INVENTORY (With Low Stock & Out of Stock items as requested)
export const SAMPLE_PRODUCTS = [
  {
    id: "prod-shampoo-argan",
    name: "Hydrating Argan Oil Shampoo",
    category: "Shampoo",
    quantity: 4,
    reorderLevel: 6,
    unitCost: 4500
  },
  {
    id: "prod-conditioner-moisture",
    name: "Deep Moisture Conditioner",
    category: "Shampoo",
    quantity: 0,
    reorderLevel: 5,
    unitCost: 5000
  },
  {
    id: "prod-hair-oil",
    name: "Organic Castor & Tea Tree Hair Oil",
    category: "Hair products",
    quantity: 22,
    reorderLevel: 5,
    unitCost: 6500
  },
  {
    id: "prod-relaxer",
    name: "Olive Oil Hair Relaxer Kit",
    category: "Hair products",
    quantity: 2,
    reorderLevel: 5,
    unitCost: 8000
  },
  {
    id: "prod-hair-dye",
    name: "Semi-Permanent Hair Dye - Burgundy & Black",
    category: "Hair products",
    quantity: 14,
    reorderLevel: 4,
    unitCost: 7200
  },
  {
    id: "prod-nail-gel",
    name: "UV LED Gel Polish Set & Acrylics",
    category: "Nail products",
    quantity: 18,
    reorderLevel: 6,
    unitCost: 5200
  },
  {
    id: "prod-lipstick",
    name: "Velvet Matte Liquid Lipsticks (6 Shades)",
    category: "Cosmetics",
    quantity: 12,
    reorderLevel: 4,
    unitCost: 7800
  },
  {
    id: "prod-extensions",
    name: "100% Virgin Hair Silk Extensions 20\"",
    category: "Hair extensions",
    quantity: 8,
    reorderLevel: 3,
    unitCost: 35000
  },
  {
    id: "prod-towels",
    name: "Plush Microfiber Salon Towels (Pack of 10)",
    category: "Towels",
    quantity: 28,
    reorderLevel: 10,
    unitCost: 2200
  }
];

// 7. SAMPLE EXPENSES (Rent, Utilities, Supplies, Payroll, Marketing)
export function getSampleExpenses() {
  const dayMinus12 = getRelativeDate(-12);
  const dayMinus8 = getRelativeDate(-8);
  const dayMinus5 = getRelativeDate(-5);
  const dayMinus3 = getRelativeDate(-3);

  return [
    {
      id: "exp-rent",
      description: "Salon Studio Monthly Rent (Kigali Heights, Kimihurura)",
      category: "Rent",
      amount: 450000,
      date: dayMinus12
    },
    {
      id: "exp-supplies",
      description: "Professional Hair & Nail Care Supply Restock",
      category: "Supplies",
      amount: 145000,
      date: dayMinus8
    },
    {
      id: "exp-utilities",
      description: "Electricity & Water Bills (EUCL / WASAC)",
      category: "Utilities",
      amount: 68000,
      date: dayMinus5
    },
    {
      id: "exp-payroll",
      description: "Stylist Commissions & Bi-weekly Advances",
      category: "Payroll",
      amount: 320000,
      date: dayMinus3
    },
    {
      id: "exp-marketing",
      description: "Instagram & TikTok Sponsored Beauty Promotions",
      category: "Marketing",
      amount: 50000,
      date: dayMinus3
    }
  ];
}

// 8. SAMPLE STOCK MOVEMENTS
export function getSampleStockMovements() {
  const dayMinus5 = getRelativeDate(-5);
  const dayMinus2 = getRelativeDate(-2);
  const today = getRelativeDate(0);

  return [
    {
      id: "stock-m-01",
      productId: "prod-shampoo-argan",
      productName: "Hydrating Argan Oil Shampoo",
      type: "in",
      quantity: 12,
      note: "Restock from Kigali Beauty Distributors",
      date: dayMinus5,
      createdAt: `${dayMinus5}T10:00:00.000Z`,
      balanceAfter: 16
    },
    {
      id: "stock-m-02",
      productId: "prod-conditioner-moisture",
      productName: "Deep Moisture Conditioner",
      type: "out",
      quantity: 8,
      note: "Heavy weekend wash-day usage at backwash station",
      date: dayMinus2,
      createdAt: `${dayMinus2}T16:00:00.000Z`,
      balanceAfter: 0
    },
    {
      id: "stock-m-03",
      productId: "prod-hair-oil",
      productName: "Organic Castor & Tea Tree Hair Oil",
      type: "out",
      quantity: 3,
      note: "Used during dreadlocks and protective braids sessions",
      date: today,
      createdAt: `${today}T11:00:00.000Z`,
      balanceAfter: 22
    }
  ];
}

// 9. SAMPLE REVIEWS
export const SAMPLE_REVIEWS = [
  {
    id: "rev-1",
    name: "Clarisse Umutoni",
    customerId: "customer-clarisse",
    location: "Kimihurura, Kigali",
    rating: 5,
    comment: "Marie did my protective knotless braids so neatly! No painful tension, super fast, and the salon ambiance is pure luxury.",
    date: getRelativeDate(-3),
    createdAt: `${getRelativeDate(-3)}T15:00:00.000Z`
  },
  {
    id: "rev-2",
    name: "David Mugisha",
    customerId: "customer-david",
    location: "Kacyiru, Kigali",
    rating: 5,
    comment: "Jean gave me a razor sharp fade and hot towel beard trim. Clean tools, very professional staff. Best barber in town.",
    date: getRelativeDate(-2),
    createdAt: `${getRelativeDate(-2)}T12:30:00.000Z`
  },
  {
    id: "rev-3",
    name: "Keza Uwase",
    customerId: "customer-keza",
    location: "Nyarutarama, Kigali",
    rating: 5,
    comment: "Sarah's gel manicure and nail art lasted over 3 weeks without chipping! Beautiful clean salon.",
    date: getRelativeDate(-2),
    createdAt: `${getRelativeDate(-2)}T16:00:00.000Z`
  },
  {
    id: "rev-4",
    name: "Aline Mukamana",
    customerId: "customer-aline",
    location: "Remera, Kigali",
    rating: 5,
    comment: "Got my bridal makeup and hair trial done here. Everyone was amazed at how natural and glowing it looked. 10/10!",
    date: getRelativeDate(-1),
    createdAt: `${getRelativeDate(-1)}T14:00:00.000Z`
  },
  {
    id: "rev-5",
    name: "Patrick Nzeyimana",
    customerId: "customer-patrick",
    location: "Gisozi, Kigali",
    rating: 5,
    comment: "Jean is a dreadlocks master. Did my wash and interlocking smoothly. Very impressed with the online booking convenience.",
    date: getRelativeDate(-1),
    createdAt: `${getRelativeDate(-1)}T17:00:00.000Z`
  }
];

// 10. SAMPLE NOTIFICATION LOG (For customer dashboard)
export function getSampleNotifications() {
  const today = getRelativeDate(0);
  const dayMinus3 = getRelativeDate(-3);

  return [
    {
      id: "notif-01",
      type: "booking-created",
      customerId: "customer-clarisse",
      customerName: "Clarisse Umutoni",
      serviceName: "Haircut & Wash",
      stylist: "Jean",
      date: today,
      time: "09:00",
      createdAt: `${today}T07:30:00.000Z`
    },
    {
      id: "notif-02",
      type: "appointment-confirmed",
      customerId: "customer-clarisse",
      customerName: "Clarisse Umutoni",
      serviceName: "Silk Press & Hair Styling",
      stylist: "Jean",
      date: getRelativeDate(1),
      time: "10:00",
      createdAt: `${today}T10:00:00.000Z`
    },
    {
      id: "notif-03",
      type: "payment-recorded",
      customerId: "customer-clarisse",
      customerName: "Clarisse Umutoni",
      serviceName: "Protective Braids",
      amount: 25000,
      createdAt: `${dayMinus3}T12:35:00.000Z`
    }
  ];
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================
export function seedSampleData(force = false) {
  let seededAny = false;

  // 1. Services with photos (always update if missing images or empty)
  const currentServices = readList(KEYS.services);
  if (force || !currentServices.length || !currentServices[0]?.image) {
    saveJson(KEYS.services, SAMPLE_SERVICES);
    seededAny = true;
  }

  // 2. Staff profiles
  const currentStaff = readList(KEYS.staff);
  if (force || !currentStaff.length || !currentStaff[0]?.pinHash) {
    saveJson(KEYS.staff, SAMPLE_STAFF);
    seededAny = true;
  }

  // 3. Registered customer accounts
  const currentUsers = readList(KEYS.users);
  if (force || !currentUsers.length) {
    saveJson(KEYS.users, SAMPLE_USERS);
    seededAny = true;
  }

  // Managed customer profiles and public promotions
  const currentAdminCustomers = readList(KEYS.adminCustomers);
  if (force || !currentAdminCustomers.length) {
    saveJson(KEYS.adminCustomers, [
      { id: "managed-patrick", name: "Patrick Nzeyimana", phone: "+250 788 888 999", email: "patrick@gmail.com" },
      { id: "managed-divine", name: "Divine Uwera", phone: "+250 788 333 111", email: "divine@gmail.com" },
      { id: "managed-grace", name: "Grace Kamanzi", phone: "+250 788 555 444", email: "grace@gmail.com" }
    ]);
    seededAny = true;
  }

  const currentOffers = readList(KEYS.offers);
  if (force || !currentOffers.length) {
    saveJson(KEYS.offers, [
      { id: "offer-weekend", title: "Weekend Beauty Offer", description: "Get 15% OFF selected hair services this weekend.", serviceId: "haircut", discount: "15% OFF", badge: "WEEKEND OFFER" },
      { id: "offer-bridal", title: "Bridal Glow Package", description: "Save 20% OFF when booking hair and makeup together.", serviceId: "bridal", discount: "20% OFF", badge: "SPECIAL PACKAGE" },
      { id: "offer-nails", title: "Nails & Skin Pamper", description: "Enjoy a complimentary hydration massage with any gel manicure.", serviceId: "nails", discount: "FREE BONUS", badge: "LIMITED TIME" }
    ]);
    seededAny = true;
  }

  const currentSettings = readJson(KEYS.settings, null);
  if (force || !currentSettings) {
    saveJson(KEYS.settings, {
      name: "Salon Management",
      phone: "+250 788 000 123",
      email: "hello@salonmanagement.rw",
      whatsapp: "+250788000123",
      openTime: "09:00",
      closeTime: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00"
    });
    seededAny = true;
  }

  // 4. Appointments
  const currentAppts = readList(KEYS.appointments);
  if (force || !currentAppts.length) {
    const appointments = [...getSampleAppointments(), ...getHistoricalAppointments()];
    saveJson(KEYS.appointments, appointments);
    seededAny = true;
  }

  // 5. Payments
  const currentPayments = readList(KEYS.payments);
  if (force || !currentPayments.length) {
    const appointments = readList(KEYS.appointments);
    saveJson(KEYS.payments, [...getSamplePayments(), ...getHistoricalPayments(appointments)]);
    seededAny = true;
  }

  // 6. Inventory products
  const currentProducts = readList(KEYS.products);
  if (force || !currentProducts.length) {
    saveJson(KEYS.products, SAMPLE_PRODUCTS);
    seededAny = true;
  }

  // 7. Expenses
  const currentExpenses = readList(KEYS.expenses);
  if (force || !currentExpenses.length) {
    saveJson(KEYS.expenses, [...getSampleExpenses(), ...getHistoricalExpenses()]);
    seededAny = true;
  }

  // 8. Stock movements
  const currentMovements = readList(KEYS.stockMovements);
  if (force || !currentMovements.length) {
    saveJson(KEYS.stockMovements, getSampleStockMovements());
    seededAny = true;
  }

  // 9. Customer reviews
  const currentReviews = readList(KEYS.reviews);
  if (force || !currentReviews.length) {
    saveJson(KEYS.reviews, SAMPLE_REVIEWS);
    seededAny = true;
  }

  // 10. Notifications
  const currentNotifications = readList(KEYS.notificationLog);
  if (force || !currentNotifications.length) {
    saveJson(KEYS.notificationLog, getSampleNotifications());
    seededAny = true;
  }

  // 11. Favorites for Clarisse
  const clarisseFavs = readJson(`${KEYS.favoritesPrefix}customer-clarisse`, null);
  if (force || !clarisseFavs) {
    writeJson(`${KEYS.favoritesPrefix}customer-clarisse`, {
      services: ["braids", "nails", "haircut"],
      stylists: ["Marie", "Sarah"]
    });
    seededAny = true;
  }

  if (seededAny) {
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE, { detail: "seed-completed" }));
  }
  return seededAny;
}
