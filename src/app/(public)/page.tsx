import { LandingFeatures } from "@/components/page/LandingPage/LandingFeatures";
import { LandingHeader } from "@/components/page/LandingPage/LandingHeader";
import { LandingHero } from "@/components/page/LandingPage/LandingHero";
import { LandingHowItWorks } from "@/components/page/LandingPage/LandingHowItWorks";
import { LandingPricing } from "@/components/page/LandingPage/LandingPricing";
import { LandingFaq } from "@/components/page/LandingPage/LandingFaq";
import { LandingFooter } from "@/components/page/LandingPage/LandingFooter";
import { VisitorTracker } from "@/components/page/DashboardPage/VisitorTracker";

export default function Home() {
  return (
    <>
      <VisitorTracker />
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingPricing />
      <LandingFaq />
      <LandingFooter />
    </>
  );
}
