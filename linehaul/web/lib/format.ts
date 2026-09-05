import type { ConsignmentStatus } from "./types";

export const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export function formatUtc(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";
}

export const STATUS_LABELS: Record<ConsignmentStatus, string> = {
  Booked: "Booked",
  PickedUp: "Picked up",
  InTransit: "In transit",
  OutForDelivery: "Out for delivery",
  Delivered: "Delivered",
  Held: "Held",
  Cancelled: "Cancelled",
};

/** Maps each status to a CSS class defined in globals.css. */
export function statusClass(status: ConsignmentStatus): string {
  return `status status--${status.toLowerCase()}`;
}
