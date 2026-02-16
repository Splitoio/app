"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OrganizationDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/organization/${id}/invoices`);
    } else {
      router.replace("/organization/organizations");
    }
  }, [id, router]);

  return null;
}
