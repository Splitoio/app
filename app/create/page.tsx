"use client";

import type React from "react";

import { useGroups, type Group, type Split, type Debt } from "@/stores/groups";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { ApiError } from "@/types/api-error";
import { useAuthStore } from "@/stores/authStore";
import { useCreateGroup } from "@/features/groups/hooks/use-create-group";
import { useUploadFile } from "@/features/files/hooks/use-balances";

export default function CreateGroupPage() {
  const router = useRouter();
  const { addGroup, connectedAddress } = useGroups();
  const { isConnected, address, connectWallet } = useWallet();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAuthenticated = useAuthStore(
    (state: { isAuthenticated: boolean }) => state.isAuthenticated
  );
  const mutatation = useCreateGroup();
  const uploadFileMutation = useUploadFile();

  useEffect(() => {
    if (!isConnected && !address) {
      // connectWallet();
    }
  }, [isConnected, address]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    members: "",
    paidBy: "",
    splitType: "equal",
    currency: "USD",
    image: null as File | null,
  });

  const [splits, setSplits] = useState<Split[]>([]);
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!formData.members || !formData.amount) return;

    const memberAddresses = formData.members.split(",").map((m) => m.trim());
    const allMembers = [address!, ...memberAddresses].filter(Boolean);

    let newSplits: Split[] = [];

    switch (formData.splitType) {
      case "equal":
        const equalAmount = Number(formData.amount) / allMembers.length;
        newSplits = allMembers.map((addr) => ({
          address: addr,
          amount: equalAmount,
        }));
        break;

      case "percentage":
        const equalPercentage = 100 / allMembers.length;
        newSplits = allMembers.map((addr) => ({
          address: addr,
          amount: (Number(formData.amount) * equalPercentage) / 100,
          percentage: equalPercentage,
        }));
        break;

      case "custom":
        newSplits = allMembers.map((addr) => ({
          address: addr,
          amount: 0,
        }));
        break;
    }

    setSplits(newSplits);
  }, [formData.members, formData.amount, formData.splitType, address]);

  const updateCustomSplit = (address: string, amount: number) => {
    setSplits((current) =>
      current.map((split) =>
        split.address === address ? { ...split, amount } : split
      )
    );
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

  const calculateDebts = (splits: Split[], paidBy: string): Debt[] => {
    const debts: Debt[] = [];
    const payer = splits.find((s) => s.address === paidBy);

    if (!payer) return debts;

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

  const validateSplits = () => {
    const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
    return Math.abs(totalSplit - Number(formData.amount)) < 0.01;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const response = await uploadFileMutation.mutateAsync(file);

      const imageUrl = response.data.downloadUrl;

      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(imageUrl);
      // const reader = new FileReader();
      // reader.onloadend = () => {
      //   setImagePreview(reader.result as string);
      // };
      // reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!isAuthenticated) {
      alert("Please sign in first!");
      setIsSubmitting(false);
      return;
    }

    // Get image URL from the preview, but handle the null case
    // by converting it to undefined, which the API client expects
    const imageUrl = imagePreview || undefined;

    try {
      mutatation.mutate(
        {
          name: formData.name,
          description: formData.description,
          currency: formData.currency,
          imageUrl: imageUrl,
        },
        {
          onSuccess: (data) => {
            toast.success("Group created successfully");
            router.push(`/groups/${data.id}`);
          },
          onError: (err: ApiError) => {
            toast.error(`Error creating group: ${err.message}`);
            setIsSubmitting(false);
          },
        }
      );
    } catch (error) {
      console.error("Error creating group:", error);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (address && !formData.paidBy) {
      setFormData((prev) => ({ ...prev, paidBy: address }));
    }
  }, [address, formData.paidBy]);

  useEffect(() => {
    if (!formData.members || formData.splitType !== "percentage") return;

    const memberAddresses = formData.members.split(",").map((m) => m.trim());
    const allMembers = [address!, ...memberAddresses].filter(Boolean);
    const equalPercentage = 100 / allMembers.length;

    const initialPercentages = Object.fromEntries(
      allMembers.map((addr) => [addr, equalPercentage])
    );
    setPercentages(initialPercentages);
  }, [formData.members, formData.splitType, address]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-mobile-xl sm:text-2xl md:text-3xl font-bold mb-8 text-white">
        Create Group
      </h1>
      <Card className="bg-zinc-950 border-white/10">
        <CardHeader>
          <CardTitle className="text-mobile-lg sm:text-xl text-white">
            New Group
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
              <div className="space-y-6">
                <div>
                  <Label
                    htmlFor="group-image"
                    className="text-mobile-base sm:text-base text-white"
                  >
                    Group Image
                  </Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full bg-zinc-900">
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
                          <Camera size={24} />
                        </div>
                      )}
                    </div>
                    <Input
                      type="file"
                      id="group-image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Label
                      htmlFor="group-image"
                      className="cursor-pointer text-mobile-sm sm:text-sm text-white bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-lg transition-colors"
                    >
                      Choose Image
                    </Label>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="name"
                    className="text-mobile-base sm:text-base text-white"
                  >
                    Group Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter group name"
                    className="bg-zinc-900 border-zinc-800 text-white mt-1 text-mobile-base sm:text-base"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="description"
                    className="text-mobile-base sm:text-base text-white"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="What's this group for?"
                    className="bg-zinc-900 border-zinc-800 text-white h-24 mt-1 text-mobile-base sm:text-base"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="currency"
                    className="text-mobile-base sm:text-base text-white"
                  >
                    Currency
                  </Label>
                  <select
                    id="currency"
                    className="w-full bg-zinc-900 border-zinc-800 text-white rounded-md mt-1 p-2 text-mobile-base sm:text-base"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CNY">CNY - Chinese Yuan</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-white text-black hover:bg-white/90 px-6 text-mobile-base sm:text-base"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="text-mobile-base sm:text-base">
                      Creating...
                    </span>
                  </>
                ) : (
                  <span className="text-mobile-base sm:text-base">
                    Create Group
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
