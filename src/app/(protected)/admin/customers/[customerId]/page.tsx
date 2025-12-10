import CustomerDetailsClient from "@/components/page/Admin/Customers/CustomerDetailsClient";
import React from "react";

export default async function page({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  return <CustomerDetailsClient customerId={customerId} />;
}
