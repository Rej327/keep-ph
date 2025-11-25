import ProtectedLayout from "@/components/page/Layout/ProtectedLayout";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
