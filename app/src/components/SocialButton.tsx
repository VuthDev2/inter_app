import { ActivityIndicator, Image, Pressable, Text } from "react-native";

const TEXT = "#161B2E";
const INPUT_BG = "#F7F8FB";
const BORDER = "#DDE1EF";

export function SocialButton({ onPress, loading }: { onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [{
        alignItems: "center" as const,
        backgroundColor: loading ? "#F0F2F7" : INPUT_BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        flex: 1,
        flexDirection: "row" as const,
        gap: 10,
        justifyContent: "center" as const,
        minHeight: 50,
        opacity: loading ? 0.7 : 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }, pressed && !loading && { backgroundColor: "#EEE" }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#4B71C4" />
      ) : (
        <Image source={require("../../assets/google.png")} style={{ height: 20, width: 20 }} resizeMode="contain" />
      )}
      <Text style={{ color: TEXT, fontSize: 15, fontWeight: "600" }}>
        {loading ? "Connecting to Google..." : "Continue with Google"}
      </Text>
    </Pressable>
  );
}
