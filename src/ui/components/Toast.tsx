import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { useUiStore } from '../theme/uiStore';
import { Press } from './Press';

export interface ToastProps {
  style?: StyleProp<ViewStyle>;
}

export function Toast({ style }: ToastProps): React.JSX.Element | null {
  const { colors, space, radius, type, hit } = useTheme();
  const activeToast = useUiStore((state) => state.activeToast);
  const hideToast = useUiStore((state) => state.hideToast);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (activeToast) {
      opacity.value = withTiming(1, { duration: 180 });
      translateY.value = withSpring(0, { damping: 16, stiffness: 200 });

      const duration = activeToast.durationMs ?? 5000;
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 180 });
        translateY.value = withTiming(20, { duration: 180 });
        setTimeout(hideToast, 180);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      opacity.value = 0;
      translateY.value = 20;
    }
  }, [activeToast, hideToast, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!activeToast) {
    return null;
  }

  const handleAction = (): void => {
    activeToast.onAction?.();
    hideToast();
  };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          bottom: space.xl,
          left: space.lg,
          right: space.lg,
        },
        animatedStyle,
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.container,
          {
            minHeight: hit.min,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderColor: colors.border,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            gap: space.md,
          },
        ]}
      >
        <Text
          style={[styles.message, type.body, { color: colors.text }]}
          numberOfLines={2}
        >
          {activeToast.message}
        </Text>
        {activeToast.actionLabel ? (
          <Press
            onPress={handleAction}
            style={[
              styles.actionButton,
              {
                paddingHorizontal: space.sm,
                paddingVertical: space.xs,
              },
            ]}
          >
            <Text
              style={[
                type.label,
                { color: colors.primary, fontWeight: '700' },
              ]}
            >
              {activeToast.actionLabel}
            </Text>
          </Press>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    zIndex: 9999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  message: {
    flex: 1,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
