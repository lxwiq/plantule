import * as Haptics from 'expo-haptics';

import { completeTask, markSoilWet, snoozeTask } from '@/db/repo';

function feedback() {
  if (process.env.EXPO_OS !== 'web') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/** Care actions from the UI, with a haptic confirmation. */
export const careActions = {
  complete(taskId: string) {
    feedback();
    completeTask(taskId);
  },
  snooze(taskId: string, days: number) {
    feedback();
    snoozeTask(taskId, days);
  },
  soilWet(taskId: string, days: number) {
    feedback();
    markSoilWet(taskId, days);
  },
};
