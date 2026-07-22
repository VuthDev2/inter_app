import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Poppins_800ExtraBold, useFonts } from "@expo-google-fonts/poppins";
import type { ComponentProps, ReactNode } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextStyle,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const authColors = {
  border: "#D9D9D9",
  dark: "#282C34",
  muted: "#858585",
  blue: "#4F99EB",
};

export function AuthScreenLayout({
  children,
  description,
  footer,
  title,
  titleStyle,
  titleVariant = "default",
  topSpacing = "regular",
}: {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  title: ReactNode;
  titleStyle?: StyleProp<TextStyle>;
  titleVariant?: "default" | "password";
  topSpacing?: "compact" | "regular";
}) {
  const { height, width } = useWindowDimensions();
  useFonts({ Poppins_800ExtraBold });
  const contentWidth = Math.min(width - (width <= 350 ? 32 : 44), 390);
  const topSpace = topSpacing === "compact"
    ? Math.max(34, Math.min(92, height * 0.085))
    : Math.max(64, Math.min(140, height * 0.14));

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: topSpace }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { maxWidth: contentWidth }]}>
            <View style={[
              styles.titleContainer,
              titleVariant === "password" && styles.passwordTitleContainer,
            ]}>
              <Text style={[
                styles.title,
                titleVariant === "password" && styles.passwordTitle,
                titleVariant === "password" && width <= 350 && styles.passwordTitleSmall,
                titleStyle,
              ]}>
                {title}
              </Text>
            </View>
            {description ? <Text style={styles.description}>{description}</Text> : null}
            {children}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const AuthPageLayout = AuthScreenLayout;

export function AuthTextField({
  icon,
  onChangeText,
  onToggleSecure,
  placeholder,
  secureTextEntry,
  value,
  keyboardType,
}: {
  icon?: ComponentProps<typeof Ionicons>["name"];
  keyboardType?: "default" | "email-address";
  onChangeText: (value: string) => void;
  onToggleSecure?: () => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  const [focused, setFocused] = React.useState(false);
  const isActive = focused || (value && value.length > 0);
  const anim = React.useRef(new Animated.Value(isActive ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: isActive ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isActive, anim]);

  const labelTranslateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -27] });
  const labelScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] });

  return (
    <View style={styles.fieldShell}>
      {icon ? <Ionicons name={icon} size={19} color={authColors.muted} /> : null}
      <View style={styles.inputContainer}>
        <Animated.Text
          numberOfLines={1}
          pointerEvents="none"
          style={[
            styles.floatingLabel,
            { transform: [{ translateY: labelTranslateY }, { scale: labelScale }] },
          ]}
        >
          {placeholder}
        </Animated.Text>
        <TextInput
          autoCapitalize={keyboardType === "email-address" ? "none" : "none"}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={isActive ? "" : ""}
          placeholderTextColor={authColors.muted}
          secureTextEntry={secureTextEntry}
          style={styles.fieldText}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {onToggleSecure ? (
        <Pressable
          accessibilityLabel={secureTextEntry ? "Show password" : "Hide password"}
          hitSlop={10}
          onPress={onToggleSecure}
        >
          <Ionicons
            name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
            size={22}
            color="#B5B5B5"
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SocialAuthButtons() {
  return (
    <View style={styles.socialRow}>
      <SocialButton
        icon="logo-google"
        iconColor="#4285F4"
        label="Google"
        onPress={() => Alert.alert("Google sign-in", "Google OAuth will open here.")}
      />
      <SocialButton
        icon="logo-facebook"
        iconColor="#1877F2"
        label="Facebook"
        onPress={() => Alert.alert("Facebook sign-in", "Facebook OAuth will open here.")}
      />
    </View>
  );
}

export function AuthDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.divider} />
      <Text style={styles.dividerText}>Continue with</Text>
      <View style={styles.divider} />
    </View>
  );
}

function SocialButton({
  icon,
  iconColor,
  label,
  onPress,
}: {
  icon: "logo-google" | "logo-facebook";
  iconColor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.socialButton, pressed && styles.socialPressed]}
    >
      <Ionicons name={icon} size={26} color={iconColor} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        numberOfLines={1}
        style={styles.socialText}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", flexGrow: 1, width: "100%" },
  description: {
    color: authColors.muted,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  divider: { backgroundColor: "#E2E2E2", flex: 1, height: StyleSheet.hairlineWidth },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: 10, marginVertical: 20 },
  dividerText: { color: "#B4B4B4", fontFamily: "Poppins_400Regular", fontSize: 12 },
  fieldShell: {
    alignItems: "center",
    borderColor: authColors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  fieldText: {
    color: authColors.dark,
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    paddingVertical: 0,
  },
  flex: { flex: 1 },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
    minHeight: 32,
    paddingBottom: 10,
    paddingTop: 34,
  },
  safeArea: { backgroundColor: "#FFFFFF", flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 16, paddingHorizontal: 16 },
  socialButton: {
    alignItems: "center",
    borderColor: authColors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 8,
  },
  socialPressed: { backgroundColor: "#F5F5F5" },
  socialRow: { flexDirection: "row", gap: 14 },
  socialText: {
    color: "#151515",
    flexShrink: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    paddingHorizontal: 3,
  },
  title: {
    color: "#050505",
    fontFamily: "Poppins_700Bold",
    fontSize: 40,
    letterSpacing: 0.4,
    lineHeight: 48,
    textAlign: "center",
  },
  titleContainer: { justifyContent: "center", minHeight: 48 },
  passwordTitle: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 48,
    letterSpacing: 0.48,
    lineHeight: 60,
    textAlign: "left",
  },
  passwordTitleContainer: { alignItems: "flex-start", minHeight: 120 },
  passwordTitleSmall: { fontSize: 42, letterSpacing: 0.42, lineHeight: 52 },
  inputContainer: { flex: 1, position: "relative", paddingTop: 10 },
  floatingLabel: {
    backgroundColor: "#FFFFFF",
    color: authColors.muted,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 5,
    position: "absolute",
    left: -5,
    top: 17,
    zIndex: 1,
  },
});
