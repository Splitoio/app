"use client";

import { useGroups, type Group, type Split, type Debt } from "@/stores/groups";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import Image from "next/image";

export default function CreateGroupPage() {
  const router = useRouter();
  const { addGroup, connectedAddress } = useGroups();
  const { isConnected, address, connectWallet } = useWallet();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    // Check if wallet is connected on mount
    if (!isConnected && !address) {
      // connectWallet();
    }
  }, [isConnected, address, connectWallet]);

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

  // Calculate splits when members or split type changes
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

    // Update the actual split amounts based on the new percentage
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

  // Calculate debts based on splits and payer
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

    if (!isConnected || !address) {
      alert("Please connect your wallet first!");
      return;
    }

    if (formData.splitType === "custom" && !validateSplits()) {
      alert("The sum of splits must equal the total amount!");
      return;
    }

    let imageUrl = "/group_icon_placeholder.png";
    if (formData.image) {
      // In a real app, you'd upload to a storage service
      // For now, we'll use the data URL
      imageUrl = URL.createObjectURL(formData.image);
    }

    const debts = calculateDebts(splits, formData.paidBy);

    const newGroup: Group = {
      id: Date.now().toString(),
      name: formData.name,
      image: imageUrl,
      creator: "You",
      creatorAddress: address,
      date: new Date().toLocaleDateString(),
      amount: Number(formData.amount),
      paidBy: formData.paidBy,
      members: formData.members.split(",").map((m) => m.trim()),
      splits,
      debts,
      splitType: formData.splitType as "equal" | "percentage" | "custom",
      currency: formData.currency as "USD" | "ETH",
      description: formData.description,
    };

    addGroup(newGroup);
    router.push("/groups");
  };

  // Set paidBy to connected address when available
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

    // Initialize percentages with equal split
    const initialPercentages = Object.fromEntries(
      allMembers.map((addr) => [addr, equalPercentage])
    );
    setPercentages(initialPercentages);
  }, [formData.members, formData.splitType, address]);

  const errors = {
    name: "",
  };

  return (
    <div className="w-full space-y-8">
      <h1 className="text-display text-white capitalize inline-block mb-8">
        Create Group
      </h1>
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-white">
          New Group
        </h1>
        <p className="mt-2 text-white/70">Create a new expense sharing group</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1F1F23]/50 p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="form-group">
                <label className="block text-sm font-medium text-white mb-2">
                  Group Image
                </label>
                <div className="flex items-center gap-4">
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
                    Choose Image
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="name" className="text-body text-white/90">
                  Group Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-input text-body"
                  placeholder="Enter group name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              {errors.name && (
                <p className="text-body-sm text-[#FF4444] mt-1">
                  {errors.name}
                </p>
              )}
              <p className="text-body-sm text-white/50 mt-1">
                This will help identify your group
              </p>

              <div className="form-group">
                <label htmlFor="description" className="form-label">
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
                  className="form-input"
                  placeholder="Enter group description"
                />
              </div>

              <div className="form-group">
                <label htmlFor="members" className="form-label">
                  Members (Wallet Addresses)
                </label>
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
                  className="form-input"
                  placeholder="Enter wallet addresses separated by commas"
                  required
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="amount" className="form-label">
                    Amount
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-white/50 pointer-events-none select-none">
                      {formData.currency === "USD" ? "$" : ""}
                    </span>
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
                      className="form-input !pl-8 w-full"
                      style={{ paddingLeft: "2rem" }}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="currency" className="form-label">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        currency: e.target.value,
                      }))
                    }
                    className="form-input"
                  >
                    <option value="USD">USD</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="splitType" className="form-label">
                  Split Type
                </label>
                <select
                  id="splitType"
                  value={formData.splitType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      splitType: e.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="equal">Equal Split</option>
                  <option value="percentage">Percentage Split</option>
                  <option value="custom">Custom Split</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="paidBy" className="form-label">
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
                  className="form-input"
                >
                  <option value="">Select who paid</option>
                  <option value={address!}>You</option>
                  {formData.members.split(",").map((member) => (
                    <option key={member.trim()} value={member.trim()}>
                      {member.trim()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {formData.splitType === "custom" && splits.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium text-white">Custom Split</h3>
              {splits.map((split) => (
                <div key={split.address} className="flex items-center gap-4">
                  <span className="text-sm text-white/70">
                    {split.address === address ? "You" : split.address}
                  </span>
                  <input
                    type="number"
                    value={split.amount}
                    onChange={(e) =>
                      updateCustomSplit(split.address, Number(e.target.value))
                    }
                    className="form-input w-32"
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
                  <span className="text-[#FF4444] ml-2">
                    (Must equal total amount: {formData.amount}{" "}
                    {formData.currency})
                  </span>
                )}
              </div>
            </div>
          )}

          {formData.splitType === "percentage" && splits.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-h3 text-white">Percentage Split</h3>
              {splits.map((split) => (
                <div key={split.address} className="flex items-center gap-4">
                  <span className="text-body text-white/70">
                    {split.address === address ? "You" : split.address}
                  </span>
                  <input
                    type="text"
                    value={percentages[split.address] || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value) && Number(value) <= 100) {
                        updatePercentage(split.address, Number(value));
                      }
                    }}
                    className="mt-2 block w-32 rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
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
                  <span className="text-[#FF4444] ml-2">(Must equal 100%)</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-white px-6 py-3 text-center text-sm font-medium text-black 
              transition-all duration-200 hover:bg-white/90 active:scale-[0.98]"
            >
              Create Group
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-lg border border-white/10 px-6 py-3 text-center text-sm 
              font-medium text-white transition-all duration-200 hover:bg-white/5 active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
