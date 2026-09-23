/** Glasses and masks, over the eyes at (462, 700) and (562, 700). */

import { artUrl, linearGradient } from '../svg';
import type { WardrobeItem, WearContext } from '../types';
import { GOLD, WOOL, heartPath, starPoints } from './common';

/** Frames in warm brown, or in gold on the dark pots where brown would vanish. */
const frameColor = ({ pot }: WearContext) => (pot.ink ? GOLD.light : '#7A5236');

/** The bridge between two lenses and the temples going to the pot's sides. */
function bridgeAndTemples(color: string, width: number, gap: [number, number], sides: [number, number], y = 694) {
  const [l, r] = gap;
  const [a, b] = sides;
  return `<path d="M ${l} ${y} Q 512 ${y - 12} ${r} ${y} M ${a} ${y} L ${a - 50} ${y - 10} M ${b} ${y} L ${b + 50} ${y - 10}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

/** A pale glint across a lens centered on (x, y). */
const glint = (x: number, y: number, r: number) =>
  `<path d="M ${x - r * 0.6} ${y - r * 0.1} Q ${x - r * 0.5} ${y - r * 0.55} ${x - r * 0.1} ${y - r * 0.65}" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.7"/>`;

const round: WardrobeItem = {
  id: 'glasses-round',
  slot: 'eyes',
  label: 'Lunettes rondes',
  draw: (context) => {
    const color = frameColor(context);
    const lens = (x: number) =>
      `<circle cx="${x}" cy="700" r="37" fill="#FFFFFF" fill-opacity="0.2" stroke="${color}" stroke-width="9"/>` + glint(x, 700, 30);
    return { front: { body: lens(462) + lens(562) + bridgeAndTemples(color, 8, [499, 525], [425, 599]) } };
  },
};

const sunglasses: WardrobeItem = {
  id: 'glasses-sun',
  slot: 'eyes',
  label: 'Lunettes de soleil',
  draw: () => {
    const lens = (x: number) =>
      `<path d="M ${x - 44} 682 Q ${x - 44} 672 ${x - 32} 672 L ${x + 32} 672 Q ${x + 44} 672 ${x + 42} 684 L ${x + 36} 712 Q ${x + 30} 734 ${x} 734 Q ${x - 34} 734 ${x - 40} 712 Z" fill="${artUrl('glasses-sun')}"/>` +
      `<path d="M ${x - 26} 712 L ${x + 6} 682" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" opacity="0.35"/>`;
    return {
      front: {
        defs: linearGradient('glasses-sun', [0, 0, 0, 1], [
          [0, '#4A4058'],
          [1, '#241E2C'],
        ]),
        body: lens(460) + lens(564) + bridgeAndTemples('#241E2C', 9, [500, 524], [418, 606], 684),
      },
    };
  },
};

const hearts: WardrobeItem = {
  id: 'glasses-hearts',
  slot: 'eyes',
  label: 'Lunettes cœur',
  draw: () => {
    const lens = (x: number) =>
      `<path d="${heartPath(x, 704, 31)}" fill="#F27C98" fill-opacity="0.9" stroke="#E0567A" stroke-width="7" stroke-linejoin="round"/>` +
      `<path d="M ${x - 28} 690 Q ${x - 26} 676 ${x - 14} 674" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.7"/>`;
    return { front: { body: lens(458) + lens(566) + bridgeAndTemples('#E0567A', 7, [496, 528], [422, 604], 690) } };
  },
};

const monocle: WardrobeItem = {
  id: 'glasses-monocle',
  slot: 'eyes',
  label: 'Monocle',
  draw: () => ({
    front: {
      body:
        `<path d="M 586 730 C 610 770 590 800 640 812" fill="none" stroke="${GOLD.shade}" stroke-width="5" stroke-linecap="round"/>` +
        `<circle cx="562" cy="700" r="38" fill="#FFFFFF" fill-opacity="0.22" stroke="${GOLD.shade}" stroke-width="10"/>` +
        `<circle cx="562" cy="700" r="38" fill="none" stroke="${GOLD.light}" stroke-width="4"/>` +
        glint(562, 700, 31),
    },
  }),
};

const sleepMask: WardrobeItem = {
  id: 'mask-sleep',
  slot: 'eyes',
  label: 'Masque de nuit',
  draw: () => {
    const fabric = WOOL.lavender;
    const lid = (x: number) =>
      `<path d="M ${x - 22} 694 Q ${x} 712 ${x + 22} 694" fill="none" stroke="#6D58A6" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M ${x - 14} 706 l -5 9 M ${x} 710 l 0 10 M ${x + 14} 706 l 5 9" fill="none" stroke="#6D58A6" stroke-width="5" stroke-linecap="round"/>`;
    return {
      front: {
        defs: linearGradient('mask-sleep', [0, 0, 0, 1], [
          [0, fabric.light],
          [1, fabric.shade],
        ]),
        body:
          `<path d="M 406 684 L 360 676 M 618 684 L 664 676" fill="none" stroke="${fabric.shade}" stroke-width="12" stroke-linecap="round"/>` +
          `<path d="M 404 694 C 402 662 468 654 512 668 C 556 654 622 662 620 694 C 618 728 574 738 540 726 C 526 720 498 720 484 726 C 450 738 406 728 404 694 Z" fill="${artUrl('mask-sleep')}"/>` +
          `<path d="M 420 676 Q 460 662 500 672" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.45"/>` +
          lid(460) +
          lid(564) +
          `<path d="${heartPath(512, 704, 7)}" fill="${WOOL.pink.light}"/>`,
      },
    };
  },
};

const stars: WardrobeItem = {
  id: 'glasses-stars',
  slot: 'eyes',
  label: 'Lunettes étoiles',
  draw: () => {
    const lens = (x: number, rotation: number) =>
      `<polygon points="${starPoints(x, 702, 40, rotation)}" fill="${GOLD.light}" stroke="${GOLD.shade}" stroke-width="8" stroke-linejoin="round"/>` +
      `<path d="M ${x - 12} 686 Q ${x - 4} 678 ${x + 4} 680" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.8"/>`;
    return { front: { body: bridgeAndTemples(GOLD.shade, 7, [496, 528], [424, 600], 696) + lens(460, -6) + lens(564, 6) } };
  },
};

/** The glasses. */
export const EYES: WardrobeItem[] = [round, sunglasses, hearts, stars, monocle, sleepMask];
