"use client";

import { useGroups, type Group } from "@/stores/groups";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  const { groups, deleteGroup, connectedAddress } = useGroups();
  const {
    data: groupsData,
    isLoading: isGroupsLoading,
    error,
  } = useQuery({
    queryKey: [QueryKeys.GROUPS],
    queryFn: getAllGroups,
  });
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

  if (isGroupsLoading || !groupsData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/50">Loading groups...</div>
      </div>
    );
  }

  return (
    <motion.div
      className="py-12"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <div className="space-y-4">
        {groupsData?.map((group) => (
          <motion.div key={group.id} variants={slideUp} className="relative">
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
                      setEditingId(editingId === group.id ? null : group.id);
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteGroup(group.id);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#FF4444] hover:bg-white/5"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Group
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
