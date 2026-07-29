import { View } from "react-native";

import { OnboardingPageLayout } from "../components/onboarding/OnboardingPageLayout";

export function ConversationOnboardingScreen({
  onGetStarted,
  transitionDisabled,
}: {
  onGetStarted: () => void;
  transitionDisabled?: boolean;
}) {
  return (
    <OnboardingPageLayout
      activeIndicatorColor="#4F99EB"
      description="Two-way chat with real-time voice translation, perfect for dialogues."
      featureHeading="Conversation"
      media={<View accessibilityLabel="Future conversation video" style={{ flex: 1 }} />}
      onContinue={onGetStarted}
      page={3}
      showLogo={false}
      title="Live Interpretation"
      transitionDisabled={transitionDisabled}
    />
  );
}
