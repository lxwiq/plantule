import { router } from 'expo-router';

/** Closes the current screen, or goes home when it was opened from a link. */
export function closeScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
