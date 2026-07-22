import { View } from "react-native";

import { OnboardingPageLayout } from "../components/onboarding/OnboardingPageLayout";

export function WelcomeScreen({
  onGetStarted,
  transitionDisabled,
}: {
  onGetStarted: () => void;
  transitionDisabled?: boolean;
}) {
  return (
    <OnboardingPageLayout
      description="Connect across languages with real-time voice interpretation for Khmer and English conversations."
      onContinue={onGetStarted}
      page={1}
      title="Live Interpreter"
      titleLead="Welcome to"
      transitionDisabled={transitionDisabled}
      media={<View accessibilityLabel="Future welcome video" style={{ flex: 1 }} />}
    />
  );
}
