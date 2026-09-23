import { LEAF } from '../palette';
import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

/** The logo's sprout: a stem and two leaves. Drawn for the plants the app can't place in a family. */
export const sprout: Foliage = {
  label: 'Pousse',
  back: () => ({
    defs:
      linearGradient('sprout-left', [0, 0, 1, 1], [
        [0, LEAF.light],
        [1, LEAF.dark],
      ]) +
      linearGradient('sprout-right', [1, 0, 0, 1], [
        [0, LEAF.mid],
        [1, LEAF.deep],
      ]),
    body:
      `<path d="M 512 600 C 512 523.5, 522 489.5, 512 430" fill="none" stroke="${LEAF.stem}" stroke-width="32" stroke-linecap="round"/>` +
      `<path d="M 506 452 C 557.3 341.8 400.1 255 300 330 C 295.5 431.5 447.3 527.7 506 452 Z" fill="${artUrl('sprout-left')}"/>` +
      `<path d="M 481.3 437.4 Q 417.7 389.7 359.7 360.8" fill="none" stroke="${LEAF.vein}" stroke-width="11" stroke-linecap="round" opacity="0.75"/>` +
      `<path d="M 520 436 C 574.3 504.1 729.4 406.8 730 312 C 634.7 246.5 474.7 335.3 520 436 Z" fill="${artUrl('sprout-right')}"/>` +
      `<path d="M 545.2 421.1 Q 618.5 387 669.4 343.7" fill="none" stroke="${LEAF.vein}" stroke-width="10" stroke-linecap="round" opacity="0.75"/>`,
  }),
};

