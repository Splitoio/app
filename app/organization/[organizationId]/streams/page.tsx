"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  useGetStreamsByOrganization,
  useDeleteStream,
} from "@/features/business/hooks/use-streams";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, Btn, T, A, Icons } from "@/lib/splito-design";

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
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionLabel>Income streams</SectionLabel>
        <button
          onClick={openStreamModal}
          className="flex items-center gap-2 rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-sm font-extrabold transition-all hover:opacity-90"
          style={{ background: A, color: "#0a0a0a" }}
        >
          {Icons.plus({ size: 16 })} Add stream
        </button>
      </div>
      {isStreamsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : streams.length > 0 ? (
        <Card className="p-0 overflow-hidden">
          {streams.map((stream, idx) => (
            <div
              key={stream.id}
              className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] last:border-b-0"
            >
              <div className="min-w-0">
                <p className="font-semibold" style={{ color: T.bright }}>{stream.name}</p>
                <p className="text-sm mt-1" style={{ color: T.muted }}>
                  {stream.expectedAmount != null
                    ? formatCurrencyLocal(stream.expectedAmount, stream.currency)
                    : stream.currency}
                  {stream.description && ` · ${stream.description}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Btn variant="ghost" onClick={() => openEditStream(stream)} style={{ padding: "6px 12px", fontSize: 12 }}>
                  Edit
                </Btn>
                <Btn
                  variant="danger"
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
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  {Icons.trash({ size: 12 })} Delete
                </Btn>
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-[15px] font-semibold mb-4" style={{ color: T.muted }}>
            No income streams yet. Add one to track money coming into the organization.
          </p>
          <button
            onClick={openStreamModal}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ background: A, color: "#0a0a0a" }}
          >
            {Icons.plus({ size: 16 })} Add stream
          </button>
        </Card>
      )}
    </div>
  );
}
