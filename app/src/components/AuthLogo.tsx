import { Image, Text, View } from "react-native";

const PRIMARY = "#4B71C4";

export function AuthLogo() {
  return (
    <View style={{ alignItems: "center", marginBottom: 32 }}>
      <View style={{
        alignItems: "center", backgroundColor: PRIMARY, borderRadius: 24,
        height: 64, justifyContent: "center", marginBottom: 14, width: 64,
        shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
      }}>
        <Image
          source={require("../../assets/logo-l.png")}
          style={{ height: 50, width: 50 }}
          resizeMode="contain"
        />
      </View>
      <Text style={{ color: "#161B2E", fontSize: 26, fontWeight: "700", letterSpacing: -0.5 }}>QuickVoice</Text>
      <Text style={{ color: "#7B8299", fontSize: 14, lineHeight: 20, marginTop: 4, textAlign: "center" }}>
        Real-time AI interpretation
      </Text>
    </View>
  );
}
