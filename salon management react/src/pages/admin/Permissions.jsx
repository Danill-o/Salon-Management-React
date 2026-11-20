import { useState } from "react";
import { PageHeading, useAdmin } from "./ui.jsx";

export default function Permissions() {
  const { staff, setStaff, showToast } = useAdmin();
  const [selectedId, setSelectedId] = useState("");
  const person = staff.find(item => item.id === selectedId) || staff[0];
  const permissions = person?.permissions || {};

  const submit = event => {
    event.preventDefault();
    if (!person) return;
    const form = event.currentTarget;
    const next = { viewCustomerContacts: form.elements.viewCustomerContacts.checked, updateAppointments: form.elements.updateAppointments.checked };
    setStaff(staff.map(item => (item.id === person.id ? { ...item, permissions: next } : item)));
    showToast("Stylist permissions saved.");
  };

  return (
    <>
      <PageHeading eyebrow="Access" title="Access & permissions">Control what each stylist can do in the staff portal.</PageHeading>
      <form className="panel stack narrow-panel" key={person?.id} onSubmit={submit}>
        <div className="field">
          <label htmlFor="perm-stylist">Stylist</label>
          <select id="perm-stylist" name="stylistId" value={person?.id || ""} onChange={e => setSelectedId(e.target.value)}>
            {staff.length ? staff.map(item => <option key={item.id} value={item.id}>{item.name}</option>) : <option value="">No stylist profiles available</option>}
          </select>
        </div>
        <label className="check"><input type="checkbox" name="viewCustomerContacts" defaultChecked={permissions.viewCustomerContacts !== false} /> Can view customer contact details</label>
        <label className="check"><input type="checkbox" name="updateAppointments" defaultChecked={permissions.updateAppointments !== false} /> Can update appointment status</label>
        <div><button className="btn btn-primary" type="submit" disabled={!person}>Save permissions</button></div>
      </form>
    </>
  );
}
