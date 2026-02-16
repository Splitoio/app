"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { IncomeStream } from "@/features/business/api/client";

export type OrganizationOrgContextValue = {
  organizationId: string;
  group: {
    id: string;
    name: string;
    image: string | null;
    groupUsers?: unknown[];
    createdBy?: { id: string };
    userId?: string;
  } | null;
  isAdmin: boolean;
  openAddInvoice: () => void;
  openDecline: (invoiceId: string) => void;
  setInvoiceToEdit: (inv: { id: string; amount: number; currency: string; dueDate: Date; description: string | null; imageUrl: string | null } | null) => void;
  setExpandedImage: (img: { url: string; description: string } | null) => void;
  openAddMember: () => void;
  openCreateContract: () => void;
  openSettings: () => void;
  openStreamModal: () => void;
  openEditStream: (stream: IncomeStream) => void;
};

const OrganizationOrgContext = createContext<OrganizationOrgContextValue | null>(null);

export function OrganizationOrgProvider({
  value,
  children,
}: {
  value: OrganizationOrgContextValue;
  children: ReactNode;
}) {
  return (
    <OrganizationOrgContext.Provider value={value}>
      {children}
    </OrganizationOrgContext.Provider>
  );
}

export function useOrganizationOrg(): OrganizationOrgContextValue {
  const ctx = useContext(OrganizationOrgContext);
  if (!ctx) throw new Error("useOrganizationOrg must be used within OrganizationOrgProvider");
  return ctx;
}
