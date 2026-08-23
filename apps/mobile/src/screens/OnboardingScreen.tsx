import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder } from "react-native";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";

import {
  AnimatedOnboardingIndicator,
  OnboardingPageLayout,
} from "../components/onboarding/OnboardingPageLayout";

type OnboardingPage = 1 | 2 | 3;

const pageVideos = [
  require("../../../../assets/Video-Welcomepage/First-one1.mp4"),
  require("../../../../assets/Video-Welcomepage/Translate2.mp4"),
  require("../../../../assets/Video-Welcomepage/liveTranslate3.mp4"),
];

function loopSilently(player: VideoPlayer) {
  player.loop = true;
  player.muted = true;
}

const pages = [
  {
    description: "Connect across languages with real-time voice interpretation for Khmer and English conversations.",
    featureHeading: undefined,
    title: "Live Interpreter",
    titleLead: "Welcome to",
  },
  {
    description: "Two-way chat with real-time voice translation, perfect for dialogues.",
    featureHeading: "Conversation",
    title: "Live Interpretation",
    titleLead: undefined,
  },
  {
    description: "Record meetings, lectures, and voice notes, then organize them by category.",
    featureHeading: "Voice Recording",
    title: "Record & Organize",
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

  // One decorative loop per page: silent, no controls, and clipped to the
  // media frame's rounded corners by the frame's own overflow rule. All three
  // are created up front (hooks cannot be called conditionally) so a swipe
  // shows the next clip immediately instead of loading it mid-transition.
  const firstPlayer = useVideoPlayer(pageVideos[0], loopSilently);
  const secondPlayer = useVideoPlayer(pageVideos[1], loopSilently);
  const thirdPlayer = useVideoPlayer(pageVideos[2], loopSilently);
  const pagePlayers = [firstPlayer, secondPlayer, thirdPlayer];

  // Only the visible page plays; the other two would otherwise sit there
  // decoding frames nobody can see. Leaving a page also rewinds it, so every
  // page opens on the clip's first frame rather than resuming halfway through
  // — and the rewind happens while that page is hidden, so it never shows.
  useEffect(() => {
    [firstPlayer, secondPlayer, thirdPlayer].forEach((player, index) => {
      if (index === page - 1) {
        player.play();
      } else {
        player.pause();
        player.currentTime = 0;
      }
    });
  }, [firstPlayer, page, secondPlayer, thirdPlayer]);

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
      duration: reduceMotion ? 120 : 300,
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
        duration: reduceMotion ? 180 : 440,
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
        <VideoView
          accessibilityLabel={`Onboarding page ${page} video`}
          contentFit="cover"
          nativeControls={false}
          player={pagePlayers[page - 1]}
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
