import PublicProvider from "@/components/providers/PublicProvider";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function Page() {
  return (
    <PublicProvider>
      <ForgotPasswordForm />
    </PublicProvider>
  );
}
