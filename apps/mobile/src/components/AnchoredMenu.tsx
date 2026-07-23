import { Ionicons } from "@expo/vector-icons";
import { type ReactNode, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";

export type AnchoredMenuItem = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type Anchor = { x: number; y: number; width: number; height: number };

export function AnchoredMenu({
  children,
  containerStyle,
  items,
  width = 220,
}: {
  children: (open: () => void) => ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  items: AnchoredMenuItem[];
  width?: number;
}) {
  const anchorRef = useRef<View>(null);
  const reveal = useRef(new Animated.Value(0)).current;
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const open = () => {
    anchorRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      reveal.setValue(0);
      setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
      requestAnimationFrame(() => {
        Animated.spring(reveal, {
          damping: 15,
          mass: 0.62,
          stiffness: 315,
          toValue: 1,
          useNativeDriver: true,
        }).start();
      });
    });
  };

  const close = (afterClose?: () => void) => {
    Animated.timing(reveal, {
      duration: 145,
      easing: Easing.inOut(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setAnchor(null);
      afterClose?.();
    });
  };

  const menuHeight = items.length * 48 + 8;
  const left = anchor
    ? Math.max(12, Math.min(screenWidth - width - 12, anchor.x + anchor.width - width))
    : 12;
  const preferredTop = anchor ? anchor.y + anchor.height + 7 : 12;
  const top = anchor && preferredTop + menuHeight > screenHeight - 18
    ? Math.max(18, anchor.y - menuHeight - 7)
    : preferredTop;
  const opensFromRight = anchor ? anchor.x + anchor.width / 2 >= left + width / 2 : true;

  return (
    <>
      <View collapsable={false} ref={anchorRef} style={containerStyle}>
        {children(open)}
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => close()}
        transparent
        visible={anchor !== null}
      >
        <Pressable onPress={() => close()} style={styles.dismissArea}>
          <Animated.View
            style={[
              styles.menu,
              {
                left,
                opacity: reveal,
                top,
                transform: [
                  { translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [opensFromRight ? 16 : -16, 0] }) },
                  { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
                  { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] }) },
                ],
                width,
              },
            ]}
          >
            {items.map((item, index) => {
              const itemStart = Math.min(0.5, 0.18 + index * 0.1);
              return (
                <Animated.View
                  key={item.key}
                  style={{
                    opacity: reveal.interpolate({ inputRange: [itemStart, 1], outputRange: [0, 1], extrapolate: "clamp" }),
                    transform: [{ translateY: reveal.interpolate({ inputRange: [itemStart, 1], outputRange: [-5, 0], extrapolate: "clamp" }) }],
                  }}
                >
                  <Pressable
                    accessibilityRole="menuitem"
                    disabled={item.disabled}
                    onPress={(event) => {
                      event.stopPropagation();
                      close(item.onPress);
                    }}
                    style={({ pressed }) => [
                      styles.item,
                      index < items.length - 1 && styles.itemBorder,
                      pressed && styles.itemPressed,
                      item.disabled && styles.itemDisabled,
                    ]}
                  >
                    {item.icon ? <Ionicons color="#4D5562" name={item.icon} size={18} /> : null}
                    <Text style={[styles.label, item.selected && styles.labelSelected]}>{item.label}</Text>
                    {item.selected ? <Ionicons color="#007AFF" name="checkmark" size={17} /> : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dismissArea: { flex: 1 },
  item: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 48, paddingHorizontal: 14 },
  itemBorder: { borderBottomColor: "#E6E8EC", borderBottomWidth: StyleSheet.hairlineWidth },
  itemDisabled: { opacity: 0.38 },
  itemPressed: { backgroundColor: "#F0F2F5" },
  label: { color: "#20242B", flex: 1, fontSize: 15, fontWeight: "500" },
  labelSelected: { color: "#007AFF", fontWeight: "600" },
  menu: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderColor: "#E3E6EA",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingVertical: 4,
    position: "absolute",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
  },
});
