import { Empty, PageHeading, shortDate, useAdmin } from "./ui.jsx";

export default function Reviews() {
  const { reviews, setReviews, appointments, accounts, services, showToast } = useAdmin();
  const sorted = [...reviews].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const respond = (event, review) => {
    event.preventDefault();
    const adminResponse = String(new FormData(event.currentTarget).get("response") || "").trim();
    setReviews(reviews.map(item => (item.id === review.id ? { ...item, adminResponse, adminRespondedAt: new Date().toISOString() } : item)));
    showToast("Review response saved.");
  };

  return (
    <>
      <PageHeading eyebrow="Feedback" title="Reviews">{sorted.length} review{sorted.length === 1 ? "" : "s"} from customers.</PageHeading>
      <section className="panel">
        {sorted.map(review => {
          const appointment = appointments.find(item => item.id === review.appointmentId);
          const customer = accounts.find(item => item.id === review.customerId);
          const stars = Number(review.rating) || 0;
          const service = appointment?.serviceName || services.find(s => s.id === appointment?.serviceId)?.name || "Salon service";
          return (
            <article className="activity-row" key={review.id}>
              <div className="activity-main">
                <div className="activity-heading">
                  <strong>{customer?.name || appointment?.customer || "Customer"}</strong>
                  <span className="stars" aria-label={`${stars} out of 5 stars`}>{"★".repeat(stars)}{"☆".repeat(Math.max(0, 5 - stars))}</span>
                </div>
                <p className="meta">{service}{appointment?.date ? ` · ${shortDate(appointment.date)}` : ""}</p>
                {review.comment && <p>{review.comment}</p>}
                <form className="stack" onSubmit={event => respond(event, review)}>
                  <label htmlFor={`resp-${review.id}`}>Admin response</label>
                  <textarea id={`resp-${review.id}`} name="response" rows={2} maxLength={600} placeholder="Write a response" defaultValue={review.adminResponse || ""} />
                  <div><button className="btn btn-sm" type="submit">{review.adminResponse ? "Update response" : "Save response"}</button></div>
                </form>
              </div>
              <time className="meta">{review.createdAt && shortDate(review.createdAt.slice(0, 10))}</time>
            </article>
          );
        })}
        {!sorted.length && <Empty>No customer reviews yet.</Empty>}
      </section>
    </>
  );
}
