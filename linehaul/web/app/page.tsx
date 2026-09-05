import Link from "next/link";
import { fetchConsignments, fetchDashboardSummary, fetchLaneStats } from "@/lib/api";
import { aud, formatUtc, STATUS_LABELS, statusClass } from "@/lib/format";
import type { ConsignmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: (ConsignmentStatus | undefined)[] = [
  undefined, "Booked", "PickedUp", "InTransit", "OutForDelivery", "Held", "Delivered",
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = FILTERS.find((f) => f === status);

  const [summary, lanes, consignments] = await Promise.all([
    fetchDashboardSummary(),
    fetchLaneStats(),
    fetchConsignments(activeStatus),
  ]);

  const onTimePct =
    summary.delivered === 0
      ? null
      : Math.round((summary.deliveredOnTime / summary.delivered) * 1000) / 10;

  return (
    <main>
      <h1>Operations</h1>
      <p className="sub">Last 30 days, live from the event log.</p>

      <div className="tiles">
        <div className="tile">
          <span className="tile__n">{summary.totalLast30Days}</span>
          <span className="tile__k">consignments booked</span>
        </div>
        <div className="tile">
          <span className="tile__n">{summary.delivered}</span>
          <span className="tile__k">delivered</span>
        </div>
        <div className="tile">
          <span className={`tile__n ${onTimePct !== null && onTimePct >= 90 ? "tile__n--good" : ""}`}>
            {onTimePct === null ? "—" : `${onTimePct}%`}
          </span>
          <span className="tile__k">delivered inside the window</span>
        </div>
        <div className="tile">
          <span className={`tile__n ${summary.currentlyHeld > 0 ? "tile__n--bad" : ""}`}>
            {summary.currentlyHeld}
          </span>
          <span className="tile__k">currently held</span>
        </div>
        <div className="tile">
          <span className={`tile__n ${summary.overdueNow > 0 ? "tile__n--bad" : ""}`}>
            {summary.overdueNow}
          </span>
          <span className="tile__k">in flight and past their window</span>
        </div>
      </div>

      <h2>Lanes</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Lane</th>
              <th className="num">Delivered</th>
              <th className="num">Avg transit (h)</th>
              <th className="num">p90 transit (h)</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => (
              <tr key={`${lane.originCode}-${lane.destinationCode}`}>
                <td className="ref">
                  {lane.originCode} → {lane.destinationCode}
                </td>
                <td className="num">{lane.deliveredCount}</td>
                <td className="num">{lane.avgTransitHours.toFixed(1)}</td>
                <td className="num">{lane.p90TransitHours.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Consignments</h2>
      <nav className="filters" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f ?? "all"}
            href={f ? `/?status=${f}` : "/"}
            aria-current={f === activeStatus}
          >
            {f ? STATUS_LABELS[f] : "All"}
          </Link>
        ))}
      </nav>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Lane</th>
              <th>Consignor</th>
              <th>Consignee</th>
              <th>Status</th>
              <th className="num">Dead (kg)</th>
              <th className="num">Cubic (m³)</th>
              <th className="num">Total ex GST</th>
              <th>Required by</th>
            </tr>
          </thead>
          <tbody>
            {consignments.items.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
                  Nothing in this state right now.
                </td>
              </tr>
            )}
            {consignments.items.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link className="ref" href={`/consignments/${c.id}`}>
                    {c.reference}
                  </Link>
                </td>
                <td className="ref">
                  {c.originCode} → {c.destinationCode}
                </td>
                <td>{c.consignorName}</td>
                <td>{c.consigneeName}</td>
                <td>
                  <span className={statusClass(c.status)}>{STATUS_LABELS[c.status]}</span>
                </td>
                <td className="num">{c.deadWeightKg.toLocaleString("en-AU")}</td>
                <td className="num">{c.cubicMetres.toFixed(1)}</td>
                <td className="num">{aud.format(c.totalExGst)}</td>
                <td className="ref">{formatUtc(c.requiredDeliveryUtc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub" style={{ marginTop: 12 }}>
        Showing {consignments.items.length} of {consignments.totalRows}.
      </p>
    </main>
  );
}
