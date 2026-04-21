import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Palette } from '@/constants/theme';
import { uploadVisitPhoto } from '@/lib/api/visits';
import type { VisitPhoto } from '@/types/visit';

interface VisitPhotoCaptureProps {
  visitId: string;
  token: string;
  onPhotoUploaded: (photo: VisitPhoto) => void;
  disabled?: boolean;
}

export function VisitPhotoCapture({
  visitId,
  token,
  onPhotoUploaded,
  disabled = false,
}: VisitPhotoCaptureProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  const capturePhoto = async () => {
    if (isCapturing || disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCapturing(true);

    try {
      // 1. Request camera permission
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to capture visit photos.'
        );
        setIsCapturing(false);
        return;
      }

      // 2. Request location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to geo-tag visit photos.'
        );
        setIsCapturing(false);
        return;
      }

      // 3. Launch camera (NEVER launchImageLibraryAsync)
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled) {
        setIsCapturing(false);
        return;
      }

      // 4. Get current GPS location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // 5. Upload via API
      const response = await uploadVisitPhoto(
        token,
        visitId,
        {
          uri: result.assets[0].uri,
          fileName: result.assets[0].fileName || `visit-${Date.now()}.jpg`,
          mimeType: result.assets[0].mimeType || 'image/jpeg',
        },
        {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
          altitude: loc.coords.altitude ?? undefined,
          capturedAt: new Date().toISOString(),
        }
      );

      if (response.data) {
        setLastPhoto(result.assets[0].uri);
        onPhotoUploaded(response.data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Upload Failed', 'Could not upload the photo. Please try again.');
      }
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('Error', 'Something went wrong while capturing the photo.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.captureButton, { backgroundColor: colors.primary }, disabled && styles.captureButtonDisabled]}
        onPress={capturePhoto}
        disabled={isCapturing || disabled}
        activeOpacity={0.7}
      >
        {isCapturing ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="camera" size={20} color="white" />
        )}
        <Text style={styles.captureText}>
          {isCapturing ? 'Uploading...' : 'Take Photo'}
        </Text>
      </TouchableOpacity>

      {/* Thumbnail preview of last captured photo */}
      {lastPhoto && (
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: lastPhoto }} style={styles.thumbnail} />
          <View style={styles.thumbnailBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Palette.emerald} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  thumbnailBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 1,
  },
});
