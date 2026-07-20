import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

const TEXT = "#161B2E";
const INPUT_BG = "#F7F8FB";
const BORDER = "#DDE1EF";
const MUTED = "#7B8299";

const inputStyle = {
  backgroundColor: INPUT_BG,
  borderColor: BORDER,
  borderRadius: 14,
  borderWidth: 1,
  color: TEXT,
  fontSize: 15,
  minHeight: 50,
  paddingHorizontal: 16,
  paddingVertical: 14,
} as const;

export function PasswordField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
        {label}
      </Text>
      <View style={[{ flexDirection: "row", alignItems: "center" }, inputStyle]}>
        <TextInput
          autoCapitalize="none"
          onChangeText={onChangeText}
          placeholder="Enter your password"
          placeholderTextColor={MUTED}
          secureTextEntry={!show}
          style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 0 }}
          value={value}
        />
        <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
          <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={MUTED} />
        </Pressable>
      </View>
    </View>
  );
}
