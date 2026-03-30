import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import type { VisitPurpose } from '@/types/visit';
import { VISIT_PURPOSE_LABELS } from '@/types/visit';

interface StartVisitSheetProps {
  visible: boolean;
  onClose: () => void;
  onStart: (purpose: VisitPurpose, notes?: string) => void;
  leadTitle: string;
  isLoading?: boolean;
}

const PURPOSE_OPTIONS: { value: VisitPurpose; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'PRODUCT_DEMO', label: 'Product Demo', icon: 'desktop-outline' },
  { value: 'FOLLOW_UP', label: 'Follow-up', icon: 'refresh-outline' },
  { value: 'PAYMENT_COLLECTION', label: 'Payment Collection', icon: 'cash-outline' },
  { value: 'SUPPORT', label: 'Support', icon: 'help-circle-outline' },
  { value: 'DELIVERY', label: 'Delivery', icon: 'cube-outline' },
  { value: 'NEGOTIATION', label: 'Negotiation', icon: 'chatbubbles-outline' },
  { value: 'RELATIONSHIP', label: 'Relationship', icon: 'people-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export function StartVisitSheet({
  visible,
  onClose,
  onStart,
  leadTitle,
  isLoading = false,
}: StartVisitSheetProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [selectedPurpose, setSelectedPurpose] = useState<VisitPurpose | null>(null);
  const [notes, setNotes] = useState('');

  // Reset state when sheet opens
  useEffect(() => {
    if (visible) {
      setSelectedPurpose(null);
      setNotes('');
    }
  }, [visible]);

  const bgColor = isDark ? '#1e293b' : 'white';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  const chipBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const chipSelectedBg = '#3b82f620';

  const handleStart = () => {
    if (!selectedPurpose) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStart(selectedPurpose, notes.trim() || undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: overlayColor }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: bgColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="navigate" size={20} color="#3b82f6" />
              <Text style={[styles.headerTitle, { color: textColor }]}>Start Visit</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Lead Name */}
            <Text style={[styles.leadName, { color: textColor }]} numberOfLines={1}>
              {leadTitle}
            </Text>

            {/* Purpose Picker */}
            <Text style={[styles.sectionLabel, { color: subtitleColor }]}>Visit Purpose</Text>
            <View style={styles.chipGrid}>
              {PURPOSE_OPTIONS.map((option) => {
                const isSelected = selectedPurpose === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? chipSelectedBg : chipBg,
                        borderColor: isSelected ? '#3b82f6' : 'transparent',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedPurpose(option.value);
                    }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={16}
                      color={isSelected ? '#3b82f6' : subtitleColor}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#3b82f6' : textColor },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes Input */}
            <Text style={[styles.sectionLabel, { color: subtitleColor }]}>Notes (optional)</Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: inputBg,
                  color: textColor,
                  borderColor,
                },
              ]}
              placeholder="Add notes about this visit..."
              placeholderTextColor={placeholderColor}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: subtitleColor }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startButton,
                (!selectedPurpose || isLoading) && styles.startButtonDisabled,
              ]}
              onPress={handleStart}
              disabled={!selectedPurpose || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color="white" />
                  <Text style={styles.startButtonText}>Start Visit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
