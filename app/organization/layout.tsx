import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Splito for Business",
  description: "Manage invoices, contracts, and your team with Splito.",
};

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
