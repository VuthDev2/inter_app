import { Text, View } from "react-native";

import { getFlag, type Utterance } from "../constants/data";

export function UtteranceBubble({ utterance }: { utterance: Utterance }) {
  return (
    <View style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, marginBottom: 10, padding: 12 }}>
      <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 4 }}>
        {getFlag(utterance.sourceLang)} {utterance.original}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 24 }}>
        {utterance.translation}
      </Text>
    </View>
  );
}
