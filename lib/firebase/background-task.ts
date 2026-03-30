import * as TaskManager from 'expo-task-manager';
import { sendLocationToFirebase } from './location-tracker';

const LOCATION_TASK_NAME = 'VISIT_LOCATION_TRACKING';

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as {
      locations: Array<{
        coords: {
          latitude: number;
          longitude: number;
          accuracy: number | null;
          speed: number | null;
          heading: number | null;
        };
      }>;
    };
    const location = locations[0];
    if (location) {
      sendLocationToFirebase(
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy,
        location.coords.speed,
        location.coords.heading,
      );
    }
  }
});
