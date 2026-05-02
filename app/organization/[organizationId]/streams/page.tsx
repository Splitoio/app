"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function OrganizationStreamsRedirect() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.organizationId as string;

  useEffect(() => {
    if (organizationId) {
      router.replace(`/organization/${organizationId}/finances?type=income`);
    }
  }, [organizationId, router]);

  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-white/30" />
    </div>
  );
}
