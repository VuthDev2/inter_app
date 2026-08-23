import { useMemo } from "react";
import { PanResponder } from "react-native";

/**
 * Edge swipe-back: dragging right from within 24px of the left edge, by more
 * than 80px, triggers onBack. Pass undefined to disable (no gesture is set).
 */
export function useSwipeBack(onBack?: () => void) {
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (event, gesture) =>
          !!onBack && event.nativeEvent.pageX < 24 && gesture.dx > 10 && Math.abs(gesture.dy) < 40,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx > 80) onBack?.();
        },
      }).panHandlers,
    [onBack],
  );
}
