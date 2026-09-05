import type { Metadata } from "next";
import Link from "next/link";
import { isDemoMode } from "@/lib/api";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linehaul operations",
  description:
    "Consignment tracking and freight rating reference build: .NET 9 minimal APIs, Dapper, raw T-SQL, Next.js, Azure.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <div className="shell">
          <header className="masthead">
            <Link href="/" className="masthead__brand">
              LINE<b>HAUL</b>
            </Link>
            <span className="masthead__note">operations</span>
            {isDemoMode && (
              <span className="badge" title="No API configured; showing deterministic demo fixtures.">
                demo data
              </span>
            )}
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
