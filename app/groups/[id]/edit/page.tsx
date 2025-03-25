"use client";

import { type Group, type Split, type Debt } from "@/stores/groups";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { splitter } from "@/utils/splitter";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetGroupById,
  useUpdateGroup,
} from "@/features/groups/hooks/use-create-group";
import { useUploadFile } from "@/features/files/hooks/use-balances";
import { toast } from "sonner";

export default function EditGroupPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: group, isLoading } = useGetGroupById(params.id);
  const updateGroupMutation = useUpdateGroup();
  const { address } = useWallet();
  const uploadFileMutation = useUploadFile();

  const [splits, setSplits] = useState<Split[]>([]);
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    members: "",
    splitType: "equal" as "equal" | "percentage" | "custom",
    currency: "USD" as "USD" | "XLM",
    paidBy: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (group) {
      // Assuming group.splits is no longer available in the API response
      // setSplits(group.splits);
      setFormData({
        name: group.name,
        description: group.description || "",
        amount: "0", // Amount is not stored in the group anymore
        members: "", // Members are now in a different format
        splitType: "equal", // Not sure if this is stored in the API
        currency: (group.defaultCurrency === "XLM" ? "XLM" : "USD") as
          | "USD"
          | "XLM",
        paidBy: "", // Not sure if this is stored in the API
        imageUrl: group.image || "",
      });
      setImagePreview(group.image || null);
    }
  }, [group]);

  useEffect(() => {
    if (!formData.members || !formData.amount || !formData.paidBy || !address)
      return;

    const memberAddresses = formData.members.split(",").map((m) => m.trim());
    const allMembers = Array.from(
      new Set([address, ...memberAddresses])
    ).filter(Boolean);

    if (formData.splitType === "custom") {
      const { splits: newSplits } = splitter(
        formData.splitType as "equal" | "percentage",
        Number(formData.amount),
        allMembers,
        formData.paidBy
      );
      setSplits(newSplits);
    }
  }, [
    formData.members,
    formData.amount,
    formData.splitType,
    formData.paidBy,
    address,
  ]);

  const calculateDebts = (splits: Split[], paidBy: string): Debt[] => {
    const debts: Debt[] = [];

    splits.forEach((split) => {
      if (split.address !== paidBy && split.amount > 0) {
        debts.push({
          from: split.address,
          to: paidBy,
          amount: split.amount,
        });
      }
    });

    return debts;
  };

  const updateCustomSplit = (address: string, amount: number) => {
    setSplits((current) =>
      current.map((split) =>
        split.address === address ? { ...split, amount } : split
      )
    );
  };

  const validateSplits = () => {
    const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
    return Math.abs(totalSplit - Number(formData.amount)) < 0.01;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!group) return;

    const payload: {
      name: string;
      description: string;
      currency: string;
      imageUrl?: string;
    } = {
      name: formData.name,
      description: formData.description,
      currency: formData.currency,
    };

    // Only include imageUrl if it's not empty and not the placeholder
    if (
      formData.imageUrl &&
      formData.imageUrl !== "/group_icon_placeholder.png"
    ) {
      payload.imageUrl = formData.imageUrl;
    }

    console.log("Sending update payload:", payload);
    console.log("Current image preview:", imagePreview);

    updateGroupMutation.mutate(
      {
        groupId: params.id,
        payload,
      },
      {
        onSuccess: (data) => {
          router.push(`/groups/${params.id}`);
        },
        onError: (error) => {
          toast.error("Failed to update group");
        },
      }
    );
  };

  const handleSplitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSplitType = e.target.value as "equal" | "percentage" | "custom";
    setFormData((prev) => ({
      ...prev,
      splitType: newSplitType,
    }));
  };

  const updatePercentage = (address: string, percentage: number) => {
    setPercentages((current) => ({
      ...current,
      [address]: percentage,
    }));

    setSplits((current) =>
      current.map((split) =>
        split.address === address
          ? {
              ...split,
              amount: (Number(formData.amount) * percentage) / 100,
              percentage: percentage,
            }
          : split
      )
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

  if (!group) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Edit Group</h1>
      <Card className="bg-zinc-950 border-white/10">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="form-group">
                  <label className="form-label">Group Image</label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="h-24 w-24 overflow-hidden rounded-2xl bg-zinc-900">
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-white/50">
                          No image
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="group-image"
                    />
                    <label
                      htmlFor="group-image"
                      className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
                    >
                      Change Image
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-white"
                  >
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="mt-2 block w-full rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-white"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    className="mt-2 block w-full rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="amount"
                      className="block text-sm font-medium text-white"
                    >
                      Amount
                    </label>
                    <input
                      type="number"
                      id="amount"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      className="mt-2 block w-full rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="currency"
                      className="block text-sm font-medium text-white"
                    >
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          currency: e.target.value as "USD" | "XLM",
                        }))
                      }
                      className="mt-2 block w-full rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                    >
                      <option value="USD">USD</option>
                      <option value="XLM">XLM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="members"
                    className="block text-sm font-medium text-white"
                  >
                    Members (Wallet Addresses)
                  </label>
                  <div className="mt-2 text-sm text-white/70 mb-2">
                    Your address: {address} (automatically included)
                  </div>
                  <input
                    type="text"
                    id="members"
                    value={formData.members}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        members: e.target.value,
                      }))
                    }
                    className="mt-2 block w-full rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                    placeholder="Enter other members' wallet addresses separated by commas"
                  />
                </div>

                <div>
                  <label
                    htmlFor="paidBy"
                    className="block text-sm font-medium text-white"
                  >
                    Paid By
                  </label>
                  <select
                    id="paidBy"
                    value={formData.paidBy}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paidBy: e.target.value,
                      }))
                    }
                    className="mt-2 block w-full rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                  >
                    <option value="">Select who paid</option>
                    <option value={address!}>You</option>
                    {formData.members
                      .split(",")
                      .map((member) => member.trim())
                      .filter(Boolean)
                      .map((member) => (
                        <option key={member} value={member}>
                          {member}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="splitType"
                    className="block text-sm font-medium text-white"
                  >
                    Split Type
                  </label>
                  <select
                    id="splitType"
                    value={formData.splitType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const newSplitType = e.target.value as
                        | "equal"
                        | "percentage"
                        | "custom";
                      setFormData((prev) => ({
                        ...prev,
                        splitType: newSplitType,
                      }));
                    }}
                    className="mt-2 block w-full rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                  >
                    <option value="equal">Equal Split</option>
                    <option value="percentage">Percentage Split</option>
                    <option value="custom">Custom Split</option>
                  </select>
                </div>
              </div>
            </div>

            {formData.splitType === "percentage" && splits.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium text-white">
                  Percentage Split
                </h3>
                {splits.map((split) => (
                  <div key={split.address} className="flex items-center gap-4">
                    <span className="text-sm text-white/70 w-40 truncate">
                      {split.address === address ? "You" : split.address}
                    </span>
                    <input
                      type="number"
                      value={percentages[split.address] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value) && Number(value) <= 100) {
                          updatePercentage(split.address, Number(value));
                        }
                      }}
                      className="w-32 rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-white"
                      placeholder="Percentage"
                    />
                    <span className="text-sm text-white/70">%</span>
                  </div>
                ))}
                <div className="mt-2 text-sm text-white/70">
                  Total:{" "}
                  {Object.values(percentages).reduce((sum, p) => sum + p, 0)}%
                  {Math.abs(
                    Object.values(percentages).reduce((sum, p) => sum + p, 0) -
                      100
                  ) > 0.01 && (
                    <span className="text-red-500 ml-2">(Must equal 100%)</span>
                  )}
                </div>
              </div>
            )}

            {formData.splitType === "custom" && splits.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium text-white">Custom Split</h3>
                {splits.map((split) => (
                  <div key={split.address} className="flex items-center gap-4">
                    <span className="text-sm text-white/70 w-40 truncate">
                      {split.address === address ? "You" : split.address}
                    </span>
                    <input
                      type="number"
                      value={split.amount}
                      onChange={(e) =>
                        updateCustomSplit(split.address, Number(e.target.value))
                      }
                      className="w-32 rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-white"
                      placeholder="Amount"
                    />
                    <span className="text-sm text-white/70">
                      {formData.currency}
                    </span>
                  </div>
                ))}
                <div className="mt-2 text-sm text-white/70">
                  Total: {splits.reduce((sum, split) => sum + split.amount, 0)}{" "}
                  {formData.currency}
                  {Math.abs(
                    splits.reduce((sum, split) => sum + split.amount, 0) -
                      Number(formData.amount)
                  ) > 0.01 && (
                    <span className="text-red-500 ml-2">
                      (Must equal total amount: {formData.amount}{" "}
                      {formData.currency})
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 h-12 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors border border-white/10"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 h-12 rounded-xl border border-white/10 text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
