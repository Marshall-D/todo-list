// app/components/AppModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Text,
  TouchableOpacity,
  View,
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
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

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
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const isSuccess = type === "success";
  const isError = type === "error";
  const isInfo = type === "info";
  const isConfirm = type === "confirm";

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

  const iconName = isSuccess
    ? "checkmark"
    : isInfo
      ? "information-circle"
      : isError
        ? "close"
        : "alert-circle";

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
          className="w-full bg-brand-white dark:bg-brand-success rounded-2xl p-6 items-center shadow-lg"
        >
          <View
            className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${
              isSuccess ? "bg-brand-successLight" : "bg-brand-pink"
            }`}
          >
            <Ionicons name={iconName as any} size={36} color={iconColor} />
          </View>

          <Text className="text-xl font-JakartaSemiBold text-brand-darkBlue dark:text-brandDark-text text-center mb-2">
            {defaultTitle}
          </Text>

          <Text className="text-sm text-brand-textGray dark:text-brandDark-textMuted text-center mb-6">
            {defaultMessage}
          </Text>

          {isConfirm ? (
            <View className="w-full flex-row gap-3">
              <TouchableOpacity
                onPress={onCancel}
                className="flex-1 py-3 rounded-xl border-2 border-brand-border bg-brand-white dark:bg-brandDark-surface items-center"
              >
                <Text className="font-JakartaSemiBold text-center text-brand-textDark dark:text-brandDark-text">
                  {cancelLabel ?? "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onConfirm}
                className="flex-1 py-3 rounded-xl bg-brand-primary items-center"
              >
                <Text className="text-center text-white font-JakartaSemiBold">
                  {confirmLabel ?? "Confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onClose}
              className="w-full py-3 rounded-xl bg-brand-primary items-center"
            >
              <Text className="text-center text-white font-JakartaSemiBold">
                {continueLabel ?? "Continue"}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
