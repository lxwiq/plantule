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
  check: { ios: 'checkmark', android: 'check' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', android: 'close' },
  delete: { ios: 'trash', android: 'delete' },
  download: { ios: 'arrow.down.circle', android: 'download' },
  edit: { ios: 'pencil', android: 'edit' },
  error: { ios: 'exclamationmark.circle', android: 'error' },
  gallery: { ios: 'photo.on.rectangle', android: 'photo_library' },
  home: { ios: 'house', android: 'home' },
  info: { ios: 'info.circle', android: 'info' },
  leaf: { ios: 'leaf', android: 'eco' },
  light: { ios: 'sun.max', android: 'light_mode' },
  notifications: { ios: 'bell', android: 'notifications' },
  outdoor: { ios: 'sun.max', android: 'wb_sunny' },
  pets: { ios: 'pawprint', android: 'pets' },
  retry: { ios: 'arrow.clockwise', android: 'refresh' },
  room: { ios: 'sofa', android: 'chair' },
  scan: { ios: 'camera.viewfinder', android: 'center_focus_weak' },
  schedule: { ios: 'clock', android: 'schedule' },
  settings: { ios: 'gearshape', android: 'settings' },
  snooze: { ios: 'moon.zzz', android: 'snooze' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  temperature: { ios: 'thermometer.medium', android: 'thermostat' },
  wet: { ios: 'humidity', android: 'humidity_high' },
} as const satisfies Record<string, IconName>;
