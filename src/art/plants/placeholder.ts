import type { Foliage } from '../types';

import { sprout } from './sprout';

/** A family not drawn yet: the sprout, under the family's name. */
export function placeholder(label: string): Foliage {
  return { ...sprout, label };
}
