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
      onError: (error: any) => {
        setIsDeleting(false);

        if (
          error?.message?.includes("non-zero balance") ||
          error?.data?.error?.includes("non-zero balance")
        ) {
          setDeleteError(
            "You have unsettled balances in this group. Please clear all dues before deleting."
          );
        } else {
          setDeleteError(error.message || "Failed to delete group");
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

  return (
    <>
      <motion.div
        className="py-12"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="space-y-4">
          {groupsData?.map((group) => {
            console.log(`Group ${group.name} image URL:`, group.image);
            return (
              <motion.div
                key={group.id}
                variants={slideUp}
                className="relative"
              >
                <Link
                  href={`/groups/${group.id}`}
                  className="flex items-center justify-between rounded-xl bg-zinc-950/50 p-3 transition-all duration-300 hover:bg-[#1a1a1c] relative group"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    e.currentTarget.style.background = `radial-gradient(1000px circle at ${x}px ${y}px, rgba(255,255,255,0.05), transparent 40%)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#09090b";
                    e.currentTarget.style.transition = "background 0.3s ease";
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        src={group.image || "/group_icon_placeholder.png"}
                        alt={group.name}
                        className="h-full w-full object-cover"
                        width={80}
                        height={80}
                        onError={(e) => {
                          console.error(
                            `Error loading image for group ${group.name}:`,
                            group.image
                          );
                          // @ts-ignore - fallback to placeholder on error
                          e.target.src = "/group_icon_placeholder.png";
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-lg font-normal text-white/90">
                        {group.name}
                      </p>
                      <p className="text-[13px] text-white/50">
                        Created by {group.createdBy.name} •{" "}
                        {dayjs(group.createdAt).format("DD/MM/YYYY")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative" data-group-id={group.id}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingId(
                            editingId === group.id ? null : group.id
                          );
                        }}
                        className="group-menu p-2 hover:bg-white/5 rounded-full"
                      >
                        <MoreVertical className="h-5 w-5 text-white/70" />
                      </button>

                      {editingId === group.id && (
                        <div
                          className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#1F1F23] p-1 shadow-lg"
                          style={{ zIndex: 9999 }}
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/groups/${group.id}/edit`);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/5"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit Group
                          </button>
                          <button
                            onClick={(e) =>
                              handleDeleteGroup(e, group.id, group.name)
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#FF4444] hover:bg-white/5"
                            disabled={
                              deleteGroupMutation.isPending &&
                              deleteGroupMutation.variables === group.id
                            }
                          >
                            {deleteGroupMutation.isPending &&
                            deleteGroupMutation.variables === group.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete Group
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F1F23] rounded-xl max-w-md w-full border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">
                {isDeleting
                  ? "Deleting Group..."
                  : deleteSuccess
                  ? "Success"
                  : deleteError
                  ? "Cannot Delete Group"
                  : "Delete Group"}
              </h3>
              <button
                onClick={() => {
                  if (!isDeleting) {
                    setShowDeleteModal(false);
                    setGroupToDelete(null);
                    setDeleteError(null);
                    setDeleteSuccess(false);
                  }
                }}
                disabled={isDeleting}
                className="p-1 rounded-full hover:bg-white/5 disabled:opacity-50"
              >
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>

            <div className="p-5">
              {isDeleting ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                  <p className="text-white/80">
                    Deleting {groupToDelete?.name}...
                  </p>
                </div>
              ) : deleteSuccess ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <CheckCircle className="h-10 w-10 text-green-500 mb-4" />
                  <p className="text-white/80">
                    Group "{groupToDelete?.name}" deleted successfully!
                  </p>
                </div>
              ) : deleteError ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium mb-1">
                        Cannot delete this group
                      </p>
                      <p className="text-white/70 text-sm">{deleteError}</p>
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setGroupToDelete(null);
                        setDeleteError(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>

                    {deleteError.includes("balance") && (
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          groupToDelete &&
                            router.push(`/groups/${groupToDelete.id}`);
                        }}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        View Balances
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-white/80 mb-6">
                    Are you sure you want to delete "{groupToDelete?.name}"?
                    This action cannot be undone.
                  </p>

                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setGroupToDelete(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
