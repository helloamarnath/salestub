import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// Lazy-load Firebase to avoid crashes in Expo Go
let auth: any = null;
let database: any = null;
try {
  auth = require('@react-native-firebase/auth').default;
  database = require('@react-native-firebase/database').default;
} catch {
  console.warn('Firebase native modules not available. Location tracking to Firebase disabled.');
}

const LOCATION_TASK_NAME = 'VISIT_LOCATION_TRACKING';
const MIN_DISTANCE_METERS = 50; // Only send if moved > 50m
const MIN_TIME_SECONDS = 15; // Don't send more than once per 15s
const MAX_ACCURACY_METERS = 50; // Skip bad GPS readings

interface LocationTrackerState {
  visitId: string | null;
  orgId: string | null;
  lastSentLocation: { lat: number; lng: number; timestamp: number } | null;
  isTracking: boolean;
}

const state: LocationTrackerState = {
  visitId: null,
  orgId: null,
  lastSentLocation: null,
  isTracking: false,
};

/**
 * Authenticate with Firebase using custom token from backend
 */
export async function authenticateFirebase(customToken: string): Promise<void> {
  if (!auth) return;
  try {
    await auth().signInWithCustomToken(customToken);
  } catch (error) {
    console.warn('Firebase auth failed:', error);
  }
}

/**
 * Calculate distance between two GPS points in meters (Haversine formula)
 */
function distanceInMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Write location to Firebase RTDB (called by background task or foreground)
 */
export async function sendLocationToFirebase(
  lat: number,
  lng: number,
  accuracy: number | null,
  speed: number | null,
  heading: number | null,
): Promise<void> {
  if (!state.visitId || !state.orgId) return;

  // Smart tracking: skip bad GPS
  if (accuracy && accuracy > MAX_ACCURACY_METERS) return;

  // Smart tracking: skip if not moved enough
  if (state.lastSentLocation) {
    const dist = distanceInMeters(
      state.lastSentLocation.lat,
      state.lastSentLocation.lng,
      lat,
      lng,
    );
    const timeDiff = (Date.now() - state.lastSentLocation.timestamp) / 1000;

    if (dist < MIN_DISTANCE_METERS && timeDiff < MIN_TIME_SECONDS) return;
  }

  const now = Date.now();

  if (!database) return;

  try {
    const ref = database().ref(`orgs/${state.orgId}/visits/${state.visitId}/lastLocation`);
    await ref.set({
      lat,
      lng,
      accuracy: accuracy ?? null,
      speed: speed ?? null,
      heading: heading ?? null,
      timestamp: now,
    });

    state.lastSentLocation = { lat, lng, timestamp: now };
  } catch (error) {
    console.warn('Failed to write location to Firebase:', error);
  }
}

/**
 * Start tracking location for a visit
 */
export async function startLocationTracking(
  visitId: string,
  orgId: string,
  firebaseToken: string | null,
): Promise<void> {
  if (state.isTracking) {
    console.warn('Location tracking already active');
    return;
  }

  // Authenticate with Firebase
  if (firebaseToken) {
    await authenticateFirebase(firebaseToken);
  }

  state.visitId = visitId;
  state.orgId = orgId;
  state.lastSentLocation = null;
  state.isTracking = true;

  // Request permissions
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    console.warn('Foreground location permission denied');
    return;
  }

  // Try background permission (optional — foreground still works)
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus === 'granted') {
    // Start background location tracking
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 30, // meters
      timeInterval: 15000, // 15 seconds
      foregroundService: {
        notificationTitle: 'Visit in progress',
        notificationBody: 'Tracking your location during the customer visit',
        notificationColor: '#3b82f6',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  } else {
    // Fallback: foreground-only tracking with watchPositionAsync
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 30,
        timeInterval: 15000,
      },
      (location) => {
        sendLocationToFirebase(
          location.coords.latitude,
          location.coords.longitude,
          location.coords.accuracy,
          location.coords.speed,
          location.coords.heading,
        );
      },
    );
  }
}

/**
 * Stop tracking location
 */
export async function stopLocationTracking(): Promise<void> {
  state.visitId = null;
  state.orgId = null;
  state.lastSentLocation = null;
  state.isTracking = false;

  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch {
    // Task may not be registered
  }

  // Sign out of Firebase
  if (auth) {
    try {
      await auth().signOut();
    } catch {
      // Ignore
    }
  }
}

/**
 * Check if currently tracking
 */
export function isTrackingActive(): boolean {
  return state.isTracking;
}

/**
 * Get current visit ID being tracked
 */
export function getActiveTrackingVisitId(): string | null {
  return state.visitId;
}
