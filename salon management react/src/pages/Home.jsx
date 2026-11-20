import { useMemo, useState } from "react";
import BookingForm from "../components/BookingForm.jsx";
import Modal from "../components/Modal.jsx";
import {
  GALLERY, formatPrice, formatTime, getBookableServices, getOffers, getReviews, getSettings, getStylists, serviceImage
} from "../lib/salon.js";

const FAQS = [
  ["How do I book an appointment?", "Choose your preferred service, stylist, date and time slot in the booking section, then confirm. If you don't have an account yet, you will be invited to create one so you can view, reschedule, and track your loyalty points."],
  ["Can I reschedule or cancel?", "Yes. You can manage, reschedule or cancel upcoming bookings at any time in My Account → Appointments."],
  ["How does payment work?", "Payments are finalized in person at the salon upon completion of your service. Your receipts, totals, and points appear in your personal client dashboard."],
  ["Will I receive appointment reminders?", "Yes. You can enable instant browser notifications in My Account to receive helpful reminders prior to your session."]
];

const WHY = [
  ["👩‍🎨", "Professional Stylists", "Our team comprises certified hair, braid, nail, and makeup experts dedicated to giving you your best look."],
  ["🧴", "Quality Products", "We use premium, dermatologically tested, organic, and skin-safe products for vibrant and healthy results."],
  ["🏷️", "Affordable Prices", "Transparent pricing with no hidden charges. Premium quality care that fits your everyday budget."],
  ["📅", "Easy Online Booking", "Choose your service, preferred stylist, date, and time in under 60 seconds with instant confirmation."],
  ["🌿", "Clean & Comfortable", "Sanitized equipment, air-conditioned seating, refreshments, and a serene ambiance designed for relaxation."],
  ["⭐", "Experienced Staff", "Years of specialized experience in natural hair care, protective braids, dreadlocks, and bridal styling."]
];

const SERVICE_CATEGORIES = [
  ["all", "All Treatments"],
  ["Hair", "Hair & Braids"],
  ["Beauty", "Beauty & Nails"],
  ["Skin", "Skin & Facial"],
  ["Occasion", "Bridal & Occasion"]
];

const FILTERS = [
  ["all", "All Portfolio"],
  ["hairstyles", "Hairstyles"],
  ["braids", "Braids"],
  ["nails", "Nails"],
  ["makeup", "Makeup"],
  ["interior", "Salon Studio"],
  ["before-after", "Before & After"]
];

export default function Home({ customer, version, bookingRequest, onBook, onNeedLogin }) {
  const settings = getSettings();
  const allServices = useMemo(getBookableServices, [version]);
  const [serviceCat, setServiceCat] = useState("all");
  const stylists = useMemo(() => getStylists().slice(0, 3), [version]);
  const offers = useMemo(getOffers, [version]);
  const reviews = useMemo(() => getReviews().slice(0, 4), [version]);
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [openFaq, setOpenFaq] = useState(-1);

  const filteredServices = useMemo(() => {
    if (serviceCat === "all") return allServices.slice(0, 8);
    return allServices.filter(s => (s.category || "").toLowerCase() === serviceCat.toLowerCase());
  }, [allServices, serviceCat]);

  const gallery = GALLERY.filter(item => filter === "all" || item.category === filter);

  return (
    <>
      <section id="top" className="hero home-hero">
        <img
          className="hero-bg-photo"
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=2200&q=88"
          alt="Modern salon interior"
          fetchpriority="high"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-kicker"><span className="kicker-line" />Luxury Beauty &amp; Hair Atelier · Kigali, Rwanda</p>
          <h1>Your Beauty, Our Passion.<br /><em>Feel Confident.</em></h1>
          <p className="hero-subtext">Experience premium salon services in Kigali. Book your appointment online and enjoy personalized care.</p>
          <div className="hero-buttons">
            <button type="button" className="btn-primary" onClick={() => onBook()}>Book an Appointment <span>↗</span></button>
            <a className="btn-secondary" href="#services">Explore Our Services <span>↓</span></a>
          </div>
        </div>
        <div className="hero-footer-bar">
          <span>📍 Kigali, Rwanda</span>
          <a className="scroll-cue" href="#services"><span className="cue-bar" />Discover our treatments</a>
          <span>🕐 Open {formatTime(settings.openTime)} – {formatTime(settings.closeTime)}</span>
        </div>
      </section>

      <section id="services" className="section">
        <div className="container">
          <SectionHead eyebrow="Treatment Menu" title="Featured Services & Treatments" />

          {/* MAIN FEATURED CARDS (Hair, Nails, Makeup, Dreadlocks) */}
          <div className="featured-services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.4rem", marginBottom: "2.5rem" }}>
            <article className="card service-card featured-card" style={{ border: "1px solid var(--gold-border)" }}>
              <img src="https://images.pexels.com/photos/36441633/pexels-photo-36441633.jpeg?auto=compress&cs=tinysrgb&w=900" alt="Protective African Braids" loading="lazy" style={{ height: "205px", objectFit: "cover" }} />
              <div className="card-body">
                <div className="card-top">
                  <span className="badge">POPULAR</span>
                  <span className="index">01</span>
                </div>
                <h3>Protective Braids</h3>
                <p>Knotless braids, box braids and cornrows styled gently.</p>
                <div className="card-foot">
                  <span className="price">25,000 RWF</span>
                  <button type="button" className="link-btn" onClick={() => onBook("braids")}>Book Now ↗</button>
                </div>
              </div>
            </article>

            <article className="card service-card featured-card" style={{ border: "1px solid var(--gold-border)" }}>
              <img src="https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=900&q=80" alt="Nail Artist Gel Polish Manicure" loading="lazy" style={{ height: "205px", objectFit: "cover" }} />
              <div className="card-body">
                <div className="card-top">
                  <span className="badge">BEAUTY</span>
                  <span className="index">02</span>
                </div>
                <h3>Nails Care & Gel Polish</h3>
                <p>Manicure care, cuticle treatment, and custom nail art.</p>
                <div className="card-foot">
                  <span className="price">10,000 RWF</span>
                  <button type="button" className="link-btn" onClick={() => onBook("nails")}>Book Now ↗</button>
                </div>
              </div>
            </article>

            <article className="card service-card featured-card" style={{ border: "1px solid var(--gold-border)" }}>
              <img src="https://images.pexels.com/photos/7446906/pexels-photo-7446906.jpeg?auto=compress&cs=tinysrgb&w=900" alt="Makeup Artistry Application" loading="lazy" style={{ height: "205px", objectFit: "cover" }} />
              <div className="card-body">
                <div className="card-top">
                  <span className="badge">GLAM</span>
                  <span className="index">03</span>
                </div>
                <h3>Glam & Soft Makeup</h3>
                <p>Polished glam or natural glow look tailored for any event.</p>
                <div className="card-foot">
                  <span className="price">20,000 RWF</span>
                  <button type="button" className="link-btn" onClick={() => onBook("makeup")}>Book Now ↗</button>
                </div>
              </div>
            </article>

            <article className="card service-card featured-card" style={{ border: "1px solid var(--gold-border)" }}>
              <img src="https://images.pexels.com/photos/16736032/pexels-photo-16736032.jpeg?auto=compress&cs=tinysrgb&w=900" alt="Dreadlocks Locs Care" loading="lazy" style={{ height: "205px", objectFit: "cover" }} />
              <div className="card-body">
                <div className="card-top">
                  <span className="badge">HAIR</span>
                  <span className="index">04</span>
                </div>
                <h3>Dreadlocks Care</h3>
                <p>Loc installation, interlocking, root retwist and herbal wash.</p>
                <div className="card-foot">
                  <span className="price">50,000 RWF</span>
                  <button type="button" className="link-btn" onClick={() => onBook("dreadlocks")}>Book Now ↗</button>
                </div>
              </div>
            </article>
          </div>

          <div style={{ marginBottom: "1.2rem" }}>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 0.8rem" }}>Browse by Category</h3>
          </div>
          <div className="filters" role="group" aria-label="Service categories">
            {SERVICE_CATEGORIES.map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`chip${serviceCat === val ? " is-active" : ""}`}
                onClick={() => setServiceCat(val)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="card-grid">
            {filteredServices.map((service, index) => {
              const img = serviceImage(service);
              return (
                <article className="card service-card" key={service.id}>
                  <img src={img.src} alt={img.alt} loading="lazy" />
                  <div className="card-body">
                    <div className="card-top">
                      <span className="index">0{index + 1}</span>
                      <span className="badge subtle">{service.category || "Salon"}</span>
                    </div>
                    <h3>{service.name}</h3>
                    <p>{service.description}</p>
                    <p className="meta">⏱ {service.duration} min</p>
                    <div className="card-foot">
                      <strong className="price">{formatPrice(service.price)}</strong>
                      <button type="button" className="link-btn" onClick={() => onBook(service.id)}>Book Service ↗</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="about" className="section alt">
        <div className="container">
          <SectionHead eyebrow="About us" title="Why choose us" />
          <div className="why-grid">
            {WHY.map(([icon, title, text]) => (
              <article className="card why-card" key={title}>
                <span className="why-icon" aria-hidden="true">{icon}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="offers" className="section">
        <div className="container">
          <SectionHead eyebrow="Special offers" title="Current promotions" />
          <div className="card-grid">
            {offers.map(offer => (
              <article className="card offer-card" key={offer.id}>
                <span className="badge">{offer.badge || "SPECIAL OFFER"}</span>
                <h3>{offer.title}</h3>
                <p>{offer.description}</p>
                <div className="card-foot">
                  <strong className="price">{offer.discount || "SAVE"}</strong>
                  <button type="button" className="link-btn" onClick={() => onBook(offer.serviceId)}>Claim Offer ↗</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="stylists" className="section alt">
        <div className="container">
          <SectionHead eyebrow="The team" title="Meet our stylists" />
          <div className="card-grid">
            {stylists.map(person => (
              <article className="card stylist-card" key={person.id}>
                <img src={person.avatar} alt={`${person.name}, salon stylist`} loading="lazy" />
                <div className="card-body">
                  <div className="card-top">
                    <div>
                      <h3>{person.name}</h3>
                      <p className="meta">{person.specialty}</p>
                    </div>
                    <span className="rating">★ {Number(person.rating || 4.8).toFixed(1)}</span>
                  </div>
                  <p>{person.bio || "Professional salon styling for every look."}</p>
                  <div className="card-foot">
                    <span className="meta">{person.phone}</span>
                    <button type="button" className="link-btn" onClick={() => onBook()}>Book ↗</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="section">
        <div className="container">
          <SectionHead eyebrow="Our work" title="Gallery" />
          <div className="filters" role="group" aria-label="Gallery filters">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip${filter === value ? " is-active" : ""}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="gallery-grid">
            {gallery.map(item => (
              <figure className="gallery-item" key={item.src}>
                <button type="button" onClick={() => setLightbox(item)} aria-label={`Enlarge: ${item.caption}`}>
                  <img src={item.src} alt={item.alt} loading="lazy" />
                </button>
                <figcaption>{item.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <SectionHead eyebrow="Testimonials" title="What our clients say" />
          <div className="card-grid four">
            {reviews.map(review => (
              <article className="card review-card" key={review.id}>
                <div className="stars" aria-label={`${review.rating || 5} out of 5 stars`}>{"★".repeat(review.rating || 5)}</div>
                <p>“{review.comment}”</p>
                <strong>{review.name}</strong>
                {review.location && <span className="meta"> · {review.location}</span>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="booking" className="section">
        <div className="container narrow">
          <SectionHead eyebrow="Reserve your spot" title="Book an appointment" />
          <div className="booking-perks" style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1.2rem",
            marginBottom: "1.8rem",
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--muted)"
          }}>
            <span>✓ Instant Confirmation</span>
            <span>✓ Flexible Cancellation</span>
            <span>✓ Cash, Mobile Money or Card</span>
            <span>📞 {settings.phone || "+250 788 123 456"}</span>
          </div>
          <div className="card form-card">
            <BookingForm customer={customer} version={version} bookingRequest={bookingRequest} onNeedLogin={onNeedLogin} />
          </div>
        </div>
      </section>

      <section id="faq" className="section alt">
        <div className="container narrow">
          <SectionHead eyebrow="FAQ" title="Good to know" />
          {FAQS.map(([question, answer], index) => (
            <div className="faq-item" key={question}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={openFaq === index}
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
              >
                {question}<span aria-hidden="true">{openFaq === index ? "−" : "+"}</span>
              </button>
              {openFaq === index && <p className="faq-answer">{answer}</p>}
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="section">
        <div className="container">
          <SectionHead eyebrow="Visit us" title="Contact" />
          <div className="card-grid">
            <article className="card contact-card">
              <h3>Hours</h3>
              <p>{formatTime(settings.openTime)} – {formatTime(settings.closeTime)}</p>
            </article>
            <article className="card contact-card">
              <h3>Phone</h3>
              <p>{settings.phone ? <a href={`tel:${settings.phone.replace(/\s+/g, "")}`}>{settings.phone}</a> : "Ask us at the salon"}</p>
            </article>
            <article className="card contact-card">
              <h3>Email</h3>
              <p>{settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : "Available at the salon"}</p>
            </article>
          </div>
        </div>
      </section>

      {lightbox && (
        <Modal title={lightbox.caption} onClose={() => setLightbox(null)}>
          <img className="lightbox-img" src={lightbox.src} alt={lightbox.alt} />
        </Modal>
      )}
    </>
  );
}

function SectionHead({ eyebrow, title }) {
  return (
    <div className="section-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}
