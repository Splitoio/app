"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Zap } from "lucide-react";
import {
  useGetStreamsByOrganization,
  useDeleteStream,
} from "@/features/business/hooks/use-streams";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, T, A, G } from "@/lib/splito-design";
import { motion, AnimatePresence } from "framer-motion";

type Stream = { id: string; name: string; expectedAmount?: number | null; currency: string; description?: string | null };

export default function OrganizationStreamsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.organizationId as string;
  const { isAdmin, openStreamModal, openEditStream } = useOrganizationOrg();
  const { data: streams = [], isLoading: isStreamsLoading } = useGetStreamsByOrganization(organizationId, { enabled: !!isAdmin });
  const deleteStreamMutation = useDeleteStream();
  const [streamToDelete, setStreamToDelete] = useState<Stream | null>(null);

  useEffect(() => {
    if (isAdmin === false && organizationId) {
      router.replace(`/organization/${organizationId}/invoices`);
    }
  }, [isAdmin, organizationId, router]);

  if (!isAdmin) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  const handleDeleteConfirm = () => {
    if (!streamToDelete) return;
    deleteStreamMutation.mutate(
      { organizationId, streamId: streamToDelete.id },
      {
        onSuccess: () => { toast.success("Stream removed"); setStreamToDelete(null); },
        onError: () => { toast.error("Failed to remove stream"); setStreamToDelete(null); },
      }
    );
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white">Income streams</h1>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
            {isStreamsLoading ? "Loading…" : `${(streams as Stream[]).length} stream${(streams as Stream[]).length !== 1 ? "s" : ""} configured`}
          </p>
        </div>
        <button onClick={openStreamModal}
          className="flex items-center gap-2 rounded-xl h-10 px-4 text-[13px] font-extrabold transition-all hover:opacity-90"
          style={{ background: A, color: "#0a0a0a" }}>
          <Plus className="h-4 w-4" /> Add stream
        </button>
      </div>

      {/* ── Loading ── */}
      {isStreamsLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      )}

      {/* ── Empty ── */}
      {!isStreamsLoading && (streams as Stream[]).length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-[48px] mb-4">💰</div>
          <h2 className="text-[16px] font-bold text-white mb-2">No income streams yet</h2>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>
            Add income streams to track expected money coming into the organization.
          </p>
          <button onClick={openStreamModal}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90"
            style={{ background: A, color: "#0a0a0a" }}>
            <Plus className="h-4 w-4" /> Add first stream
          </button>
        </div>
      )}

      {/* ── Stream list ── */}
      {!isStreamsLoading && (streams as Stream[]).length > 0 && (
        <div className="w-full mb-5 sm:mb-6">
          <SectionLabel className="mb-3">Income streams</SectionLabel>
          <Card className="w-full p-0 overflow-hidden">
          {(streams as Stream[]).map((stream) => (
            <div key={stream.id}
              className="w-full flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors">

              {/* Icon */}
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${G}18`, border: `1px solid ${G}30` }}>
                <Zap className="h-4 w-4" style={{ color: G }} />
              </div>

              {/* Info - fills space, amount + actions on right */}
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold truncate" style={{ color: T.bright }}>{stream.name}</p>
                  {stream.description && (
                    <p className="text-[12px] mt-0.5 truncate" style={{ color: T.muted }}>{stream.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                  {stream.expectedAmount != null && (
                    <p className="text-[15px] sm:text-[16px] font-extrabold font-mono" style={{ color: G }}>
                      {formatCurrency(stream.expectedAmount, stream.currency)}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openEditStream(stream as unknown as Parameters<typeof openEditStream>[0])}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: T.muted }}>
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button type="button" onClick={() => setStreamToDelete(stream)}
                    disabled={deleteStreamMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all hover:bg-red-500/10 disabled:opacity-50"
                    style={{ color: "#F87171" }}>
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </Card>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {streamToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => !deleteStreamMutation.isPending && setStreamToDelete(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold" style={{ color: T.bright }}>Remove stream?</h3>
                  <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>Cannot be undone</p>
                </div>
              </div>
              <p className="text-[13px] mb-5" style={{ color: T.body }}>
                <span className="font-semibold" style={{ color: T.bright }}>&ldquo;{streamToDelete.name}&rdquo;</span>
                {streamToDelete.expectedAmount != null && ` (${formatCurrency(streamToDelete.expectedAmount, streamToDelete.currency)})`}
                {" "}will be permanently removed from your income streams.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStreamToDelete(null)} disabled={deleteStreamMutation.isPending}
                  className="flex-1 h-11 rounded-xl border font-semibold text-[13px] transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}>
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteConfirm} disabled={deleteStreamMutation.isPending}
                  className="flex-1 h-11 rounded-xl font-bold text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "rgba(248,113,113,0.15)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}>
                  {deleteStreamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
