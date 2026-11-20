import { createContext, useCallback, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "kigali-beauty-lang-v1";

// English text is the key; anything missing here simply stays in English.
const RW = {
  "Home": "Ahabanza",
  "Services": "Serivisi",
  "About Us": "Abo turi bo",
  "Stylists": "Abakozi",
  "Gallery": "Amafoto",
  "Contact": "Twandikire",
  "BOOK APPOINTMENT": "FATA GAHUNDA",
  "LOGIN / ACCOUNT": "INJIRA / KONTI",
  "My Account": "Konti yanjye",
  "Look Good.": "Ugaragare neza.",
  "Feel Confident.": "Wigirire icyizere.",
  "Reserve an Appointment": "Fata gahunda",
  "Explore Menu": "Reba serivisi",
  "Discover our treatments": "Menya serivisi zacu",
  "Treatment Menu": "Urutonde rwa serivisi",
  "Featured Services & Treatments": "Serivisi zacu",
  "Book Now": "Fata gahunda",
  "Why choose us": "Impamvu uduhitamo",
  "Meet our stylists": "Menya abakozi bacu",
  "The team": "Itsinda ryacu",
  "Our work": "Akazi kacu",
  "Testimonials": "Ubuhamya",
  "What our clients say": "Icyo abakiliya bavuga",
  "Reserve your spot": "Kuraho umwanya wawe",
  "Book an appointment": "Fata gahunda",
  "FAQ": "Ibibazo bikunze kubazwa",
  "Good to know": "Ibyo wamenya",
  "Visit us": "Udusure",
  "Special offers": "Ibyiza byihariye",
  "Current promotions": "Promosiyo zihari",
  "Service": "Serivisi",
  "Stylist": "Umukozi",
  "Date": "Itariki",
  "Time": "Isaha",
  "Branch": "Ishami",
  "Payment method": "Uburyo bwo kwishyura",
  "Full name": "Amazina yombi",
  "Phone": "Telefoni",
  "Notes or preferences": "Ibyo wifuza cyangwa ukunda",
  "Select service": "Hitamo serivisi",
  "Select stylist": "Hitamo umukozi",
  "Any available stylist": "Umukozi wese uhari",
  "Available": "Hari",
  "Booked": "Yafashwe",
  "Break": "Ikiruhuko",
  "Unavailable": "Ntihari",
  "Confirm Appointment Reservation ↗": "Emeza gahunda ↗",
  "Sign in to Reserve Appointment ↗": "Injira kugira ngo ufate gahunda ↗",
  "Appointment Confirmed": "Gahunda yemejwe",
  "Show this QR code at the salon.": "Erekana iyi QR code ku isalon.",
  "View my appointments": "Reba gahunda zanjye",
  "Book another": "Fata indi",
  "All rights reserved.": "Uburenganzira bwose burafitwe.",
  "Staff Portal": "Ku bakozi",
  "Admin Workspace": "Ubuyobozi",
  "Chat on WhatsApp": "Twandikire kuri WhatsApp"
};

const DICTIONARIES = { en: {}, rw: RW };
const LangContext = createContext({ lang: "en", setLang: () => {}, t: text => text });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "rw" ? "rw" : "en"; } catch { return "en"; }
  });
  const setLang = useCallback(next => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage disabled */ }
    document.documentElement.lang = next === "rw" ? "rw" : "en";
  }, []);
  const value = useMemo(() => ({ lang, setLang, t: text => DICTIONARIES[lang][text] || text }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
