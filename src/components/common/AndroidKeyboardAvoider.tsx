// AndroidKeyboardAvoider - keeps a scroll view above the software keyboard
// on Android. With edge-to-edge (enforced from Android 15) adjustResize no
// longer shrinks the window, so a ScrollView keeps its height and a focused
// input near the bottom ends up behind the keyboard. Wrapping it here
// shrinks it instead; Android's ScrollView then scrolls the focused input
// into view. iOS gets the children unchanged (scroll views there use
// automaticallyAdjustKeyboardInsets), so a ScrollView stays the screen's
// first subview for the collapsing large title.

import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useHeaderHeight } from "expo-router/react-navigation";

interface AndroidKeyboardAvoiderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const AndroidKeyboardAvoider = ({
  children,
  enabled = true,
}: AndroidKeyboardAvoiderProps) => {
  if (Platform.OS !== "android" || !enabled) return <>{children}</>;
  return <AvoidingView>{children}</AvoidingView>;
};

const AvoidingView = ({ children }: { children: React.ReactNode }) => {
  // KeyboardAvoidingView compares its own frame (relative to the screen
  // below the native header) with the keyboard's screen position.
  const headerHeight = useHeaderHeight();
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
      style={styles.flex}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
