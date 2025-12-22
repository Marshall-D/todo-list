// app/components/AppModal.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import colors from "../utils/themes/colors";

export type AppModalType = "success" | "error" | "info" | "confirm";

export interface AppModalProps {
  visible: boolean;
  type?: AppModalType;
  title?: string;
  message?: string;
  onClose?: () => void;
  continueLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * AppModal - small reusable modal component for success/error/info/confirm dialogs.
 *
 * - Animates scale + opacity when shown.
 * - Uses theme tokens from ThemeProvider for consistent colors.
 * - Exposes confirm/cancel handlers for confirm dialogs, and a single continue button for other types.
 */
export default function AppModal({
  visible,
  type = "info",
  title,
  message,
  onClose,
  continueLabel,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  containerStyle,
}: AppModalProps) {
  const { resolved } = useTheme();

  // Animated values (scale + opacity) for entrance/exit
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Run entrance animation when visible becomes true, reset when hidden.
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // reset values when modal hidden to allow re-run on next open
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Derived booleans for convenience
  const isSuccess = type === "success";
  const isError = type === "error";
  const isConfirm = type === "confirm";

  // Fallbacks when title/message are not supplied
  const defaultTitle = title
    ? title
    : isSuccess
      ? "Success"
      : isError
        ? "Error"
        : isConfirm
          ? "Confirm"
          : "Notice";

  const defaultMessage = message
    ? message
    : isSuccess
      ? "Operation completed successfully."
      : isError
        ? "Something went wrong."
        : isConfirm
          ? "Are you sure you want to continue?"
          : "Something to note.";

  // Icon picks per modal type
  const iconName = isSuccess
    ? "checkmark"
    : isError
      ? "close"
      : isConfirm
        ? "alert-circle"
        : "information-circle";

  // Theme-aware colors
  const bgSurface =
    resolved === "dark" ? colors.brandDark.surface : colors.brand.white;
  const textPrimary =
    resolved === "dark" ? colors.brandDark.text : colors.brand.textDark;
  const textMuted =
    resolved === "dark" ? colors.brandDark.textMuted : colors.brand.textGray;
  const borderColor =
    resolved === "dark" ? colors.brandDark.border : colors.brand.border;
  const primaryBg =
    resolved === "dark" ? colors.brandDark.primary : colors.brand.primary;

  // Icon color variations for each modal type
  const iconColor =
    resolved === "dark"
      ? isSuccess
        ? colors.brandDark.success
        : isError
          ? colors.brandDark.error
          : colors.brandDark.primaryLight
      : isSuccess
        ? colors.brand.success
        : isError
          ? colors.brand.error
          : colors.brand.primaryLight;

  // circleBg is used to give a soft colored circle behind the icon
  const circleBg = isSuccess
    ? resolved === "dark"
      ? colors.brandDark.successLight
      : colors.brand.successLight
    : colors.brand.pink;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay]}>
        <Animated.View
          style={[
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              backgroundColor: bgSurface,
            },
            styles.container,
            containerStyle as any,
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: circleBg }]}>
            <Ionicons name={iconName as any} size={36} color={iconColor} />
          </View>

          <Text style={[styles.title, { color: textPrimary }]}>
            {defaultTitle}
          </Text>

          <Text style={[styles.message, { color: textMuted }]}>
            {defaultMessage}
          </Text>

          {isConfirm ? (
            // Confirm modal layout: two buttons (Cancel / Confirm)
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={onCancel}
                style={[
                  styles.btn,
                  {
                    flex: 1,
                    borderWidth: 2,
                    borderColor,
                    backgroundColor: bgSurface,
                    marginRight: 8,
                  },
                ]}
              >
                <Text style={[styles.btnText, { color: textPrimary }]}>
                  {cancelLabel ?? "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onConfirm}
                style={[
                  styles.btn,
                  {
                    flex: 1,
                    backgroundColor: primaryBg,
                    marginLeft: 8,
                  },
                ]}
              >
                <Text style={[styles.btnText, { color: "#fff" }]}>
                  {confirmLabel ?? "Confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Informational modal layout: single continue/close button
            <TouchableOpacity
              onPress={onClose}
              style={[styles.singleBtn, { backgroundColor: primaryBg }]}
            >
              <Text style={[styles.btnText, { color: "#fff" }]}>
                {continueLabel ?? "Continue"}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  container: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    // shadow for depth (Android + iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Jakarta-SemiBold",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  singleBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontFamily: "Jakarta-SemiBold",
    fontSize: 14,
  },
});
