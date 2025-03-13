"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import Image from "next/image";
import { Upload } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/api/modelSchema/UserSchema";
import { useUpdateUser } from "@/features/user/hooks/use-update-profile";
import { UserDetails } from "@/features/user/api/client";

export function UserSettingsForm({ user }: { user: User }) {
  const { mutateAsync: updateUser } = useUpdateUser();

  const [formData, setFormData] = useState<UserDetails>({
    name: user.name || "",
    image: user.image || "",
    stellarAccount: user.stellarAccount || "",
    currency: user.currency || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateUser({
      name: formData.name || undefined,
      image: formData.image || undefined,
      stellarAccount: formData.stellarAccount || undefined,
      currency: formData.currency || undefined,
    });

    // Show success message
    alert("Profile updated successfully!");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // const file = e.target.files?.[0];
    // if (file) {
    //   // In a real app, you would upload this to a server
    //   // For now, we'll just use a URL for the selected file
    //   const imageUrl = URL.createObjectURL(file);
    //   setFormData(prev => ({ ...prev, image: imageUrl }));
    // }
  };

  return (
    <div className="w-full bg-[#101012] border border-white/20 rounded-[18.24px] overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-white leading-10 tracking-[-0.03em] mb-8 text-center">
          Profile Settings
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5 mb-4">
              <div className="h-full w-full rounded-full overflow-hidden bg-[#101012] flex items-center justify-center">
                {formData.image ? (
                  <Image
                    src={formData.image}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${
                      formData.stellarAccount || "user"
                    }`}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="h-full w-full"
                  />
                )}
              </div>
              <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#1E1E20] flex items-center justify-center cursor-pointer border border-white/10 hover:bg-white/10 transition-colors ">
                <Upload className="h-4 w-4 text-white/70" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="block text-lg font-semibold text-white leading-7 tracking-[-0.03em]">
              Display Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full h-[47.43px] bg-[#0D0D0F] rounded-[11.86px] px-4 
                     text-base font-semibold text-white/40 leading-6 border border-white/20"
              placeholder="Enter your name"
            />
          </div>

          {/* Stellar Account */}
          <div className="space-y-2">
            <label className="block text-lg font-semibold text-white leading-7 tracking-[-0.03em]">
              Stellar Account Address
            </label>
            <input
              type="text"
              value={formData.stellarAccount}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  stellarAccount: e.target.value,
                }))
              }
              className="w-full h-[47.43px] bg-[#0D0D0F] rounded-[11.86px] px-4
                     text-base font-semibold text-white/40 leading-6 border border-white/20"
              placeholder="Enter your Stellar account address"
            />
            <p className="text-sm text-white/40">
              This is the address that will be used for transactions
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <div className="animate-border-light">
              <button
                type="submit"
                className="w-[234.68px] h-[55.64px] bg-[#101012] rounded-[18.24px] 
                       text-xl font-semibold text-white leading-8 
                       tracking-[-0.03em] hover:bg-white/5 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
