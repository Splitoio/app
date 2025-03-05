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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";
import { useCreateGroup } from "@/features/groups/hooks/use-create-group";
import { useAuthStore } from "@/stores/authStore";

export default function CreateGroupPage() {
  const router = useRouter();
  const { addGroup, connectedAddress } = useGroups();
  const { isConnected, address, connectWallet } = useWallet();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const mutatation = useCreateGroup();

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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

    // if (formData.splitType === "custom" && !validateSplits()) {
    //   alert("The sum of splits must equal the total amount!");
    //   setIsSubmitting(false);
    //   return;
    // }

    const imageUrl = "/group_icon_placeholder.png";
    // if (formData.image) {
    //   imageUrl = URL.createObjectURL(formData.image);
    // }

    // const debts = calculateDebts(splits, formData.paidBy);

    // const newGroup: Group = {
    //   id: Date.now().toString(),
    //   name: formData.name,
    //   image: imageUrl,
    //   creator: "You",
    //   creatorAddress: address,
    //   date: new Date().toLocaleDateString(),
    //   amount: Number(formData.amount),
    //   paidBy: formData.paidBy,
    //   members: formData.members.split(",").map((m) => m.trim()),
    //   splits,
    //   debts,
    //   splitType: formData.splitType as "equal" | "percentage" | "custom",
    //   currency: formData.currency as "USD" | "ETH",
    //   description: formData.description,
    // };

    // addGroup(newGroup);
    setIsSubmitting(false);
    await mutatation.mutateAsync({
      members: formData.members.split(",").map((m) => m.trim()),
      name: formData.name,
      currency: formData.currency,
      description: formData.description,
      imageUrl: imageUrl,
    });
    router.push("/groups");
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
      <h1 className="text-3xl font-bold mb-8 text-white">Create Group</h1>
      <Card className="bg-zinc-950 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">New Group</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="group-image" className="text-white">
                    Group Image
                  </Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="h-24 w-24 overflow-hidden rounded-full bg-zinc-900">
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
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="group-image"
                    />
                    <Label
                      htmlFor="group-image"
                      className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Choose Image
                    </Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="name" className="text-white">
                    Group Name
                  </Label>
                  <Input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter group name"
                    className="mt-2 bg-zinc-900 border-white/10 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Enter group description"
                    className="mt-2 bg-zinc-900 border-white/10 text-white placeholder:text-white/50"
                  />
                </div>

                {/* <div>
                  <Label htmlFor="members" className="text-white">
                    Members (Email Addresses)
                  </Label>
                  <Textarea
                    id="members"
                    value={formData.members}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        members: e.target.value,
                      }))
                    }
                    placeholder="Enter email addresses separated by commas"
                    rows={3}
                    className="mt-2 bg-zinc-900 border-white/10 text-white placeholder:text-white/50"
                    required
                  />
                </div> */}
                {/* <div>
                  <Label htmlFor="members" className="text-white">
                    Members (Wallet Addresses)
                  </Label>
                  <Textarea
                    id="members"
                    value={formData.members}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        members: e.target.value,
                      }))
                    }
                    placeholder="Enter wallet addresses separated by commas"
                    rows={3}
                    className="mt-2 bg-zinc-900 border-white/10 text-white placeholder:text-white/50"
                    required
                  />
                </div> */}
              </div>

              {/* <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount" className="text-white">
                      Amount
                    </Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none select-none">
                        {formData.currency === "USD" ? "$" : ""}
                      </span>
                      <Input
                        type="number"
                        id="amount"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }))
                        }
                        className="pl-8 bg-zinc-900 border-white/10 text-white"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="currency" className="text-white">
                      Currency
                    </Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, currency: value }))
                      }
                    >
                      <SelectTrigger className="mt-2 bg-zinc-900 border-white/10 text-white">
                        <SelectValue
                          placeholder="Select currency"
                          className="text-white/70"
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem
                          value="USD"
                          className="text-white hover:bg-white/10"
                        >
                          USD
                        </SelectItem>
                        <SelectItem
                          value="ETH"
                          className="text-white hover:bg-white/10"
                        >
                          ETH
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="splitType">Split Type</Label>
                  <Select
                    value={formData.splitType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, splitType: value }))
                    }
                  >
                    <SelectTrigger className="mt-2 bg-zinc-900 border-white/10 text-white">
                      <SelectValue
                        placeholder="Select split type"
                        className="text-white/70"
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem
                        value="equal"
                        className="text-white hover:bg-white/10"
                      >
                        Equal Split
                      </SelectItem>
                      <SelectItem
                        value="percentage"
                        className="text-white hover:bg-white/10"
                      >
                        Percentage Split
                      </SelectItem>
                      <SelectItem
                        value="custom"
                        className="text-white hover:bg-white/10"
                      >
                        Custom Split
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paidBy">Paid By</Label>
                  <Select
                    value={formData.paidBy || address || ""}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, paidBy: value }))
                    }
                  >
                    <SelectTrigger className="mt-2 bg-zinc-900 border-white/10 text-white">
                      <SelectValue
                        placeholder="Select who paid"
                        className="text-white/70"
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {address && (
                        <SelectItem
                          value={address}
                          className="text-white hover:bg-white/10"
                        >
                          You
                        </SelectItem>
                      )}
                      {formData.members.split(",").map(
                        (member) =>
                          member.trim() && (
                            <SelectItem
                              key={member.trim()}
                              value={member.trim()}
                              className="text-white hover:bg-white/10"
                            >
                              {member.trim()}
                            </SelectItem>
                          )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div> */}
            </div>

            {/* {formData.splitType === "custom" && splits.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium">Custom Split</h3>
                {splits.map((split) => (
                  <div key={split.address} className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-40 truncate">
                      {split.address === address ? "You" : split.address}
                    </span>
                    <Input
                      type="number"
                      value={split.amount}
                      onChange={(e) =>
                        updateCustomSplit(split.address, Number(e.target.value))
                      }
                      className="w-32"
                      placeholder="Amount"
                    />
                    <span className="text-sm text-muted-foreground">
                      {formData.currency}
                    </span>
                  </div>
                ))}
                <div className="mt-2 text-sm text-muted-foreground">
                  Total: {splits.reduce((sum, split) => sum + split.amount, 0)}{" "}
                  {formData.currency}
                  {Math.abs(
                    splits.reduce((sum, split) => sum + split.amount, 0) -
                      Number(formData.amount)
                  ) > 0.01 && (
                    <span className="text-destructive ml-2">
                      (Must equal total amount: {formData.amount}{" "}
                      {formData.currency})
                    </span>
                  )}
                </div>
              </div>
            )}

            {formData.splitType === "percentage" && splits.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium">Percentage Split</h3>
                {splits.map((split) => (
                  <div key={split.address} className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-40 truncate">
                      {split.address === address ? "You" : split.address}
                    </span>
                    <Input
                      type="number"
                      value={percentages[split.address] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value) && Number(value) <= 100) {
                          updatePercentage(split.address, Number(value));
                        }
                      }}
                      className="w-32 bg-[#1F1F23] text-white/90"
                      placeholder="Percentage"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                ))}
                <div className="mt-2 text-sm text-muted-foreground">
                  Total:{" "}
                  {Object.values(percentages).reduce((sum, p) => sum + p, 0)}%
                  {Math.abs(
                    Object.values(percentages).reduce((sum, p) => sum + p, 0) -
                      100
                  ) > 0.01 && (
                    <span className="text-destructive ml-2">
                      (Must equal 100%)
                    </span>
                  )}
                </div>
              </div>
            )} */}

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800"
                disabled={mutatation.isPending}
              >
                {mutatation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
              <Button
                type="button"
                onClick={() => router.back()}
                variant="outline"
                className="flex-1 border-white/10 text-white bg-zinc-900 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
