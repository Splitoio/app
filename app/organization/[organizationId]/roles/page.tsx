"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function OrganizationRolesRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params?.organizationId as string;

  useEffect(() => {
    if (organizationId) {
      router.replace(`/organization/${organizationId}/members`);
    }
  }, [organizationId, router]);

  return null;
}
