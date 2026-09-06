// Mirrors the API contracts in Linehaul.Api/Contracts/Contracts.cs.
// If the API changes shape, change it there first; this file follows.

export type ConsignmentStatus =
  | "Booked"
  | "PickedUp"
  | "InTransit"
  | "OutForDelivery"
  | "Delivered"
  | "Held"
  | "Cancelled";

export interface ConsignmentSummary {
  id: number;
  reference: string;
  consignorName: string;
  consigneeName: string;
  originCode: string;
  destinationCode: string;
  status: ConsignmentStatus;
  deadWeightKg: number;
  cubicMetres: number;
  totalExGst: number;
  requiredDeliveryUtc: string;
  createdAtUtc: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalRows: number;
}

export interface ConsignmentDetail {
  consignment: {
    id: number;
    reference: string;
    consignorName: string;
    consigneeName: string;
    originCode: string;
    originName: string;
    destinationCode: string;
    destinationName: string;
    status: ConsignmentStatus;
    deadWeightKg: number;
    cubicMetres: number;
    chargeableWeightKg: number;
    freightExGst: number;
    fuelLevyExGst: number;
    totalExGst: number;
    requiredDeliveryUtc: string;
    notes: string | null;
    createdAtUtc: string;
    updatedAtUtc: string;
  };
  items: {
    id: number;
    description: string;
    quantity: number;
    weightKgEach: number;
    lengthM: number;
    widthM: number;
    heightM: number;
  }[];
  events: {
    id: number;
    status: ConsignmentStatus;
    notes: string | null;
    occurredAtUtc: string;
    recordedBy: string;
  }[];
  allowedNextStatuses: ConsignmentStatus[];
}

export interface DashboardSummary {
  totalLast30Days: number;
  delivered: number;
  deliveredOnTime: number;
  currentlyHeld: number;
  overdueNow: number;
}

export interface LaneStat {
  originCode: string;
  destinationCode: string;
  deliveredCount: number;
  avgTransitHours: number;
  p90TransitHours: number;
}
