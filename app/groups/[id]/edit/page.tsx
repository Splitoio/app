"use client";

import { useGroups, type Group, type Split, type Debt } from "@/stores/groups";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { splitter } from "@/utils/splitter";
import Image from "next/image";

export default function EditGroupPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { groups, updateGroup } = useGroups();
    const { address } = useWallet();
    const group = groups.find((g) => g.id === params.id);

    const [splits, setSplits] = useState<Split[]>([]);
    const [percentages, setPercentages] = useState<{ [key: string]: number }>(
        {}
    );
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        amount: "",
        members: "",
        splitType: "equal" as "equal" | "percentage" | "custom",
        currency: "USD" as "USD" | "ETH",
        paidBy: "",
        image: null as File | null,
    });

    useEffect(() => {
        if (group) {
            setSplits(group.splits);
            setFormData({
                name: group.name,
                description: group.description || "",
                amount: group.amount.toString(),
                members: Array.isArray(group.members)
                    ? group.members.join(", ")
                    : group.members,
                splitType: group.splitType,
                currency: group.currency,
                paidBy: group.paidBy,
                image: null,
            });
            setImagePreview(group.image);
        }
    }, [group]);

    useEffect(() => {
        if (
            !formData.members ||
            !formData.amount ||
            !formData.paidBy ||
            !address
        )
            return;

        const memberAddresses = formData.members
            .split(",")
            .map((m) => m.trim());
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

        let imageUrl = group.image;
        if (formData.image) {
            // In a real app, you'd upload to a storage service
            // For now, we'll use the data URL
            imageUrl = URL.createObjectURL(formData.image);
        }

        const memberArray = formData.members
            .split(",")
            .map((member) => member.trim())
            .filter(Boolean);

        const updatedGroup: Partial<Group> = {
            name: formData.name,
            description: formData.description,
            amount: Number(formData.amount),
            members: memberArray,
            splitType: formData.splitType,
            currency: formData.currency,
            paidBy: formData.paidBy,
            image: imageUrl,
        };

        updateGroup(params.id, updatedGroup);
        router.push("/groups");
    };

    const handleSplitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSplitType = e.target.value as
            | "equal"
            | "percentage"
            | "custom";
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

    if (!group) return null;

    return (
        <div className="w-full max-w-7xl mx-auto">
            <h1 className="text-display text-white capitalize inline-block mb-8">
                Edit Group
            </h1>
            <div className="mb-8">
                <p className="text-body text-white/70 mt-2">
                    Update your expense sharing group details
                </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#1F1F23]/50 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="form-group">
                                <label className="form-label">
                                    Group Image
                                </label>
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
                                                currency: e.target.value as
                                                    | "USD"
                                                    | "ETH",
                                            }))
                                        }
                                        className="mt-2 block w-full rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="ETH">ETH</option>
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
                                    Your address: {address} (automatically
                                    included)
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
                                    onChange={(
                                        e: React.ChangeEvent<HTMLSelectElement>
                                    ) => {
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
                                    <option value="percentage">
                                        Percentage Split
                                    </option>
                                    <option value="custom">Custom Split</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            className="flex-1 rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-black"
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-center text-sm font-medium text-white"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>

            {formData.splitType === "percentage" && splits.length > 0 && (
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-medium text-white">
                        Percentage Split
                    </h3>
                    {splits.map((split) => (
                        <div
                            key={split.address}
                            className="flex items-center gap-4"
                        >
                            <span className="text-sm text-white/70">
                                {split.address === address
                                    ? "You"
                                    : split.address}
                            </span>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={percentages[split.address] || 0}
                                onChange={(e) =>
                                    updatePercentage(
                                        split.address,
                                        Number(e.target.value)
                                    )
                                }
                                className="mt-2 block w-32 rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                                placeholder="Percentage"
                            />
                            <span className="text-sm text-white/70">%</span>
                        </div>
                    ))}
                    <div className="mt-2 text-sm text-white/70">
                        Total:{" "}
                        {Object.values(percentages).reduce(
                            (sum, p) => sum + p,
                            0
                        )}
                        %
                        {Math.abs(
                            Object.values(percentages).reduce(
                                (sum, p) => sum + p,
                                0
                            ) - 100
                        ) > 0.01 && (
                            <span className="text-[#FF4444] ml-2">
                                (Must equal 100%)
                            </span>
                        )}
                    </div>
                </div>
            )}

            {formData.splitType === "custom" && splits.length > 0 && (
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-medium text-white">
                        Custom Split
                    </h3>
                    {splits.map((split) => (
                        <div
                            key={split.address}
                            className="flex items-center gap-4"
                        >
                            <span className="text-sm text-white/70">
                                {split.address === address
                                    ? "You"
                                    : split.address}
                            </span>
                            <input
                                type="number"
                                value={split.amount}
                                onChange={(e) =>
                                    updateCustomSplit(
                                        split.address,
                                        Number(e.target.value)
                                    )
                                }
                                className="mt-2 block w-32 rounded-lg border border-white/10 bg-[#1F1F23] px-4 py-2 text-white"
                                placeholder="Amount"
                            />
                            <span className="text-sm text-white/70">
                                {formData.currency}
                            </span>
                        </div>
                    ))}
                    <div className="mt-2 text-sm text-white/70">
                        Total:{" "}
                        {splits.reduce((sum, split) => sum + split.amount, 0)}{" "}
                        {formData.currency}
                        {Math.abs(
                            splits.reduce(
                                (sum, split) => sum + split.amount,
                                0
                            ) - Number(formData.amount)
                        ) > 0.01 && (
                            <span className="text-body-sm text-[#FF4444] ml-2">
                                (Must equal total amount: {formData.amount}{" "}
                                {formData.currency})
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
