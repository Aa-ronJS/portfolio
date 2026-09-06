// Deterministic demo fixtures, generated with the same rules as
// db/seed/100_demo_data.sql (same lanes, same status mix, same charge
// arithmetic), so the dashboard tells the same story whether it is running
// against the API or standing alone. Every company name is fictional.

import type {
  ConsignmentDetail,
  ConsignmentStatus,
  ConsignmentSummary,
  DashboardSummary,
  LaneStat,
  PagedResponse,
} from "./types";

const LANES = [
  { origin: "PER", destination: "KAL", typicalHours: 10, ratePerKg: 0.38, minimumCharge: 45, fuelLevyPct: 14.5 },
  { origin: "PER", destination: "PHE", typicalHours: 22, ratePerKg: 0.52, minimumCharge: 65, fuelLevyPct: 16.0 },
  { origin: "PER", destination: "ADL", typicalHours: 36, ratePerKg: 0.42, minimumCharge: 55, fuelLevyPct: 14.5 },
  { origin: "ADL", destination: "MEL", typicalHours: 12, ratePerKg: 0.24, minimumCharge: 40, fuelLevyPct: 13.0 },
  { origin: "MEL", destination: "SYD", typicalHours: 14, ratePerKg: 0.22, minimumCharge: 38, fuelLevyPct: 13.0 },
  { origin: "PER", destination: "MEL", typicalHours: 44, ratePerKg: 0.46, minimumCharge: 60, fuelLevyPct: 15.0 },
] as const;

const DEPOT_NAMES: Record<string, string> = {
  PER: "Perth (Kewdale)",
  KAL: "Kalgoorlie",
  PHE: "Port Hedland",
  ADL: "Adelaide (Wingfield)",
  MEL: "Melbourne (Laverton)",
  SYD: "Sydney (Eastern Creek)",
};

const CONSIGNORS = [
  "Goldfields Mining Supplies", "Westral Fabrication", "Pilbara Plant Hire",
  "Harvest Line Growers", "Southern Cross Packaging", "Nullarbor Freight Forwarding",
  "Kimberley Building Co", "Two Oceans Seafood",
];

const CONSIGNEES = [
  "Eyre Peninsula Hardware", "Great Northern Workshops", "Bight City Distributors",
  "Torrens Valley Growers", "Leeuwin Marine Services",
];

const ITEM_DESCRIPTIONS = [
  "Palletised freight", "Crated machinery parts", "Steel sections", "Drummed lubricant",
];

// Status follows age, matching the SQL seed: the newest bookings are still
// moving, the older ones are delivered, which is what a live board looks like.
function statusFor(i: number): ConsignmentStatus {
  if (i <= 2) return "Booked";
  if (i <= 4) return "PickedUp";
  if (i <= 7) return "InTransit";
  if (i <= 9) return "OutForDelivery";
  if (i <= 11) return "Held";
  return "Delivered";
}

const HOUR = 3_600_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

interface DemoRow {
  summary: ConsignmentSummary;
  detail: ConsignmentDetail;
  lateBy: number; // hours past the window for delivered rows, 0 if on time
  transitHours: number | null;
}

function generate(): DemoRow[] {
  // A fixed anchor keeps the fixtures stable across renders in one build,
  // fresh enough across deploys.
  const now = Date.now() - (Date.now() % HOUR);
  const rows: DemoRow[] = [];

  for (let i = 1; i <= 60; i++) {
    const lane = LANES[(i % 6)]!;
    const status = statusFor(i);
    const late = i % 7 === 0;

    const createdAt = now - 12 * i * HOUR;
    const requiredAt = createdAt + (lane.typicalHours + 12) * HOUR;
    const deadWeightKg = 40 + (i * 37) % 900;
    const cubicMetres = round2(0.1 + ((i * 53) % 39) / 10);

    const chargeable = Math.ceil(Math.max(deadWeightKg, cubicMetres * 250));
    const freight = Math.max(lane.minimumCharge, round2(chargeable * lane.ratePerKg));
    const levy = round2(freight * (lane.fuelLevyPct / 100));
    const totalExGst = round2(freight + levy);

    const reference = `LH-2026-${String(i).padStart(4, "0")}`;
    const iso = (ms: number) => new Date(ms).toISOString();

    const events: ConsignmentDetail["events"] = [
      { id: i * 10 + 1, status: "Booked", notes: "Booked", occurredAtUtc: iso(createdAt), recordedBy: "demo" },
    ];
    if (status !== "Booked") {
      events.push({ id: i * 10 + 2, status: "PickedUp", notes: "Picked up from origin depot", occurredAtUtc: iso(createdAt + 3 * HOUR), recordedBy: "demo" });
    }
    if (status === "InTransit" || status === "OutForDelivery" || status === "Delivered") {
      events.push({ id: i * 10 + 3, status: "InTransit", notes: "Departed on linehaul", occurredAtUtc: iso(createdAt + 5 * HOUR), recordedBy: "demo" });
    }
    if (status === "Held") {
      events.push({ id: i * 10 + 4, status: "Held", notes: "Held: consignee site closed", occurredAtUtc: iso(createdAt + 8 * HOUR), recordedBy: "demo" });
    }
    if (status === "OutForDelivery" || status === "Delivered") {
      events.push({ id: i * 10 + 5, status: "OutForDelivery", notes: "On vehicle for delivery", occurredAtUtc: iso(createdAt + lane.typicalHours * HOUR), recordedBy: "demo" });
    }
    let transitHours: number | null = null;
    if (status === "Delivered") {
      const deliveredAt = createdAt + (lane.typicalHours + (late ? 20 : 6)) * HOUR;
      events.push({ id: i * 10 + 6, status: "Delivered", notes: "Delivered; POD captured", occurredAtUtc: iso(deliveredAt), recordedBy: "demo" });
      transitHours = lane.typicalHours + (late ? 20 : 6) - 3;
    }
    events.reverse(); // newest first, matching the API's ORDER BY

    const summary: ConsignmentSummary = {
      id: 1000 + i,
      reference,
      consignorName: CONSIGNORS[i % 8]!,
      consigneeName: CONSIGNEES[i % 5]!,
      originCode: lane.origin,
      destinationCode: lane.destination,
      status,
      deadWeightKg,
      cubicMetres,
      totalExGst,
      requiredDeliveryUtc: iso(requiredAt),
      createdAtUtc: iso(createdAt),
    };

    rows.push({
      summary,
      detail: {
        consignment: {
          ...summary,
          originName: DEPOT_NAMES[lane.origin]!,
          destinationName: DEPOT_NAMES[lane.destination]!,
          chargeableWeightKg: chargeable,
          freightExGst: freight,
          fuelLevyExGst: levy,
          notes: null,
          updatedAtUtc: iso(createdAt),
        },
        items: [{
          id: i,
          description: ITEM_DESCRIPTIONS[i % 4]!,
          quantity: 1,
          weightKgEach: deadWeightKg,
          lengthM: 1,
          widthM: 1,
          heightM: cubicMetres,
        }],
        events,
        allowedNextStatuses:
          status === "Booked" ? ["PickedUp", "Held", "Cancelled"]
          : status === "PickedUp" ? ["InTransit", "Held"]
          : status === "InTransit" ? ["OutForDelivery", "Held"]
          : status === "OutForDelivery" ? ["Delivered", "Held"]
          : status === "Held" ? ["PickedUp", "InTransit", "OutForDelivery", "Cancelled"]
          : [],
      },
      lateBy: status === "Delivered" && late ? 8 : 0,
      transitHours,
    });
  }

  return rows;
}

const ROWS = generate();

export function demoConsignments(status?: string): PagedResponse<ConsignmentSummary> {
  const items = ROWS
    .map((r) => r.summary)
    .filter((s) => !status || s.status === status);
  return { items: items.slice(0, 25), page: 1, pageSize: 25, totalRows: items.length };
}

export function demoConsignment(id: number): ConsignmentDetail | null {
  return ROWS.find((r) => r.summary.id === id)?.detail ?? null;
}

export function demoSummary(): DashboardSummary {
  const delivered = ROWS.filter((r) => r.summary.status === "Delivered");
  return {
    totalLast30Days: ROWS.length,
    delivered: delivered.length,
    deliveredOnTime: delivered.filter((r) => r.lateBy === 0).length,
    currentlyHeld: ROWS.filter((r) => r.summary.status === "Held").length,
    overdueNow: ROWS.filter(
      (r) =>
        r.summary.status !== "Delivered" &&
        r.summary.status !== "Cancelled" &&
        Date.parse(r.summary.requiredDeliveryUtc) < Date.now(),
    ).length,
  };
}

export function demoLanes(): LaneStat[] {
  const byLane = new Map<string, number[]>();
  for (const r of ROWS) {
    if (r.transitHours === null) continue;
    const key = `${r.summary.originCode}-${r.summary.destinationCode}`;
    byLane.set(key, [...(byLane.get(key) ?? []), r.transitHours]);
  }
  return [...byLane.entries()]
    .map(([key, hours]) => {
      const sorted = [...hours].sort((a, b) => a - b);
      const p90 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.9) - 1)]!;
      const [originCode, destinationCode] = key.split("-") as [string, string];
      return {
        originCode,
        destinationCode,
        deliveredCount: hours.length,
        avgTransitHours: Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10,
        p90TransitHours: p90,
      };
    })
    .sort((a, b) => b.deliveredCount - a.deliveredCount);
}
