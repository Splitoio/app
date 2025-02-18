"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, slideUp } from "@/utils/animations";

type Friend = {
  id: string;
  name: string;
  email: string;
  address: string;
  image: string;
  balance: {
    amount: number;
    type: "owes_you" | "you_owe";
  };
};

const mockFriends: Friend[] = [
  {
    id: "1",
    name: "Mike",
    email: "mike@something.com",
    address: "GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4",
    image: "https://api.dicebear.com/7.x/identicon/svg?seed=Mike",
    balance: {
      amount: 167.0,
      type: "you_owe",
    },
  },
  {
    id: "2",
    name: "Harris",
    email: "harris@something.com",
    address: "GDKIJJIKXLOM2NRMPNQZUUYK24ZPVFC6426GZAEP3KUK6KEJLACCWNMX",
    image: "https://api.dicebear.com/7.x/identicon/svg?seed=Harris",
    balance: {
      amount: 54.5,
      type: "owes_you",
    },
  },
  {
    id: "3",
    name: "Tyson",
    email: "tyson@something.com",
    address: "GCWEER57MBVRXA4I426VL3PSWWM72SSZ3AZ5TGBDSWJMTDFVCABWNZIF",
    image: "https://api.dicebear.com/7.x/identicon/svg?seed=Tyson",
    balance: {
      amount: 90.0,
      type: "you_owe",
    },
  },
  {
    id: "4",
    name: "Kamala",
    email: "kamala@something.com",
    address: "GACVB2E6IEV2UT6IDVOO5B5CNN7WPKJFR36B7KD7ZNXDANPTSYNMZYQM",
    image: "https://api.dicebear.com/7.x/identicon/svg?seed=Kamala",
    balance: {
      amount: 35.0,
      type: "owes_you",
    },
  },
];

export function FriendsList() {
  const [friends] = useState<Friend[]>(mockFriends);

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-3 lg:space-y-4"
    >
      {friends.map((friend) => (
        <motion.div
          key={friend.id}
          variants={slideUp}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 lg:gap-8 rounded-xl bg-zinc-950 p-3 lg:p-4 pointer-events-none"
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="h-12 w-12 lg:h-20 lg:w-20 overflow-hidden rounded-full">
              <Image
                src={friend.image}
                alt={friend.name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-lg lg:text-xl font-semibold text-white">
                {friend.name}
              </p>
              <p className="text-xs lg:text-sm text-white/70">{friend.email}</p>
            </div>
          </div>

          <div className="text-right min-w-[80px] lg:min-w-[100px] flex flex-col">
            <span className="text-lg text-white/70">
              {friend.balance.type === "owes_you" ? "you are owed" : "you owe"}
            </span>
            <span
              className={
                (friend.balance.type === "owes_you"
                  ? "text-[#53e45d]"
                  : "text-[#FF4444]")
              }
            >
              ${friend.balance.amount.toFixed(2)}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
