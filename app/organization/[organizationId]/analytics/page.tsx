"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OrganizationAnalyticsRedirect() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.organizationId as string;

  useEffect(() => {
    if (organizationId) {
      router.replace(`/organization/${organizationId}/expenses`);
    }
  }, [organizationId, router]);

  return null;
}
