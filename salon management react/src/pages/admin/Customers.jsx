import { useState } from "react";
import { appointmentCustomerKey, customerKey } from "../../lib/adminData.js";
import { Empty, PageHeading, shortDate, shortTime, useAdmin } from "./ui.jsx";

const BLANK = { id: "", name: "", phone: "", email: "" };

export default function Customers() {
  const { directory, appointments, services, accounts, setAccounts, adminCustomers, setAdminCustomers, showToast } = useAdmin();
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [form, setForm] = useState(BLANK);

  const q = query.trim().toLocaleLowerCase();
  const rows = directory.filter(c => `${c.name} ${c.phone} ${c.email}`.toLocaleLowerCase().includes(q));
  const selected = directory.find(c => c.key === selectedKey);
  const visits = selected
    ? appointments.filter(item => appointmentCustomerKey(item) === selectedKey).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
    : [];

  const submit = event => {
    event.preventDefault();
    const existing = directory.find(c => c.id === form.id);
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();
    const duplicate = directory.find(c => c.id !== existing?.id && (customerKey(c.phone, "", "") === customerKey(phone, "", "") || (email && c.email.toLowerCase() === email)));
    if (duplicate) { showToast("A customer with that phone number or email already exists."); return; }
    const name = form.name.trim();
    if (existing?.source === "account") {
      setAccounts(accounts.map(user => (user.id === existing.id ? { ...user, name, phone, email } : user)));
    } else {
      const record = { id: existing?.id || `admin-customer-${crypto.randomUUID()}`, name, phone, email };
      setAdminCustomers(existing ? adminCustomers.map(item => (item.id === record.id ? record : item)) : [...adminCustomers, record]);
    }
    setForm(BLANK);
    showToast(existing ? "Customer updated." : "Customer added.");
  };

  const remove = customer => {
    if (!window.confirm(`Delete ${customer.name}'s customer profile? Appointment and payment history will remain.`)) return;
    if (customer.source === "account") setAccounts(accounts.filter(item => item.id !== customer.id));
    else setAdminCustomers(adminCustomers.filter(item => item.id !== customer.id));
    setSelectedKey("");
    showToast("Customer profile deleted; appointment history retained.");
  };

  return (
    <>
      <PageHeading eyebrow="Clients" title="Customers">Registered accounts, walk-ins and profiles you add manually.</PageHeading>
      <div className="management-layout">
        <form className="panel stack" onSubmit={submit}>
          <h2>{form.id ? "Edit customer" : "Add customer"}</h2>
          <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label htmlFor="c-phone">Phone</label><input id="c-phone" type="tel" required minLength={7} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit">Save customer</button>
            <button className="btn btn-outline" type="button" onClick={() => setForm(BLANK)}>Reset</button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-head">
            <h2>{directory.length} customer{directory.length === 1 ? "" : "s"}</h2>
            <input type="search" className="inline-search" placeholder="Search customers" aria-label="Search customers" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          {rows.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Customer</th><th>Contact</th><th>Visits</th><th>Last visit</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.map(customer => (
                    <tr key={customer.key}>
                      <td><button type="button" className="link-btn" onClick={() => setSelectedKey(customer.key)}>{customer.name}</button><small>{customer.source}</small></td>
                      <td>{customer.phone}<small>{customer.email}</small></td>
                      <td>{customer.visits}</td>
                      <td>{shortDate(customer.last)}</td>
                      <td>
                        {customer.managed ? (
                          <div className="btn-row">
                            <button type="button" className="btn btn-sm" onClick={() => { setForm({ id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                            <button type="button" className="btn btn-sm danger" onClick={() => remove(customer)}>Delete</button>
                          </div>
                        ) : <span className="meta">Guest booking</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No customers found.</Empty>}
        </section>
      </div>

      <section className="panel">
        <h2>{selected ? `${selected.name} · ${visits.length} visit${visits.length === 1 ? "" : "s"}` : "Select a customer"}</h2>
        {selected && (visits.length ? visits.map(item => (
          <div className="report-row" key={item.id}>
            <span>{shortDate(item.date)} · {shortTime(item.time)} · {item.stylist}</span>
            <strong>{item.serviceName || services.find(s => s.id === item.serviceId)?.name || "Service"} · {item.status}</strong>
          </div>
        )) : <Empty>No appointments recorded for this customer.</Empty>)}
      </section>
    </>
  );
}
