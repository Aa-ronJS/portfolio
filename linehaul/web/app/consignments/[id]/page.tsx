import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchConsignment } from "@/lib/api";
import { aud, formatUtc, STATUS_LABELS, statusClass } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ConsignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const detail = await fetchConsignment(numericId);
  if (!detail) notFound();

  const { consignment: c, items, events, allowedNextStatuses } = detail;
  const gst = Math.round(c.totalExGst * 10) / 100;

  return (
    <main>
      <p className="crumb">
        <Link href="/">← operations</Link>
      </p>

      <h1>
        <span className="ref">{c.reference}</span>
      </h1>
      <p className="sub">
        {c.originName} → {c.destinationName} ·{" "}
        <span className={statusClass(c.status)}>{STATUS_LABELS[c.status]}</span>
      </p>

      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2 style={{ marginTop: 0 }}>Consignment</h2>
            <dl className="kv">
              <dt>Consignor</dt>
              <dd>{c.consignorName}</dd>
              <dt>Consignee</dt>
              <dd>{c.consigneeName}</dd>
              <dt>Required by</dt>
              <dd>{formatUtc(c.requiredDeliveryUtc)}</dd>
              <dt>Booked</dt>
              <dd>{formatUtc(c.createdAtUtc)}</dd>
              <dt>Dead weight</dt>
              <dd>{c.deadWeightKg.toLocaleString("en-AU")} kg</dd>
              <dt>Cubic</dt>
              <dd>{c.cubicMetres.toFixed(3)} m³</dd>
              <dt>Chargeable</dt>
              <dd>{c.chargeableWeightKg.toLocaleString("en-AU")} kg</dd>
              <dt>Freight</dt>
              <dd>{aud.format(c.freightExGst)}</dd>
              <dt>Fuel levy</dt>
              <dd>{aud.format(c.fuelLevyExGst)}</dd>
              <dt>Total ex GST</dt>
              <dd>
                <b>{aud.format(c.totalExGst)}</b> (+{aud.format(gst)} GST)
              </dd>
              {c.notes && (
                <>
                  <dt>Notes</dt>
                  <dd>{c.notes}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="panel" style={{ marginTop: 24 }}>
            <h2 style={{ marginTop: 0 }}>Items</h2>
            <div className="tablewrap" style={{ border: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="num">Qty</th>
                    <th className="num">Each (kg)</th>
                    <th className="num">L × W × H (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td className="num">{item.quantity}</td>
                      <td className="num">{item.weightKgEach.toLocaleString("en-AU")}</td>
                      <td className="num">
                        {item.lengthM} × {item.widthM} × {item.heightM}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div>
          <section className="panel">
            <h2 style={{ marginTop: 0 }}>History</h2>
            <ol className="timeline">
              {events.map((event) => (
                <li key={event.id}>
                  <time dateTime={event.occurredAtUtc}>{formatUtc(event.occurredAtUtc)}</time>
                  <b>{STATUS_LABELS[event.status]}</b>
                  {event.notes && <> · {event.notes}</>}
                  <div className="who">recorded by {event.recordedBy}</div>
                </li>
              ))}
            </ol>
          </section>

          {allowedNextStatuses.length > 0 && (
            <section className="panel" style={{ marginTop: 24 }}>
              <h2 style={{ marginTop: 0 }}>Next</h2>
              <p className="sub" style={{ margin: 0 }}>
                Legal next steps from {STATUS_LABELS[c.status]}:{" "}
                {allowedNextStatuses.map((s) => STATUS_LABELS[s]).join(", ")}. The API refuses
                anything else with a 409, and a stale write loses the race rather than the record.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
