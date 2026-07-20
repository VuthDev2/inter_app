import { Text, TextInput, TextInputProps, View } from "react-native";

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

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
} & Partial<TextInputProps>;

export function FormField({ label, value, onChangeText, ...props }: FormFieldProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
        {label}
      </Text>
      <TextInput
        {...props}
        onChangeText={onChangeText}
        placeholderTextColor={MUTED}
        style={inputStyle}
        value={value}
      />
    </View>
  );
}
