"use client";

import { type Group } from "@/stores/groups";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle,
  Plus,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { staggerContainer, slideUp } from "@/utils/animations";
import { useRouter } from "next/navigation";
import { getAllGroups } from "@/features/groups/api/client";
import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import dayjs from "dayjs";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { ApiError } from "@/types/api-error";
import { useDeleteGroup } from "@/features/groups/hooks/use-create-group";

type APIGroup = {
  id: string;
  name: string;
  userId: string;
  description: string | null;
  image: string | null;
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
};

export function GroupsList() {
  const {
    data: groupsData,
    isLoading: isGroupsLoading,
    error,
  } = useQuery({
    queryKey: [QueryKeys.GROUPS],
    queryFn: getAllGroups,
  });
  const deleteGroupMutation = useDeleteGroup();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      const apiError = error as ApiError;
      const statusCode =
        apiError.response?.status || apiError.status || apiError.code;

      if (statusCode === 401) {
        Cookies.remove("sessionToken");
        router.push("/login");
        toast.error("Session expired. Please log in again.");
      } else if (error) {
        toast.error("An unexpected error occurred.");
      }
    }
  }, [error, router]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".group-menu")) {
        setEditingId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleDeleteGroup = (
    e: React.MouseEvent,
    groupId: string,
    groupName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Show delete modal
    setGroupToDelete({ id: groupId, name: groupName });
    setShowDeleteModal(true);
    setIsDeleting(false);
    setDeleteError(null);
    setDeleteSuccess(false);
  };

  const confirmDelete = () => {
    if (!groupToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    deleteGroupMutation.mutate(groupToDelete.id, {
      onSuccess: () => {
        setIsDeleting(false);
        setDeleteSuccess(true);
        setEditingId(null);
        // We'll close the modal after a short delay
        setTimeout(() => {
          setShowDeleteModal(false);
          setGroupToDelete(null);
          setDeleteSuccess(false);
        }, 1500);
      },
      onError: (error: unknown) => {
        setIsDeleting(false);

        // Cast to a modified error type to handle the API error format
        type ExtendedApiError = ApiError & {
          data?: {
            error?: string;
          };
        };

        const apiError = error as ExtendedApiError;

        if (
          apiError?.message?.includes("non-zero balance") ||
          apiError?.data?.error?.includes("non-zero balance")
        ) {
          setDeleteError(
            "You have unsettled balances in this group. Please clear all dues before deleting."
          );
        } else {
          setDeleteError(apiError?.message || "Failed to delete group");
        }
      },
    });
  };

  if (isGroupsLoading || !groupsData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/50">Loading groups...</div>
      </div>
    );
  }

  if (groupsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl bg-[#101012] p-12 min-h-[calc(100vh-180px)]">
        <div className="text-xl text-white/70 mb-4">No groups created yet</div>
        <p className="text-white/50 text-center max-w-md mb-8">
          Create a group to start tracking expenses and settle debts with your
          friends
        </p>
        <Link
          href="/create"
          className="flex items-center justify-center gap-2 rounded-full bg-white text-black h-12 px-6 font-medium hover:bg-white/90 transition-all"
        >
          <Plus className="h-5 w-5" strokeWidth={1.5} />
          <span>Create New Group</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#101012] rounded-3xl min-h-[calc(100vh-180px)] p-8">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {groupsData.map((group) => (
          <motion.div
            key={group.id}
            variants={slideUp}
            className="relative rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/[0.03]">
                  <Image
                    src={group.image || "/group_icon_placeholder.png"}
                    alt={group.name}
                    className="h-full w-full object-cover"
                    width={56}
                    height={56}
                    onError={(e) => {
                      console.error(
                        `Error loading image for group ${group.name}:`,
                        group.image
                      );
                      const target = e.target as HTMLImageElement;
                      target.src = "/group_icon_placeholder.png";
                    }}
                  />
                </div>
                <div>
                  <p className="text-xl font-medium text-white">{group.name}</p>
                  <p className="text-base text-white/60">
                    {/* Show balance status - this would need to be calculated from actual balance data */}
                    {Math.random() > 0.5 ? (
                      <span>
                        Owes you <span className="text-[#53e45d]">$60</span>
                      </span>
                    ) : (
                      <span>
                        You owe <span className="text-[#FF4444]">$60</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <Link
                href={`/groups/${group.id}`}
                className="text-white font-medium flex items-center gap-2 rounded-full border border-white/80 px-4 py-2 hover:bg-white/[0.03] transition-colors"
              >
                <span>View Group</span>
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-[400px] rounded-xl bg-[#101012] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">Delete Group</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setGroupToDelete(null);
                }}
                className="rounded-full p-1 hover:bg-white/10"
              >
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>

            {deleteSuccess ? (
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle className="mb-4 h-10 w-10 text-green-500" />
                <p className="text-center text-white">
                  Group "{groupToDelete?.name}" has been deleted.
                </p>
              </div>
            ) : (
              <>
                {deleteError ? (
                  <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-red-400">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                      <p className="text-sm">{deleteError}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mb-4 text-white/70">
                    Are you sure you want to delete "{groupToDelete?.name}"?
                    This action cannot be undone.
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setGroupToDelete(null);
                    }}
                    className="rounded-lg px-4 py-2 text-white/70 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>Delete</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
