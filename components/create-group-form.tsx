"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { ChevronDown } from "lucide-react";
import { useCreateGroup } from "@/features/groups/hooks/use-create-group";
import { useRouter } from "next/navigation";

export function CreateGroupForm() {
  const { address } = useWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const createGroupMutation = useCreateGroup();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    members: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      alert("Please connect your wallet first!");
      return;
    }

    createGroupMutation.mutate(
      {
        name: formData.name,
        description: formData.description || undefined,
      },
      {
        onSuccess: (data) => {
          setFormData({
            name: "",
            members: "",
            description: "",
          });
          router.push(`/groups/${data.id}`);
        },
      }
    );
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="w-full bg-[#101012] border border-white/20 rounded-[18.24px] overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-white leading-10 tracking-[-0.03em] mb-8 text-center">
          Create New Group
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-lg font-semibold text-white leading-7 tracking-[-0.03em]">
              Group Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full h-[47.43px] bg-[#0D0D0F] rounded-[11.86px] px-4 
                     text-base font-semibold text-white/40 leading-6 border border-white/20"
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-lg font-semibold text-white leading-7 tracking-[-0.03em]">
              Members
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.members}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, members: e.target.value }))
                }
                className="w-full h-[47.43px] bg-[#0D0D0F] rounded-[11.86px] px-4 pr-10
                       text-base font-semibold text-white/40 leading-6 border border-white/20"
                placeholder="Choose friends"
                required
                onClick={toggleDropdown}
              />
              <button
                type="button"
                onClick={toggleDropdown}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-full transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-white/40" />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-[#0D0D0F] border border-white/5 rounded-[11.86px] py-2">
                  <div className="px-4 py-2 text-[15.51px] font-semibold text-white/40">
                    No friends yet
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-lg font-semibold text-white leading-7 tracking-[-0.03em]">
              Description (Optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full h-[47.43px] bg-[#0D0D0F] rounded-[11.86px] px-4
                     text-base font-semibold text-white/40 leading-6 border border-white/20"
              placeholder="Add a description"
            />
          </div>

          <div className="flex justify-center pt-4">
            <div className="animate-border-light">
              <button
                type="submit"
                className="w-[234.68px] h-[55.64px] bg-[#101012] rounded-[18.24px] 
                       text-xl font-semibold text-white leading-8 
                       tracking-[-0.03em] hover:bg-white/5 transition-colors"
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
