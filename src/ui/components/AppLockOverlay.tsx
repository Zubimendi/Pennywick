// src/ui/components/AppLockOverlay.tsx
// App lock overlay gate (T22).
// Renders when app lock is enabled and the app has been in background for >= 60 seconds.

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { Button } from './Button';
import { Keypad } from './Keypad';

export interface AppLockOverlayProps {
  onUnlock: () => void;
  savedPin?: string | null;
}

export function AppLockOverlay({ onUnlock, savedPin }: AppLockOverlayProps): React.JSX.Element {
  const { colors, space, type, radius } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleKeyPress = (key: string): void => {
    setError(null);
    if (key === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '.') return;
    if (pin.length >= 4) return;

    const nextPin = `${pin}${key}`;
    setPin(nextPin);

    // If 4 digits entered, verify
    if (nextPin.length === 4) {
      if (!savedPin || nextPin === savedPin) {
        onUnlock();
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    }
  };

  const handleQuickUnlock = (): void => {
    onUnlock();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, padding: space.xl }]}>
      <View style={[styles.content, { gap: space.lg }]}>
        <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}>
          <Ionicons name="lock-closed" size={48} color={colors.primary} />
        </View>

        <Text style={[type.title, { color: colors.text, textAlign: 'center' }]}>
          Pennywick is Locked
        </Text>

        <Text style={[type.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          {savedPin ? 'Enter your 4-digit PIN to continue' : 'App was in the background for over 60 seconds'}
        </Text>

        {savedPin ? (
          <View style={{ gap: space.md, alignItems: 'center' }}>
            {/* PIN Dots */}
            <View style={[styles.pinDots, { gap: space.md }]}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    {
                      borderColor: colors.primary,
                      backgroundColor: i < pin.length ? colors.primary : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>

            {error ? (
              <Text style={[type.caption, { color: colors.danger }]}>{error}</Text>
            ) : null}

            <View style={{ width: '100%', marginTop: space.md }}>
              <Keypad onKeyPress={handleKeyPress} onClear={() => setPin('')} />
            </View>
          </View>
        ) : (
          <View style={{ marginTop: space.xl, width: '100%' }}>
            <Button label="Unlock" variant="primary" onPress={handleQuickUnlock} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconBox: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
});
