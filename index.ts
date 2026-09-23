/**
 * Entry file. The home-screen widget is drawn by a background task that runs
 * without the app's screens, so it is registered here (see src/widget).
 */

import { registerTodayWidget } from './src/widget';
// Expo Router registers the app: imported last, as its docs ask.
import 'expo-router/entry';

registerTodayWidget();
