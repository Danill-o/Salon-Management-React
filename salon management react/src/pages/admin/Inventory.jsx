import { useState } from "react";
import { publishEvent } from "../../lib/notifications.js";
import { localDate } from "../../lib/salon.js";
import { INVENTORY_CATEGORIES } from "../../lib/adminData.js";
import { Empty, PageHeading, Pill, Row, money, shortDate, useAdmin } from "./ui.jsx";

const BLANK = { id: "", name: "", category: INVENTORY_CATEGORIES[0], quantity: "", reorderLevel: "", unitCost: "" };
const BLANK_MOVE = { productId: "", type: "in", quantity: "", note: "" };

export default function Inventory() {
  const { products, setProducts, movements, setMovements, showToast } = useAdmin();
  const [form, setForm] = useState(BLANK);
  const [move, setMove] = useState(BLANK_MOVE);
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const low = products.filter(product => Number(product.quantity) <= Number(product.reorderLevel));

  const lowStockEvent = product =>
    publishEvent("low-stock", { productId: product.id, productName: product.name, quantity: product.quantity, reorderLevel: product.reorderLevel });

  const submit = event => {
    event.preventDefault();
    const existing = products.find(item => item.id === form.id);
    const product = {
      ...existing,
      id: form.id || `product-${crypto.randomUUID()}`,
      name: form.name.trim(),
      category: form.category,
      quantity: existing ? Number(existing.quantity) : Number(form.quantity),
      reorderLevel: Number(form.reorderLevel),
      unitCost: Number(form.unitCost)
    };
    setProducts(form.id ? products.map(item => (item.id === form.id ? product : item)) : [...products, product]);
    if (!existing && product.quantity <= product.reorderLevel) lowStockEvent(product);
    setForm(BLANK);
    showToast("Inventory item saved.");
  };

  const remove = product => {
    if (window.confirm(`Delete ${product.name} from inventory?`)) setProducts(products.filter(item => item.id !== product.id));
  };

  const recordMovement = event => {
    event.preventDefault();
    const product = products.find(item => item.id === (move.productId || products[0]?.id));
    const quantity = Number(move.quantity);
    if (!product || !Number.isInteger(quantity) || quantity <= 0) return;
    if (move.type === "out" && quantity > Number(product.quantity)) { showToast("Stock used cannot exceed the available quantity."); return; }
    const previous = Number(product.quantity);
    const updated = { ...product, quantity: previous + (move.type === "in" ? quantity : -quantity) };
    const entry = {
      id: `stock-${crypto.randomUUID()}`, productId: product.id, productName: product.name, type: move.type, quantity,
      note: move.note.trim(), date: localDate(), createdAt: new Date().toISOString(), balanceAfter: updated.quantity
    };
    setProducts(products.map(item => (item.id === product.id ? updated : item)));
    setMovements([entry, ...movements]);
    if (previous > Number(product.reorderLevel) && updated.quantity <= Number(product.reorderLevel)) lowStockEvent(updated);
    setMove(BLANK_MOVE);
    showToast(`${entry.type === "in" ? "Stock received" : "Stock usage recorded"}: ${product.name} now has ${updated.quantity}.`);
  };

  return (
    <>
      <PageHeading eyebrow="Inventory" title="Products">Track salon materials and get low-stock alerts.</PageHeading>
      {low.length > 0 && <p className="alert warning" role="status">Low-stock alert: {low.map(item => `${item.name} (${item.quantity})`).join(", ")}</p>}
      <div className="management-layout">
        <form className="panel stack" onSubmit={submit}>
          <h2>{form.id ? "Edit product" : "Add product"}</h2>
          <div className="field"><label htmlFor="p-name">Name</label><input id="p-name" required maxLength={100} value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div className="field"><label htmlFor="p-cat">Category</label>
            <select id="p-cat" required value={form.category} onChange={e => set("category", e.target.value)}>
              {INVENTORY_CATEGORIES.map(category => <option key={category}>{category}</option>)}
            </select></div>
          <div className="field"><label htmlFor="p-qty">Quantity {form.id && "(use stock movements to change)"}</label>
            <input id="p-qty" type="number" min="0" step="1" required readOnly={Boolean(form.id)} value={form.quantity} onChange={e => set("quantity", e.target.value)} /></div>
          <div className="field"><label htmlFor="p-reorder">Reorder level</label><input id="p-reorder" type="number" min="0" step="1" required value={form.reorderLevel} onChange={e => set("reorderLevel", e.target.value)} /></div>
          <div className="field"><label htmlFor="p-cost">Unit cost (RWF)</label><input id="p-cost" type="number" min="0" step="100" required value={form.unitCost} onChange={e => set("unitCost", e.target.value)} /></div>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit">Save product</button>
            <button className="btn btn-outline" type="button" onClick={() => setForm(BLANK)}>Reset</button>
          </div>
        </form>
        <section className="panel">
          <h2>Inventory</h2>
          {products.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Category</th><th>Qty</th><th>Reorder at</th><th>Unit cost</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map(product => {
                    const isLow = Number(product.quantity) <= Number(product.reorderLevel);
                    return (
                      <tr key={product.id}>
                        <td><strong>{product.name}</strong></td>
                        <td>{product.category || "—"}</td>
                        <td>{Number(product.quantity).toLocaleString()}</td>
                        <td>{Number(product.reorderLevel).toLocaleString()}</td>
                        <td>{money(product.unitCost)}</td>
                        <td><Pill tone={isLow ? "low" : "ok"}>{isLow ? "Reorder" : "In stock"}</Pill></td>
                        <td>
                          <div className="btn-row">
                            <button type="button" className="btn btn-sm" onClick={() => { setForm({ ...BLANK, ...product }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                            <button type="button" className="btn btn-sm danger" onClick={() => remove(product)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty>No products yet.</Empty>}
        </section>
      </div>

      <section className="panel">
        <h2>Stock In / Stock Used</h2>
        <p className="form-note">Record deliveries and product usage to keep available quantities accurate.</p>
        <form className="inline-form" onSubmit={recordMovement}>
          <div className="field"><label htmlFor="m-product">Product</label>
            <select id="m-product" required value={move.productId || products[0]?.id || ""} onChange={e => setMove({ ...move, productId: e.target.value })}>
              {products.length ? products.map(item => <option key={item.id} value={item.id}>{item.name} · {Number(item.quantity)} in stock</option>) : <option value="">No products available</option>}
            </select></div>
          <div className="field"><label htmlFor="m-type">Movement</label>
            <select id="m-type" value={move.type} onChange={e => setMove({ ...move, type: e.target.value })}><option value="in">Stock In</option><option value="out">Stock Used</option></select></div>
          <div className="field"><label htmlFor="m-qty">Quantity</label><input id="m-qty" type="number" min="1" step="1" required value={move.quantity} onChange={e => setMove({ ...move, quantity: e.target.value })} /></div>
          <div className="field"><label htmlFor="m-note">Note</label><input id="m-note" maxLength={120} placeholder="Supplier, service, or reason" value={move.note} onChange={e => setMove({ ...move, note: e.target.value })} /></div>
          <button className="btn btn-primary" type="submit" disabled={!products.length}>Save stock movement</button>
        </form>
        {movements.slice(0, 30).map(item => (
          <Row key={item.id} tone={item.type === "in" ? "ok" : "low"}
            left={`${shortDate(item.date)} · ${item.productName} · ${item.note || "Stock adjustment"}`}
            right={`${item.type === "in" ? "Stock In" : "Stock Used"} ${Number(item.quantity)} · ${Number(item.balanceAfter)} left`} />
        ))}
        {!movements.length && <Empty>No stock movements recorded yet.</Empty>}
      </section>
    </>
  );
}
