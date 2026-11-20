import { useState } from "react";
import { localDate } from "../../lib/salon.js";
import { EXPENSE_CATEGORIES } from "../../lib/adminData.js";
import { Empty, PageHeading, money, shortDate, useAdmin } from "./ui.jsx";

const blank = () => ({ id: "", description: "", category: EXPENSE_CATEGORIES[0], amount: "", date: localDate() });

export default function Expenses() {
  const { expenses, setExpenses, showToast } = useAdmin();
  const [form, setForm] = useState(blank);
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = event => {
    event.preventDefault();
    const expense = { id: form.id || `expense-${crypto.randomUUID()}`, description: form.description.trim(), category: form.category, date: form.date, amount: Number(form.amount) };
    setExpenses(form.id ? expenses.map(item => (item.id === form.id ? expense : item)) : [...expenses, expense]);
    setForm(blank());
    showToast("Expense record saved.");
  };

  const remove = expense => {
    if (window.confirm(`Delete expense ${expense.description}?`)) setExpenses(expenses.filter(item => item.id !== expense.id));
  };

  return (
    <>
      <PageHeading eyebrow="Spending" title="Expenses">Record supplies, rent, utilities and other costs.</PageHeading>
      <div className="management-layout">
        <form className="panel stack" onSubmit={submit}>
          <h2>{form.id ? "Edit expense" : "Add expense"}</h2>
          <div className="field"><label htmlFor="e-desc">Description</label><input id="e-desc" required maxLength={120} value={form.description} onChange={e => set("description", e.target.value)} /></div>
          <div className="field"><label htmlFor="e-cat">Category</label>
            <select id="e-cat" value={form.category} onChange={e => set("category", e.target.value)}>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="e-amount">Amount (RWF)</label><input id="e-amount" type="number" min="1" step="1" required value={form.amount} onChange={e => set("amount", e.target.value)} /></div>
          <div className="field"><label htmlFor="e-date">Date</label><input id="e-date" type="date" required value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit">Save expense</button>
            <button className="btn btn-outline" type="button" onClick={() => setForm(blank())}>Reset</button>
          </div>
        </form>
        <section className="panel">
          <h2>Expense records</h2>
          {expenses.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Actions</th></tr></thead>
                <tbody>
                  {[...expenses].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(expense => (
                    <tr key={expense.id}>
                      <td>{shortDate(expense.date)}</td>
                      <td><strong>{expense.description}</strong></td>
                      <td>{expense.category}</td>
                      <td>{money(expense.amount)}</td>
                      <td>
                        <div className="btn-row">
                          <button type="button" className="btn btn-sm" onClick={() => { setForm({ ...expense, amount: expense.amount ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                          <button type="button" className="btn btn-sm danger" onClick={() => remove(expense)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No expenses recorded yet.</Empty>}
        </section>
      </div>
    </>
  );
}
