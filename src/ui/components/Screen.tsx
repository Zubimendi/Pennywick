import React, { ReactNode } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

export interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  scrollViewProps?: Omit<ScrollViewProps, 'style' | 'contentContainerStyle'>;
}

export function Screen({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  edges = ['top', 'left', 'right'],
  scrollViewProps,
}: ScreenProps): React.JSX.Element {
  const { colors, space } = useTheme();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.bg,
  };

  const defaultContentStyle: ViewStyle = {
    paddingHorizontal: space.lg,
    paddingBottom: space.huge,
  };

  return (
    <SafeAreaView edges={edges} style={[containerStyle, style]}>
      {scrollable ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[defaultContentStyle, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, defaultContentStyle, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
