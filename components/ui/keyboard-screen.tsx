import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Mode = 'form' | 'chat';

interface KeyboardScreenProps {
  /** Screen content. */
  children: ReactNode;
  /**
   * - `form`  — multi-field forms; wraps content in a ScrollView with
   *             keyboardShouldPersistTaps="handled" so the user can dismiss
   *             the keyboard by tapping outside without losing focus on
   *             other inputs.
   * - `chat`  — a screen that owns its own scroll (typically an inverted
   *             FlatList of messages with the composer pinned at the bottom).
   *             We just wrap with KeyboardAvoidingView and let the screen
   *             render its own layout inside.
   */
  mode?: Mode;
  /**
   * Distance in pts the navigation header occupies above the keyboard-aware
   * region. Used as `keyboardVerticalOffset` on iOS. Defaults to 56 which
   * matches the default Expo Router stack header height.
   */
  headerHeight?: number;
  /**
   * Override style on the outer container.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Style applied to the inner ScrollView's contentContainer when mode='form'.
   */
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /**
   * Extra ScrollView props for mode='form' (e.g. refreshControl).
   */
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'keyboardShouldPersistTaps'>;
}

/**
 * Single canonical wrapper for screens with TextInput. Replaces ad-hoc
 * `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>`
 * patterns scattered across the app, which silently break on Android because
 * `behavior=undefined` is a no-op there.
 *
 * Usage:
 *   <KeyboardScreen>
 *     <TextInput ... />
 *     <TextInput ... />
 *   </KeyboardScreen>
 *
 *   <KeyboardScreen mode="chat" headerHeight={64}>
 *     <FlatList inverted ... />
 *     <Composer />
 *   </KeyboardScreen>
 *
 * Why both behavior values:
 *   - iOS: `padding` is the right behavior — it pads the bottom so content
 *     stays above the keyboard.
 *   - Android: `height` is the right behavior — it shrinks the
 *     KeyboardAvoidingView height so a ScrollView inside can scroll the
 *     focused input into view. (`padding` causes layout flicker on Android,
 *     `undefined` does nothing.)
 */
export function KeyboardScreen({
  children,
  mode = 'form',
  headerHeight = 56,
  style,
  contentContainerStyle,
  scrollViewProps,
}: KeyboardScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={
        Platform.OS === 'ios' ? headerHeight + insets.top : 0
      }
      style={[styles.flex, style]}
    >
      {mode === 'form' ? (
        <ScrollView
          {...scrollViewProps}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.formContent,
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  formContent: { flexGrow: 1 },
});
