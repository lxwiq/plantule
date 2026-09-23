import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/** An icon name per platform: SF Symbol on iOS, Material Symbol on Android and web. */
export type IconName = { ios: SFSymbol; android: AndroidSymbol };

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 24, color, style }: IconProps) {
  const theme = useTheme();
  return (
    <SymbolView
      name={{ ios: name.ios, android: name.android, web: name.android }}
      size={size}
      tintColor={color ?? theme.textSecondary}
      style={style}
    />
  );
}

/** Icons used across the app, so each concept keeps one glyph. */
export const icons = {
  add: { ios: 'plus', android: 'add' },
  calendar: { ios: 'calendar', android: 'calendar_today' },
  camera: { ios: 'camera', android: 'photo_camera' },
  chat: { ios: 'bubble.left.and.bubble.right', android: 'forum' },
  check: { ios: 'checkmark', android: 'check' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', android: 'close' },
  delete: { ios: 'trash', android: 'delete' },
  diagnose: { ios: 'stethoscope', android: 'stethoscope' },
  download: { ios: 'arrow.down.circle', android: 'download' },
  edit: { ios: 'pencil', android: 'edit' },
  error: { ios: 'exclamationmark.circle', android: 'error' },
  eye: { ios: 'eye', android: 'visibility' },
  gallery: { ios: 'photo.on.rectangle', android: 'photo_library' },
  home: { ios: 'house', android: 'home' },
  info: { ios: 'info.circle', android: 'info' },
  leaf: { ios: 'leaf', android: 'eco' },
  light: { ios: 'sun.max', android: 'light_mode' },
  notifications: { ios: 'bell', android: 'notifications' },
  outdoor: { ios: 'sun.max', android: 'wb_sunny' },
  pest: { ios: 'ant', android: 'pest_control' },
  pets: { ios: 'pawprint', android: 'pets' },
  pot: { ios: 'cylinder', android: 'straighten' },
  problem: { ios: 'bandage', android: 'healing' },
  propagation: { ios: 'leaf.arrow.triangle.circlepath', android: 'psychiatry' },
  retry: { ios: 'arrow.clockwise', android: 'refresh' },
  room: { ios: 'sofa', android: 'chair' },
  scan: { ios: 'camera.viewfinder', android: 'center_focus_weak' },
  schedule: { ios: 'clock', android: 'schedule' },
  send: { ios: 'arrow.up', android: 'send' },
  settings: { ios: 'gearshape', android: 'settings' },
  snooze: { ios: 'moon.zzz', android: 'snooze' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  stop: { ios: 'stop.fill', android: 'stop' },
  substrate: { ios: 'square.3.layers.3d', android: 'layers' },
  temperature: { ios: 'thermometer.medium', android: 'thermostat' },
  verified: { ios: 'checkmark.seal', android: 'verified' },
  weather: { ios: 'cloud.sun', android: 'partly_cloudy_day' },
  wet: { ios: 'humidity', android: 'humidity_high' },
} as const satisfies Record<string, IconName>;
