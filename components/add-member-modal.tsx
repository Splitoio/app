"use client";

import {
  useAddMembersToGroup,
  useGetGroupById,
} from "@/features/groups/hooks/use-create-group";
import { X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export function AddMemberModal({
  isOpen,
  onClose,
  groupId,
}: AddMemberModalProps) {
  const [email, setEmail] = useState("");
  const { mutate: addMembersToGroup, isPending } = useAddMembersToGroup();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleAddMember = () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    addMembersToGroup(
      {
        groupId: groupId,
        memberIdentifier: email.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Member added successfully");
          setEmail("");

          // refetch the specific group data
          queryClient.invalidateQueries({
            queryKey: [QueryKeys.GROUPS, groupId],
          });

          // refetch the general groups list
          queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });

          // Close the modal after successful addition
          onClose();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to add member");
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isPending && email.trim()) {
      handleAddMember();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen">
      <div
        className="fixed inset-0 bg-black/70 brightness-50"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px]">
        <div className="animate-border-light relative z-10">
          <div className="relative rounded-[14.77px] bg-black p-4 lg:p-8">
            <div className="flex items-center justify-between mb-6 lg:mb-8">
              <h2 className="text-2xl lg:text-[29.28px] font-base text-white tracking-[-0.03em] font-instrument-sans">
                Add Member
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 lg:p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </button>
            </div>

            <div className="space-y-4 lg:space-y-6">
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter name or email address"
                  className="w-full h-12 lg:h-14 bg-[#1F1F23] rounded-2xl pl-4 pr-4 
                  text-base lg:text-lg font-normal text-white 
                  border border-white/10 
                  transition-all duration-300
                  placeholder:text-white/30
                  focus:outline-none focus:border-white/20 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  disabled={isPending}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAddMember}
                  disabled={isPending || !email.trim()}
                  className="h-11 lg:h-12 px-6 lg:px-8
                  rounded-2xl bg-white/10 
                  text-sm lg:text-base font-medium text-white 
                  border border-white/10
                  transition-all duration-300
                  hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]
                  disabled:opacity-70 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Member"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
