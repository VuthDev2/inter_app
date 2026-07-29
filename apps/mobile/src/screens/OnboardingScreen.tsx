import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, View } from "react-native";

import {
  AnimatedOnboardingIndicator,
  OnboardingPageLayout,
} from "../components/onboarding/OnboardingPageLayout";

type OnboardingPage = 1 | 2 | 3;

const pages = [
  {
    description: "Connect across languages with real-time voice interpretation for Khmer and English conversations.",
    featureHeading: undefined,
    title: "Live Interpreter",
    titleLead: "Welcome to",
  },
  {
    description: "Quick one-way voice translations for fast communication.",
    featureHeading: "Live Translate",
    title: "Live Interpretation",
    titleLead: undefined,
  },
  {
    description: "Two-way chat with real-time voice translation, perfect for dialogues.",
    featureHeading: "Conversation",
    title: "Live Interpretation",
    titleLead: undefined,
  },
] as const;

export function OnboardingScreen({ onFinished }: { onFinished: () => void }) {
  const [page, setPage] = useState<OnboardingPage>(1);
  const [transitionDisabled, setTransitionDisabled] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const contentProgress = useRef(new Animated.Value(1)).current;
  const transitionRunning = useRef(false);
  const pageContent = pages[page - 1];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  const transitionToPage = (nextPage: OnboardingPage) => {
    if (transitionRunning.current) return;
    if (nextPage === page) return;

    transitionRunning.current = true;
    setTransitionDisabled(true);

    Animated.timing(contentProgress, {
      duration: reduceMotion ? 120 : 140,
      easing: Easing.inOut(Easing.quad),
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        transitionRunning.current = false;
        setTransitionDisabled(false);
        return;
      }

      setPage(nextPage);
      Animated.timing(contentProgress, {
        duration: reduceMotion ? 180 : 200,
        easing: Easing.out(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }).start(() => {
        transitionRunning.current = false;
        setTransitionDisabled(false);
      });
    });
  };

  const handleContinue = () => {
    if (transitionRunning.current) return;

    if (page === 3) {
      transitionRunning.current = true;
      setTransitionDisabled(true);
      onFinished();
      return;
    }

    transitionToPage((page + 1) as OnboardingPage);
  };

  const swipeResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        !transitionRunning.current &&
        Math.abs(gesture.dx) > 16 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx <= -55 && page < 3) {
          transitionToPage((page + 1) as OnboardingPage);
        } else if (gesture.dx >= 55 && page > 1) {
          transitionToPage((page - 1) as OnboardingPage);
        }
      },
    }),
    [page, reduceMotion],
  );

  return (
    <OnboardingPageLayout
      contentAnimationStyle={reduceMotion
        ? { opacity: contentProgress }
        : {
            opacity: contentProgress,
            transform: [{
              scale: contentProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.985, 1],
              }),
            }],
          }}
      description={pageContent.description}
      featureHeading={pageContent.featureHeading}
      indicator={(
        <AnimatedOnboardingIndicator
          activePage={page}
          reduceMotion={reduceMotion}
        />
      )}
      media={(
        <View
          accessibilityLabel={`Future onboarding page ${page} media`}
          style={{ flex: 1 }}
        />
      )}
      onContinue={handleContinue}
      page={page}
      panHandlers={swipeResponder.panHandlers}
      showLogo={page === 1}
      title={pageContent.title}
      titleLead={pageContent.titleLead}
      transitionDisabled={transitionDisabled}
    />
  );
}
