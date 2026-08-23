import { useVideoPlayer, VideoView } from "expo-video";
import type { VideoSource } from "expo-video";
import { StyleSheet } from "react-native";

export function OnboardingVideo({
  accessibilityLabel,
  source,
}: {
  accessibilityLabel: string;
  source: VideoSource;
}) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.playbackRate = 0.5;
    instance.play();
  });

  return (
    <VideoView
      accessibilityLabel={accessibilityLabel}
      contentFit="cover"
      nativeControls={false}
      player={player}
      style={styles.video}
    />
  );
}

const styles = StyleSheet.create({
  video: { flex: 1 },
});
