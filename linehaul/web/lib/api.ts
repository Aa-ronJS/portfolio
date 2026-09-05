// One place decides where data comes from. With LINEHAUL_API_URL set, every
// read hits the .NET API; without it the app serves the deterministic demo
// fixtures and the layout shows a "demo data" badge, so nobody mistakes a
// fixture for an operation.

import { demoConsignment, demoConsignments, demoLanes, demoSummary } from "./demo-data";
import type {
  ConsignmentDetail,
  ConsignmentSummary,
  DashboardSummary,
  LaneStat,
  PagedResponse,
} from "./types";

const API_URL = process.env.LINEHAUL_API_URL?.replace(/\/$/, "");

export const isDemoMode = !API_URL;

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
    // Operational data: always current, never cached at build time.
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GET ${path} returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchConsignments(status?: string): Promise<PagedResponse<ConsignmentSummary>> {
  if (isDemoMode) return demoConsignments(status);
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return get(`/api/consignments${query}`);
}

export async function fetchConsignment(id: number): Promise<ConsignmentDetail | null> {
  if (isDemoMode) return demoConsignment(id);
  try {
    return await get<ConsignmentDetail>(`/api/consignments/${id}`);
  } catch {
    return null;
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (isDemoMode) return demoSummary();
  return get("/api/dashboard/summary");
}

export async function fetchLaneStats(): Promise<LaneStat[]> {
  if (isDemoMode) return demoLanes();
  return get("/api/dashboard/lanes");
}
