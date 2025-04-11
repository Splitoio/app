import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const mockGroups: Group[] = [
  {
    id: "3e3",
    name: "3e3",
    image: "/group_icon_placeholder.png",
    creator: "You",
    creatorAddress: "GBFLT2OQBK7YCFDTXO2BXLQKQZHRFHZL5PUIE5ZPOI4UF6LHFKJYCX4",
    date: "2/18/2025",
    amount: 0,
    paidBy: "GBFLT2OQBK7YCFDTXO2BXLQKQZHRFHZL5PUIE5ZPOI4UF6LHFKJYCX4",
    members: [],
    splits: [],
    debts: [],
    splitType: "equal",
    currency: "USD",
    description: "",
  },
  {
    id: "2323",
    name: "2323",
    image: "/group_icon_placeholder.png",
    creator: "You",
    creatorAddress: "GBFLT2OQBK7YCFDTXO2BXLQKQZHRFHZL5PUIE5ZPOI4UF6LHFKJYCX4",
    date: "2/18/2025",
    amount: 0,
    paidBy: "GBFLT2OQBK7YCFDTXO2BXLQKQZHRFHZL5PUIE5ZPOI4UF6LHFKJYCX4",
    members: [],
    splits: [],
    debts: [],
    splitType: "equal",
    currency: "USD",
    description: "",
  },
  {
    id: "232",
    name: "232",
    image: "/group_icon_placeholder.png",
    creator: "You",
    creatorAddress: "GBFLT2OQBK7YCFDTXO2BXLQKQZHRFHZL5PUIE5ZPOI4UF6LHFKJYCX4",
    date: "2/18/2025",
    amount: 0,
    paidBy: "GBFLT2OQBK7YCFDTXO2BXLQKQZHRFHZL5PUIE5ZPOI4UF6LHFKJYCX4",
    members: [],
    splits: [],
    debts: [],
    splitType: "equal",
    currency: "USD",
    description: "",
  },
];

export type Split = {
  address: string;
  amount: number;
  percentage?: number;
  hasPaid?: boolean;
};

export type Debt = {
  from: string;
  to: string;
  amount: number;
};

export type Group = {
  id: string;
  name: string;
  image: string;
  creator: string;
  creatorAddress: string;
  date: string;
  amount: number;
  paidBy: string;
  members: string[];
  splits: Split[];
  debts: Debt[];
  splitType: "equal" | "percentage" | "custom";
  currency: "USD" | "XLM";
  description?: string;
};

type GroupStore = {
  groups: Group[];
  connectedAddress: string | null;
  setConnectedAddress: (address: string | null) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: string, group: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
};

export const useGroups = create<GroupStore>()(
  persist(
    (set) => ({
      groups: mockGroups,
      connectedAddress: null,
      setConnectedAddress: (address) => set({ connectedAddress: address }),
      addGroup: (group) =>
        set((state) => ({ groups: [...state.groups, group] })),
      updateGroup: (id, updatedGroup) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, ...updatedGroup } : group
          ),
        })),
      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id),
        })),
    }),
    {
      name: "groups-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
