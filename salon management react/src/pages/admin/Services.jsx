import { useState } from "react";
import { Empty, PageHeading, Pill, money, useAdmin } from "./ui.jsx";
import { serviceImage } from "../../lib/salon.js";

const BLANK = { id: "", name: "", category: "", price: "", duration: "", description: "", image: "", available: true };

export default function Services() {
  const { services, setServices, appointments, showToast } = useAdmin();
  const [form, setForm] = useState(BLANK);
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = event => {
    event.preventDefault();
    const service = {
      ...services.find(item => item.id === form.id),
      id: form.id || `service-${crypto.randomUUID()}`,
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      duration: Number(form.duration),
      description: form.description.trim(),
      image: form.image.trim(),
      available: form.available
    };
    setServices(form.id ? services.map(item => (item.id === form.id ? service : item)) : [...services, service]);
    setForm(BLANK);
    showToast("Service and price saved.");
  };

  const toggle = service => {
    const available = service.available === false;
    setServices(services.map(item => (item.id === service.id ? { ...item, available } : item)));
    showToast(available ? "Service is available for booking." : "Service is unavailable for booking.");
  };

  const remove = service => {
    if (appointments.some(row => row.serviceId === service.id)) { showToast("This service has appointments and cannot be deleted. Edit it instead."); return; }
    if (!window.confirm(`Delete ${service.name} from the menu?`)) return;
    setServices(services.filter(item => item.id !== service.id));
  };

  return (
    <>
      <PageHeading eyebrow="Menu management" title="Services & prices">Changes are shared with the salon homepage and booking form on this browser.</PageHeading>
      <div className="management-layout">
        <form className="panel stack" onSubmit={submit}>
          <h2>{form.id ? "Edit service" : "Add service"}</h2>
          <div className="field"><label htmlFor="sv-name">Name</label><input id="sv-name" required maxLength={80} value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div className="field"><label htmlFor="sv-cat">Category</label><input id="sv-cat" required maxLength={60} value={form.category} onChange={e => set("category", e.target.value)} /></div>
          <div className="field"><label htmlFor="sv-price">Price (RWF)</label><input id="sv-price" type="number" min="0" step="100" required value={form.price} onChange={e => set("price", e.target.value)} /></div>
          <div className="field"><label htmlFor="sv-dur">Duration (minutes)</label><input id="sv-dur" type="number" min="15" step="5" required value={form.duration} onChange={e => set("duration", e.target.value)} /></div>
          <div className="field"><label htmlFor="sv-image">Image Photo URL</label><input id="sv-image" type="url" placeholder="https://..." value={form.image} onChange={e => set("image", e.target.value)} /></div>
          <div className="field"><label htmlFor="sv-desc">Description</label><textarea id="sv-desc" rows={3} maxLength={300} value={form.description} onChange={e => set("description", e.target.value)} /></div>
          <label className="check"><input type="checkbox" checked={form.available} onChange={e => set("available", e.target.checked)} /> Available for booking</label>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit">Save service</button>
            <button className="btn btn-outline" type="button" onClick={() => setForm(BLANK)}>Reset</button>
          </div>
        </form>
        <section className="panel">
          <h2>Menu</h2>
          {services.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Service</th><th>Category</th><th>Duration</th><th>Price</th><th>Actions</th></tr></thead>
                <tbody>
                  {services.map(service => {
                    const img = serviceImage(service);
                    return (
                      <tr key={service.id}>
                        <td>
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <img
                              src={img.src}
                              alt={img.alt}
                              style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                              loading="lazy"
                            />
                            <div>
                              <strong>{service.name}</strong>
                              <small style={{ display: "block", color: "var(--color-ink-muted)", marginTop: "2px" }}>{service.description}</small>
                              <Pill tone={service.available === false ? "low" : "ok"}>{service.available === false ? "Unavailable" : "Available"}</Pill>
                            </div>
                          </div>
                        </td>
                        <td>{service.category}</td>
                        <td>{Number(service.duration)} min</td>
                        <td>{money(service.price)}</td>
                        <td>
                          <div className="btn-row">
                            <button type="button" className="btn btn-sm" onClick={() => { setForm({ ...BLANK, ...service, price: service.price ?? "", duration: service.duration ?? "", description: service.description ?? "", image: service.image || "", available: service.available !== false }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                            <button type="button" className="btn btn-sm" onClick={() => toggle(service)}>{service.available === false ? "Make available" : "Make unavailable"}</button>
                            <button type="button" className="btn btn-sm danger" onClick={() => remove(service)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty>No services yet.</Empty>}
        </section>
      </div>
    </>
  );
}
