import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { dark } from "../theme/dark";

const WAVE_H = 72;
const N_BARS = 38;
const BAR_PX = Array.from({ length: N_BARS }, (_, i) => {
  const d = Math.abs(i - N_BARS / 2) / (N_BARS / 2);
  return Math.round(Math.max(3, Math.min(1, 0.18 + d * 0.55 + Math.sin(i * 1.7) * 0.22 + Math.sin(i * 0.9) * 0.12)) * WAVE_H);
});

export function Waveform({ active }: { active: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: false }),
        ])
      ).start();
    } else {
      anim.stopAnimation();
      anim.setValue(0);
    }
  }, [active]);

  return (
    <View style={wv.row}>
      {BAR_PX.map((h, i) => {
        const gap = i >= N_BARS / 2 - 2 && i <= N_BARS / 2 + 2;
        return (
          <View
            key={i}
            style={[wv.bar, {
              height: active ? h : Math.max(3, Math.round(h * 0.28)),
              opacity: gap ? 0 : active ? 0.85 : 0.28,
              backgroundColor: active ? dark.live : "rgba(255,255,255,0.45)",
            }]}
          />
        );
      })}
    </View>
  );
}

const wv = StyleSheet.create({
  row: { alignItems: "center", flex: 1, flexDirection: "row", gap: 2, paddingHorizontal: 4 },
  bar: { borderRadius: 99, flex: 1 },
});
