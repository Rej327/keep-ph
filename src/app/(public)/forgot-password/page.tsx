import PublicProvider from "@/components/provider/PublicProvider";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function Page() {
  return (
    <PublicProvider>
      <ForgotPasswordForm />
    </PublicProvider>
  );
}
