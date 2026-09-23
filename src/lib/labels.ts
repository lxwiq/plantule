import type { Light, Task, TaskKind } from '@/db/types';
import { icons, type IconName } from '@/components/ui';
import type { AccentName } from '@/theme';

type KindInfo = {
  /** Noun, e.g. "Arrosage". */
  label: string;
  /** Action, e.g. "Arroser". */
  verb: string;
  icon: IconName;
  accent: AccentName;
  /** Suggested interval when creating the task. */
  defaultInterval: number;
  /** Suggested winter factor. */
  defaultWinterFactor: number;
};

export const TASK_KINDS: Record<TaskKind, KindInfo> = {
  water: {
    label: 'Arrosage',
    verb: 'Arroser',
    icon: { ios: 'drop', android: 'water_drop' },
    accent: 'water',
    defaultInterval: 7,
    defaultWinterFactor: 1.5,
  },
  fertilize: {
    label: 'Engrais',
    verb: 'Mettre de l’engrais',
    icon: { ios: 'flask', android: 'science' },
    accent: 'fertilize',
    defaultInterval: 14,
    defaultWinterFactor: 2,
  },
  mist: {
    label: 'Brumisation',
    verb: 'Brumiser',
    icon: { ios: 'humidity', android: 'humidity_percentage' },
    accent: 'mist',
    defaultInterval: 3,
    defaultWinterFactor: 1,
  },
  repot: {
    label: 'Rempotage',
    verb: 'Rempoter',
    icon: { ios: 'arrow.up.bin', android: 'potted_plant' },
    accent: 'repot',
    defaultInterval: 365,
    defaultWinterFactor: 1,
  },
  prune: {
    label: 'Taille',
    verb: 'Tailler',
    icon: { ios: 'scissors', android: 'content_cut' },
    accent: 'prune',
    defaultInterval: 90,
    defaultWinterFactor: 1,
  },
  clean: {
    label: 'Nettoyage des feuilles',
    verb: 'Nettoyer les feuilles',
    icon: { ios: 'sparkles', android: 'cleaning_services' },
    accent: 'clean',
    defaultInterval: 30,
    defaultWinterFactor: 1,
  },
  rotate: {
    label: 'Rotation',
    verb: 'Tourner le pot',
    icon: { ios: 'arrow.clockwise', android: 'rotate_right' },
    accent: 'rotate',
    defaultInterval: 14,
    defaultWinterFactor: 1,
  },
  other: {
    label: 'Autre',
    verb: 'Autre tâche',
    icon: icons.leaf,
    accent: 'other',
    defaultInterval: 7,
    defaultWinterFactor: 1,
  },
};

export const TASK_KIND_ORDER: TaskKind[] = [
  'water',
  'fertilize',
  'mist',
  'rotate',
  'clean',
  'prune',
  'repot',
  'other',
];

/** What to show for a task: its custom label, or the kind's action. */
export function taskTitle(task: Pick<Task, 'kind' | 'label'>): string {
  return task.label?.trim() || TASK_KINDS[task.kind].verb;
}

export const LIGHT_LABELS: Record<Light, string> = {
  full_sun: 'Plein soleil',
  bright_indirect: 'Lumineux, sans soleil direct',
  partial_shade: 'Mi-ombre',
  shade: 'Ombre',
};

export const LIGHT_ORDER: Light[] = ['full_sun', 'bright_indirect', 'partial_shade', 'shade'];

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}
