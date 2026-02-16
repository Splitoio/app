"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import {
  useGetStreamsByOrganization,
  useDeleteStream,
} from "@/features/business/hooks/use-streams";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";

export default function OrganizationStreamsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.organizationId as string;
  const { isAdmin, openStreamModal, openEditStream } = useOrganizationOrg();
  const { data: streams = [], isLoading: isStreamsLoading } = useGetStreamsByOrganization(organizationId, { enabled: !!isAdmin });
  const deleteStreamMutation = useDeleteStream();

  useEffect(() => {
    if (isAdmin === false && organizationId) {
      router.replace(`/organization/${organizationId}/invoices`);
    }
  }, [isAdmin, organizationId, router]);

  const formatCurrencyLocal = (amount: number, currency: string) => formatCurrency(amount, currency);

  if (!isAdmin) {
    return (
      <div className="flex justify-center py-8 sm:py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-mobile-lg sm:text-xl font-medium text-white">Income streams</h3>
        <button
          onClick={openStreamModal}
          className="flex items-center gap-2 rounded-full bg-white text-black h-9 sm:h-10 px-3 sm:px-4 text-sm font-medium hover:bg-white/90"
        >
          <Plus className="h-4 w-4" />
          <span>Add stream</span>
        </button>
      </div>
      {isStreamsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : streams.length > 0 ? (
        <div className="space-y-2">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/[0.02]"
            >
              <div className="min-w-0">
                <p className="text-white font-medium">{stream.name}</p>
                <p className="text-white/60 text-sm">
                  {stream.expectedAmount != null
                    ? formatCurrencyLocal(stream.expectedAmount, stream.currency)
                    : stream.currency}
                  {stream.description && ` · ${stream.description}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditStream(stream)}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-white/80 hover:text-white text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteStreamMutation.mutate(
                      { organizationId, streamId: stream.id },
                      {
                        onSuccess: () => toast.success("Stream removed"),
                        onError: () => toast.error("Failed to remove stream"),
                      }
                    )
                  }
                  disabled={deleteStreamMutation.isPending}
                  className="rounded-full border border-red-500/50 px-3 py-1.5 text-red-400 hover:bg-red-500/10 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12 text-white/60">
          No income streams yet. Add one to track money coming into the organization.
        </div>
      )}
    </div>
  );
}
