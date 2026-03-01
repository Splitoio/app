"use client";

import { useRouter } from "next/navigation";
import { CreateOrganizationForm } from "@/components/create-organization-form";

export default function OrganizationCreatePage() {
  const router = useRouter();

  return (
    <CreateOrganizationForm
      isOpen={true}
      onClose={() => router.push("/organization")}
    />
  );
}
