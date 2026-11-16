import React, { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { space } from '../theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scaleTo?: number;
  hitSlop?: number;
}

export function Press({
  children,
  onPress,
  style,
  haptic = true,
  scaleTo = 0.97,
  hitSlop = space.sm,
  disabled,
  accessibilityRole = 'button',
  ...rest
}: PressProps): React.JSX.Element {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (): void => {
    if (!reduceMotion && !disabled) {
      scale.value = withSpring(scaleTo, { damping: 20, stiffness: 400 });
    }
  };

  const handlePressOut = (): void => {
    if (!reduceMotion && !disabled) {
      scale.value = withSpring(1, { damping: 16, stiffness: 300 });
    }
  };

  const handlePress = (event: Parameters<NonNullable<PressableProps['onPress']>>[0]): void => {
    if (disabled) return;
    if (haptic) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={hitSlop}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
