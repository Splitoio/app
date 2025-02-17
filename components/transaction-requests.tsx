import { Check, X } from "lucide-react";
import Image from "next/image";

type Request = {
  id: string;
  user: {
    name: string;
    image: string;
  };
  amount: number;
  status: "pending" | "received";
  date: string;
};

const requests: Request[] = [
  {
    id: "1",
    user: {
      name: "Mike",
      image: "/placeholder-user.jpg",
    },
    amount: 52.43,
    status: "pending",
    date: "3 weeks ago",
  },
  {
    id: "2",
    user: {
      name: "Sara",
      image: "/placeholder-user.jpg",
    },
    amount: 67,
    status: "received",
    date: "yesterday",
  },
];

export function TransactionRequests() {
  return (
    <div className="rounded-xl bg-zinc-950 p-4 lg:p-6">
      <h2 className="text-h2 text-white mb-6">Transaction Requests</h2>
      <div className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="group relative overflow-hidden rounded-xl bg-zinc-950 p-3 transition-all duration-200 hover:bg-[#1a1a1b] lg:p-5"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 flex-shrink-0 lg:h-12 lg:w-12">
                  <div className="absolute inset-0 rounded-full bg-white/10 ring-2 ring-white/5">
                    {request.user.image ? (
                      <Image
                        src={request.user.image}
                        alt={request.user.name}
                        className="h-full w-full rounded-full object-cover"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-lg font-medium text-white">
                          {request.user.name[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-white">
                    {request.user.name} is Requesting
                  </p>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <span>Requested ${request.amount}</span>
                    <span className="h-1 w-1 rounded-full bg-white/30" />
                    <span>{request.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#53e45d] text-white transition-all hover:bg-[#17ff23] hover:shadow-[0_0_15px_rgba(103,183,108,0.3)] lg:h-10 lg:w-10">
                  <Check className="h-4 w-4 lg:h-5 lg:w-5" />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF4444] text-white transition-all hover:bg-[#ff3333] hover:shadow-[0_0_15px_rgba(255,68,68,0.3)] lg:h-10 lg:w-10">
                  <X className="h-4 w-4 lg:h-5 lg:w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
