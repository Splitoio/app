"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/api-helpers/client";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
  expenseThisMonth: number;
  totalPaid: number;
  outflowByPeriod: { label: string; amount: number }[];
}

export default function OrganizationAnalyticsPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    apiClient
      .get(`/invoices/organization/${organizationId}/analytics`)
      .then((res) => setData(res as unknown as AnalyticsData))
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setIsLoading(false));
  }, [organizationId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-white/60 text-sm">{error ?? "No data available."}</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-white">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
          <p className="text-sm text-white/50 mb-1">Expenses this month</p>
          <p className="text-2xl font-semibold text-white">
            ${data.expenseThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
          <p className="text-sm text-white/50 mb-1">Total paid</p>
          <p className="text-2xl font-semibold text-white">
            ${data.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {data.outflowByPeriod.length > 0 && (
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
          <p className="text-sm text-white/50 mb-4">Outflow by period</p>
          <div className="space-y-3">
            {data.outflowByPeriod.map((point) => (
              <div key={point.label} className="flex items-center justify-between">
                <span className="text-sm text-white/70">{point.label}</span>
                <span className="text-sm font-medium text-white">
                  ${point.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
