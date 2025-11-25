import { redirect } from "next/navigation";

export default function PublicRootPage() {
  redirect("/public/applications");
  return null;
}
