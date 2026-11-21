// Explanations stay out of the way: an info icon, the text only on tap.
// InfoButton is the icon alone (next to a heading; the owner shows the
// text), InfoNote the icon with its text for places without a heading.

import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Info } from "lucide-react-native";

import { Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import { Icon } from "./Icon";

export interface InfoButtonProps {
  open: boolean;
  onPress: () => void;
  /** What the explanation is about, for the accessibility label. */
  topic?: string;
}

export const InfoButton = ({ open, onPress, topic }: InfoButtonProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const action = open ? t("ui.info.hide") : t("ui.info.show");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={topic ? `${topic}: ${action}` : action}
      accessibilityState={{ expanded: open }}
      hitSlop={12}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Icon
        icon={Info}
        size={20}
        color={open ? colors.text : colors.textSecondary}
      />
    </Pressable>
  );
};

/** The revealed explanation (fades in). */
export const InfoText = ({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Animated.View entering={FadeIn.duration(160)} style={style}>
      <Text style={[Type.footnote, { color: colors.textSecondary }]}>
        {children}
      </Text>
    </Animated.View>
  );
};

export interface InfoNoteProps {
  text: string;
  /** Short line that stays visible (a value, a status); icon to its right. */
  label?: string;
  topic?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Info icon that unfolds its text: beside the icon, or below a `label`
 * that stays visible.
 */
export const InfoNote = ({ text, label, topic, style }: InfoNoteProps) => {
  const colors = useThemeStore((state) => state.colors);
  const [open, setOpen] = useState(false);
  if (label) {
    return (
      <View style={[styles.labelled, style]}>
        <View style={styles.labelRow}>
          <Text
            style={[
              Type.footnote,
              styles.label,
              { color: colors.textSecondary },
            ]}
          >
            {label}
          </Text>
          <InfoButton
            open={open}
            topic={topic}
            onPress={() => setOpen((value) => !value)}
          />
        </View>
        {open ? <InfoText>{text}</InfoText> : null}
      </View>
    );
  }
  return (
    <View style={[styles.note, style]}>
      <InfoButton
        open={open}
        topic={topic}
        onPress={() => setOpen((value) => !value)}
      />
      {open ? <InfoText style={styles.noteText}>{text}</InfoText> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.5,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  labelled: {
    gap: 6,
    paddingHorizontal: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  label: {
    flex: 1,
  },
  noteText: {
    flex: 1,
    // Optically centres the first line on the 20 pt icon.
    paddingTop: 1,
  },
});
