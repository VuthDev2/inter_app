import { View } from "react-native";

import { OnboardingPageLayout } from "../components/onboarding/OnboardingPageLayout";

export function LiveTranslateOnboardingScreen({
  onGetStarted,
  transitionDisabled,
}: {
  onGetStarted: () => void;
  transitionDisabled?: boolean;
}) {
  return (
    <OnboardingPageLayout
      description="Quick one-way voice translations for fast communication."
      featureHeading="Live Translate"
      media={<View accessibilityLabel="Future live translation video" style={{ flex: 1 }} />}
      onContinue={onGetStarted}
      page={2}
      showLogo={false}
      title="Live Interpretation"
      transitionDisabled={transitionDisabled}
    />
  );
}
