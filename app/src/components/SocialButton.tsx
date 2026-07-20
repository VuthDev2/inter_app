import { Image, Pressable, Text } from "react-native";

const TEXT = "#161B2E";
const INPUT_BG = "#F7F8FB";
const BORDER = "#DDE1EF";

export function SocialButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        alignItems: "center" as const,
        backgroundColor: INPUT_BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        flex: 1,
        flexDirection: "row" as const,
        gap: 8,
        justifyContent: "center" as const,
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }, pressed && { backgroundColor: "#EEE" }]}
    >
      <Image source={require("../../assets/google.png")} style={{ height: 19, width: 19 }} resizeMode="contain" />
      <Text style={{ color: TEXT, fontSize: 14, fontWeight: "600" }}>Continue with Google</Text>
    </Pressable>
  );
}
