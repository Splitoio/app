"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { ChevronDown } from "lucide-react";
import { useCreateGroup } from "@/features/groups/hooks/use-create-group";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@/features/files/hooks/use-balances";
import Image from "next/image";
import { toast } from "sonner";

export function CreateGroupForm() {
  const { address } = useWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const createGroupMutation = useCreateGroup();
  const uploadFileMutation = useUploadFile();
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    members: "",
    description: "",
    imageUrl: "",
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
        imageUrl: formData.imageUrl || undefined,
      },
      {
        onSuccess: (data) => {
          setFormData({
            name: "",
            members: "",
            description: "",
            imageUrl: "",
          });
          setImagePreview(null);
          router.push(`/groups/${data.id}`);
        },
      }
    );
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Show loading state
      toast.loading("Uploading image...");

      // Upload the file to Google Cloud Storage
      const response = await uploadFileMutation.mutateAsync(file);

      if (response.success) {
        // Update form data with the image URL
        setFormData((prev) => ({
          ...prev,
          imageUrl: response.data.downloadUrl,
        }));
        setImagePreview(response.data.downloadUrl);
        toast.dismiss();
        toast.success("Image uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.dismiss();
      toast.error("Failed to upload image. Please try again.");
    }
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
          {/* Group Image */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5 mb-4">
              <div className="h-full w-full rounded-full overflow-hidden bg-[#101012] flex items-center justify-center">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Group"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/50">
                    <span className="text-xs text-center">Group Image</span>
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#1E1E20] flex items-center justify-center cursor-pointer border border-white/10 hover:bg-white/10 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-white/70"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={createGroupMutation.isPending}
                />
              </label>
            </div>
          </div>

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
