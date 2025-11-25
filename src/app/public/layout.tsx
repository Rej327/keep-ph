import PublicLayout from "@/components/page/Layout/PublicLayout";

export const metadata = {
  title: "Keep - PH",
  description: "Keep - PH Public Dashboard",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
