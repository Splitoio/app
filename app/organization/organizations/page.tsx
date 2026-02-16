"use client";

import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { useDeleteGroup } from "@/features/groups/hooks/use-create-group";
import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function OrganizationOrganizationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: organizations = [], isLoading } = useGetAllOrganizations();
  const deleteGroupMutation = useDeleteGroup();

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="w-full -mt-2"
    >
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4">
        <h1 className="text-mobile-base sm:text-xl font-medium text-white">
          My Organizations
        </h1>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-1 sm:gap-2 rounded-full bg-white text-black h-10 sm:h-12 px-4 sm:px-6 text-mobile-sm sm:text-base font-medium hover:bg-white/90 transition-all"
          >
            <Image
              alt="Add Organization"
              src="/plus-sign-circle.svg"
              width={20}
              height={20}
              className="h-4 w-4 sm:h-5 sm:w-5 invert"
            />
            <span>Add Organization</span>
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5 hover:from-purple-500/30 hover:to-blue-500/30 transition-all cursor-pointer"
          >
            <div className="h-full w-full rounded-full overflow-hidden bg-[#0f0f10]">
              {user?.image ? (
                <Image src={user.image} alt="Profile" width={56} height={56} className="h-full w-full object-cover" />
              ) : (
                <Image
                  src={`https://api.dicebear.com/9.x/identicon/svg?seed=${user?.id || user?.email || "user"}`}
                  alt="Profile"
                  width={56}
                  height={56}
                  className="h-full w-full"
                />
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        ) : organizations.length > 0 ? (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-white/[0.02] transition-colors gap-2"
              >
                <Link href={`/organization/${org.id}/invoices`} className="flex flex-1 min-w-0 items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-xl bg-white/[0.03] shrink-0">
                    {org.image ? (
                      <Image src={org.image} alt={org.name} width={56} height={56} className="h-full w-full object-cover" />
                    ) : (
                      <Image
                        src={`https://api.dicebear.com/9.x/identicon/svg?seed=${org.id}`}
                        alt={org.name}
                        width={56}
                        height={56}
                        className="h-full w-full"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-mobile-base sm:text-xl text-white font-medium truncate">{org.name}</p>
                    <p className="text-mobile-sm sm:text-base text-white/60">
                      {(org.groupUsers || []).length} member{(org.groupUsers || []).length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setOrgToDelete({ id: org.id, name: org.name });
                  }}
                  className="shrink-0 p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label={`Delete organization ${org.name}`}
                >
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-white/70 text-mobile-base sm:text-base">
            No organizations yet. Create one to get started!
          </div>
        )}
      </div>

      <CreateOrganizationForm isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !isDeleting && setOrgToDelete(null)}>
          <div className="rounded-2xl bg-[#101012] border border-white/10 p-4 sm:p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-mobile-base sm:text-base text-white/80">
              Are you sure you want to delete &quot;{orgToDelete.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !isDeleting && setOrgToDelete(null)}
                className="rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-mobile-sm sm:text-sm text-white/70 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleting(true);
                  deleteGroupMutation.mutate(orgToDelete.id, {
                    onSuccess: () => {
                      toast.success("Organization deleted");
                      setOrgToDelete(null);
                      setIsDeleting(false);
                    },
                    onError: (err: { message?: string }) => {
                      toast.error(err?.message || "Failed to delete organization");
                      setIsDeleting(false);
                    },
                  });
                }}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 sm:px-4 py-1.5 sm:py-2 text-mobile-sm sm:text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
