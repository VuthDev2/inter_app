import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  type GestureResponderHandlers,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../ui";
import { colors, spacing } from "../../theme/theme";

type OnboardingPageLayoutProps = {
  title: string;
  titleLead?: string;
  description: string;
  page: 1 | 2 | 3;
  onContinue: () => void;
  media?: ReactNode;
  buttonLabel?: string;
  featureHeading?: string;
  showLogo?: boolean;
  activeIndicatorColor?: string;
  contentAnimationStyle?: StyleProp<ViewStyle>;
  indicator?: ReactNode;
  panHandlers?: GestureResponderHandlers;
  transitionDisabled?: boolean;
};

export function OnboardingPageLayout({
  title,
  titleLead,
  description,
  page,
  onContinue,
  media,
  buttonLabel = "Get started",
  featureHeading,
  showLogo = true,
  activeIndicatorColor = "#111214",
  contentAnimationStyle,
  indicator,
  panHandlers,
  transitionDisabled = false,
}: OnboardingPageLayoutProps) {
  const { height, width } = useWindowDimensions();
  const horizontalPadding = width <= 350 ? 18 : spacing.lg;
  const contentWidth = Math.min(width - horizontalPadding * 2, 390);
  const mediaWidth = Math.min(contentWidth, Math.max(208, (height - 300) * 0.75));
  const tallScreenFill = Math.max(0, Math.min(48, (height - 850) * 2));
  const mediaHeight = mediaWidth * (4 / 3) + tallScreenFill - 30 + (featureHeading ? 6 : 0);
  const compact = height < 700;
  const copyMinHeight = width <= 350
    ? (featureHeading ? 81 : 112)
    : (featureHeading ? 90 : 126);
  const pageContent = (
    <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            minHeight: Math.max(0, height - 44),
            paddingBottom: 150,
            paddingHorizontal: horizontalPadding,
            paddingTop: compact ? spacing.sm : spacing.md,
          },
        ]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { maxWidth: contentWidth }]}> 
          <Animated.View style={[styles.animatedContent, contentAnimationStyle]}>
            <View style={styles.topSection}>
            {featureHeading ? (
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                numberOfLines={1}
                style={[styles.featureHeading, width <= 350 && styles.featureHeadingSmall]}
              >
                {featureHeading}
              </Text>
            ) : null}

            <View
              style={[
                styles.mediaWrap,
                featureHeading && styles.mediaWrapWithHeading,
                { height: mediaHeight, width: mediaWidth },
              ]}
            >
              <View style={styles.mediaPlaceholder}>{media}</View>
              {showLogo ? (
                <View style={styles.logoWrap}>
                  <Image
                    accessibilityLabel="QuickVoice logo"
                    resizeMode="contain"
                    source={require("../../../assets/app-icon.png")}
                    style={styles.logo}
                  />
                </View>
              ) : null}
            </View>
            </View>

            <View
              style={[
                styles.copy,
                { minHeight: copyMinHeight },
                compact && styles.copyCompact,
                featureHeading && styles.copyWithHeading,
              ]}
            >
              <View style={styles.copyItem}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                  numberOfLines={2}
                  style={[
                    styles.title,
                    width <= 350 && styles.titleSmall,
                  ]}
                >
                  {titleLead ? (
                    <>
                      <Text
                        style={[
                          styles.titleLead,
                          width <= 350 && styles.titleLeadSmall,
                        ]}
                      >
                        {titleLead}
                      </Text>
                      {"\n"}
                      {title}
                    </>
                  ) : title}
                </Text>
              </View>
              <View
                style={[
                  styles.copyItem,
                  { minHeight: width <= 350 ? 34 : 36 },
                ]}
              >
                <Text style={[styles.description, width <= 350 && styles.descriptionSmall]}>
                  {description}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea} {...panHandlers}>
      {pageContent}
      <View style={[styles.fixedActions, { maxWidth: contentWidth }]}>
        <View
          style={[
            styles.footer,
            { paddingHorizontal: width <= 350 ? spacing.sm : spacing.lg },
          ]}
        >
          <AnimatedOnboardingButton
            disabled={transitionDisabled}
            label={buttonLabel}
            onPress={onContinue}
          />
        </View>
        <View style={styles.indicatorSlot}>
          {indicator ?? (
            <AnimatedOnboardingIndicator
              activeColor={activeIndicatorColor}
              activePage={page}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function AnimatedOnboardingButton({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  const motion = useRef(new Animated.Value(1)).current;
  const running = useRef(false);
  const committed = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  const handlePressIn = () => {
    if (disabled || running.current) return;
    running.current = true;
    committed.current = false;
    motion.setValue(1);
    Animated.timing(motion, {
      duration: reduceMotion ? 70 : 85,
      toValue: reduceMotion ? 0.72 : 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!running.current || committed.current) return;
    committed.current = true;
    Animated.timing(motion, {
      duration: reduceMotion ? 70 : 125,
      toValue: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      running.current = false;
      if (finished) onPress();
    });
  };

  const handlePressOut = () => {
    setTimeout(() => {
      if (!running.current || committed.current) return;
      Animated.timing(motion, {
        duration: reduceMotion ? 70 : 125,
        toValue: 1,
        useNativeDriver: true,
      }).start(() => {
        running.current = false;
      });
    }, 0);
  };

  return (
    <Animated.View
      style={reduceMotion ? { opacity: motion } : { transform: [{ scale: motion }] }}
    >
      <PrimaryButton
        disabled={disabled}
        dimWhenDisabled={false}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        tone="dark"
      >
        {label}
      </PrimaryButton>
    </Animated.View>
  );
}

export function AnimatedOnboardingIndicator({
  activePage,
  activeColor = "#111214",
  reduceMotion = false,
}: {
  activePage: 1 | 2 | 3;
  activeColor?: string;
  reduceMotion?: boolean;
}) {
  const { width } = useWindowDimensions();
  const responsiveProgress = Math.max(0, Math.min(1, (width - 320) / 110));
  const dotSize = 7 + responsiveProgress;
  const pillWidth = 26 + responsiveProgress * 2;
  const itemGap = 8 + responsiveProgress;
  const trackWidth = pillWidth + dotSize * 2 + itemGap * 2;
  const progress = useRef(new Animated.Value(activePage - 1)).current;

  useEffect(() => {
    const nextPosition = activePage - 1;
    if (reduceMotion) {
      progress.setValue(nextPosition);
      return;
    }

    Animated.spring(progress, {
      damping: 24,
      mass: 0.8,
      stiffness: 180,
      toValue: nextPosition,
      useNativeDriver: false,
    }).start();
  }, [activePage, progress, reduceMotion]);

  const pillColor = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [activeColor, activeColor, "#4F99EB"],
  });
  const pillPosition = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, dotSize + itemGap, (dotSize + itemGap) * 2],
  });
  const dotPositions = [
    [0, 0, 0],
    [pillWidth + itemGap, dotSize + itemGap, dotSize + itemGap],
    [
      pillWidth + dotSize + itemGap * 2,
      pillWidth + dotSize + itemGap * 2,
      (dotSize + itemGap) * 2,
    ],
  ];

  return (
    <View
      accessibilityLabel={`Onboarding page ${activePage} of 3`}
      accessibilityRole="adjustable"
      style={[styles.indicatorTrack, { width: trackWidth }]}
    >
        {[1, 2, 3].map((item) => (
          <Animated.View
            key={item}
            style={[
              styles.dot,
              {
                height: dotSize,
                top: (12 - dotSize) / 2,
                transform: [{
                  translateX: progress.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: dotPositions[item - 1],
                  }),
                }],
                width: dotSize,
              },
            ]}
          />
        ))}
      <Animated.View
        style={[
          styles.activePill,
          {
            backgroundColor: pillColor,
            height: dotSize,
            top: (12 - dotSize) / 2,
            transform: [{ translateX: pillPosition }],
            width: pillWidth,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    width: "100%",
  },
  animatedContent: {
    alignItems: "center",
    width: "100%",
  },
  topSection: {
    alignItems: "center",
    width: "100%",
  },
  mediaWrap: {
    alignSelf: "center",
    marginTop: 34,
    maxWidth: "100%",
    position: "relative",
  },
  mediaWrapWithHeading: {
    marginTop: spacing.md,
  },
  featureHeading: {
    alignSelf: "flex-start",
    color: "#101114",
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 40,
    marginTop: spacing.sm,
  },
  featureHeadingSmall: {
    fontSize: 29,
    lineHeight: 35,
  },
  mediaPlaceholder: {
    backgroundColor: "#E8EBF0",
    borderColor: "#D9DDE5",
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    overflow: "hidden",
  },
  logoWrap: {
    alignItems: "center",
    backgroundColor: "#282C34",
    borderRadius: 20,
    height: 72,
    justifyContent: "center",
    left: "50%",
    marginLeft: -36,
    position: "absolute",
    top: -34,
    width: 72,
  },
  logo: {
    borderRadius: 18,
    height: 64,
    width: 64,
  },
  copy: {
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  copyCompact: {
    marginTop: spacing.md,
  },
  copyWithHeading: {
    marginTop: spacing.md,
  },
  copyItem: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    color: "#101114",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 0.36,
    lineHeight: 41,
    textAlign: "center",
  },
  titleSmall: {
    fontSize: 30,
    letterSpacing: 0.3,
    lineHeight: 35,
  },
  titleLead: {
    fontSize: 30.6,
  },
  titleLeadSmall: {
    fontSize: 25.5,
  },
  description: {
    color: "#757575",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    maxWidth: 350,
    textAlign: "center",
  },
  descriptionSmall: {
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    width: "100%",
  },
  fixedActions: {
    alignSelf: "center",
    bottom: spacing.xl,
    position: "absolute",
    width: "100%",
  },
  indicatorSlot: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 36,
    paddingBottom: spacing.xs,
  },
  indicatorTrack: {
    height: 12,
    minHeight: 12,
    position: "relative",
  },
  dot: {
    backgroundColor: "#111214",
    borderRadius: 999,
    left: 0,
    position: "absolute",
  },
  activePill: {
    backgroundColor: "#111214",
    borderRadius: 999,
    left: 0,
    position: "absolute",
    zIndex: 1,
  },
});
