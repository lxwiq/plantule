/**
 * What Pépin holds, on its right (x 700–850): a stubby arm in the pot's
 * colors comes out from behind the pot, its hand over what it holds.
 */

import { artId, artUrl, linearGradient, verticalGradient } from '../svg';
import type { Fragment, WardrobeItem, WearContext } from '../types';
import { GOLD, WOOL, flower, heartPath, leaf, stubbyArm } from './common';

/** Where Pépin's hand is. */
const HAND = { x: 700, y: 722 };

/**
 * An item in Pépin's hand: the arm behind the pot, the item, then the hand
 * over it. Items are drawn with the point the hand holds at `grip`, and
 * moved and scaled so that point lands in the hand.
 */
function held(
  { pot }: WearContext,
  item: Fragment,
  { grip = { x: 716, y: 716 }, scale = 1.25 } = {},
): { back: Fragment; front: Fragment } {
  const { arm, hand } = stubbyArm(pot, 'right', HAND.x, HAND.y);
  const placed = `<g transform="translate(${HAND.x} ${HAND.y}) scale(${scale}) translate(${-grip.x} ${-grip.y})">${item.body}</g>`;
  return { back: { body: arm }, front: { defs: item.defs, body: placed + hand } };
}

const tea: WardrobeItem = {
  id: 'held-tea',
  slot: 'held',
  label: 'Tasse de thé',
  draw: (context) =>
    held(context, {
      defs: verticalGradient('held-tea-mug', [
        [0, WOOL.cream.light],
        [1, WOOL.cream.shade],
      ]),
      body:
        // Steam.
        `<path d="M 744 648 C 730 628 756 616 742 594 M 772 646 C 760 630 782 620 770 602" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" opacity="0.75"/>` +
        `<path d="M 790 690 C 826 686 826 734 786 730" fill="none" stroke="${WOOL.cream.shade}" stroke-width="12" stroke-linecap="round"/>` +
        `<path d="M 714 668 L 796 668 L 790 742 Q 788 760 770 760 L 740 760 Q 722 760 720 742 Z" fill="${artUrl('held-tea-mug')}"/>` +
        `<ellipse cx="755" cy="669" rx="41" ry="9" fill="#B87A4B"/>` +
        `<path d="M 722 676 Q 755 686 788 676" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.5"/>` +
        `<path d="${heartPath(758, 716, 13)}" fill="${WOOL.pink.shade}"/>`,
    }),
};

const wateringCan: WardrobeItem = {
  id: 'held-watering-can',
  slot: 'held',
  label: 'Arrosoir',
  draw: (context) =>
    held(
      context,
      {
        defs: linearGradient('held-watering-can', [0, 0, 1, 1], [
          [0, WOOL.blue.light],
          [1, WOOL.blue.shade],
        ]),
        body:
          `<path d="M 800 744 L 826 688" fill="none" stroke="${WOOL.blue.shade}" stroke-width="13" stroke-linecap="round"/>` +
          `<ellipse cx="830" cy="680" rx="15" ry="10" transform="rotate(-30 830 680)" fill="${WOOL.blue.light}"/>` +
          `<path d="M 726 744 C 704 704 740 676 762 694" fill="none" stroke="${WOOL.blue.shade}" stroke-width="12" stroke-linecap="round"/>` +
          `<path d="M 730 704 L 806 704 L 802 780 Q 800 792 788 792 L 748 792 Q 736 792 734 780 Z" fill="${artUrl('held-watering-can')}"/>` +
          `<rect x="726" y="696" width="84" height="16" rx="8" fill="${WOOL.blue.light}"/>` +
          `<path d="M 746 724 L 746 774" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" opacity="0.4"/>` +
          flower(776, 748, 17, WOOL.cream.light, GOLD.light),
      },
      { grip: { x: 718, y: 726 }, scale: 1.2 },
    ),
};

const book: WardrobeItem = {
  id: 'held-book',
  slot: 'held',
  label: 'Livre',
  draw: (context) =>
    held(context, {
      body:
        `<g transform="rotate(8 760 704)">` +
        `<rect x="724" y="640" width="78" height="112" rx="8" fill="${WOOL.cream.shade}"/>` +
        `<rect x="722" y="636" width="74" height="112" rx="8" fill="${WOOL.sage.shade}"/>` +
        `<rect x="722" y="636" width="16" height="112" rx="6" fill="#6E9068"/>` +
        `<rect x="748" y="660" width="36" height="8" rx="4" fill="${WOOL.cream.light}" opacity="0.9"/>` +
        `<rect x="748" y="676" width="24" height="6" rx="3" fill="${WOOL.cream.light}" opacity="0.7"/>` +
        leaf(752, 722, 30, -40, WOOL.cream.light) +
        `<path d="M 782 748 L 782 772 L 776 766 L 770 772 L 770 748 Z" fill="${WOOL.red.light}"/>` +
        `</g>`,
    }),
};

const trowel: WardrobeItem = {
  id: 'held-trowel',
  slot: 'held',
  label: 'Petite pelle',
  draw: (context) =>
    held(context, {
      defs: linearGradient('held-trowel', [0, 0, 1, 0], [
        [0, '#DCE4EC'],
        [1, '#A9B6C4'],
      ]),
      body:
        `<g transform="rotate(14 716 716)">` +
        `<rect x="704" y="686" width="24" height="84" rx="12" fill="#C98E5A"/>` +
        `<rect x="708" y="700" width="6" height="56" rx="3" fill="#E2AE78" opacity="0.8"/>` +
        `<rect x="710" y="662" width="12" height="30" rx="4" fill="#9AA8B6"/>` +
        `<path d="M 716 560 C 748 590 756 630 742 664 L 690 664 C 676 630 684 590 716 560 Z" fill="${artUrl('held-trowel')}"/>` +
        `<path d="M 716 580 L 716 648" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.5"/>` +
        `<path d="M 702 580 Q 716 566 730 580 Q 716 590 702 580 Z" fill="#8A5E3E" opacity="0.8"/>` +
        `</g>`,
    }),
};

const balloon: WardrobeItem = {
  id: 'held-balloon',
  slot: 'held',
  label: 'Ballon cœur',
  draw: (context) =>
    held(
      context,
      {
        defs: linearGradient('held-balloon', [0, 0, 1, 1], [
        [0, '#F58D9B'],
        [1, '#DE5A70'],
      ]),
      body:
        `<path d="M 776 548 C 764 600 790 640 722 704" fill="none" stroke="#A48A7C" stroke-width="4" stroke-linecap="round"/>` +
        `<path d="${heartPath(776, 480, 48)}" fill="${artUrl('held-balloon')}"/>` +
        `<path d="M 768 542 L 784 542 L 776 552 Z" fill="#DE5A70" stroke="#DE5A70" stroke-width="6" stroke-linejoin="round"/>` +
        `<path d="M 728 452 Q 732 428 754 424" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" opacity="0.6"/>`,
      },
      { grip: { x: 722, y: 704 }, scale: 1.1 },
    ),
};

const bouquet: WardrobeItem = {
  id: 'held-bouquet',
  slot: 'held',
  label: 'Bouquet',
  draw: (context) =>
    held(
      context,
      {
        body:
          leaf(716, 650, 44, -120, '#5FB06D') +
        leaf(740, 652, 44, -50, '#4E9E5E') +
        leaf(728, 660, 40, -170, '#78C084') +
        flower(708, 628, 30, WOOL.pink.light, GOLD.light, 10) +
        flower(762, 624, 28, WOOL.cream.light, GOLD.light, 40) +
        flower(738, 588, 28, WOOL.lavender.light, GOLD.light, 0) +
        flower(784, 664, 22, WOOL.pink.shade, GOLD.light, 20) +
        `<path d="M 688 662 L 776 662 L 730 770 Q 726 778 720 770 Z" fill="#E9CB9C" stroke="#E9CB9C" stroke-width="10" stroke-linejoin="round"/>` +
        `<path d="M 704 672 L 726 752" fill="none" stroke="#F6E2BE" stroke-width="7" stroke-linecap="round"/>` +
        `<path d="M 718 716 Q 742 732 756 752 M 718 716 Q 700 740 708 760" fill="none" stroke="${WOOL.pink.shade}" stroke-width="7" stroke-linecap="round"/>`,
      },
      { grip: { x: 724, y: 716 }, scale: 1.2 },
    ),
};

const candle: WardrobeItem = {
  id: 'held-candle',
  slot: 'held',
  label: 'Bougie',
  draw: (context) =>
    held(
      context,
      {
        defs:
          `<radialGradient id="${artId('held-candle-glow')}" cx="0.5" cy="0.5" r="0.5">` +
          `<stop offset="0" stop-color="${GOLD.light}" stop-opacity="0.8"/><stop offset="1" stop-color="${GOLD.light}" stop-opacity="0"/>` +
          `</radialGradient>` +
          verticalGradient('held-candle-flame', [
            [0, '#FFE9A3'],
            [1, '#F59A4A'],
          ]),
        body:
          `<circle cx="770" cy="626" r="70" fill="${artUrl('held-candle-glow')}"/>` +
          `<path d="M 722 748 Q 700 748 700 732" fill="none" stroke="${WOOL.pink.shade}" stroke-width="10" stroke-linecap="round"/>` +
          `<ellipse cx="770" cy="752" rx="54" ry="14" fill="${WOOL.pink.shade}"/>` +
          `<ellipse cx="770" cy="746" rx="48" ry="10" fill="${WOOL.pink.light}"/>` +
          `<rect x="748" y="662" width="44" height="86" rx="10" fill="${WOOL.cream.light}"/>` +
          `<path d="M 748 674 Q 748 662 760 662 L 780 662 Q 792 662 792 674 L 792 690 Q 786 700 782 688 Q 776 672 770 690 Q 766 700 760 684 Q 754 672 748 684 Z" fill="#FFFFFF"/>` +
          `<path d="M 770 662 L 770 648" fill="none" stroke="#5A4234" stroke-width="4" stroke-linecap="round"/>` +
          `<path d="M 770 604 C 786 626 784 646 770 648 C 756 646 754 626 770 604 Z" fill="${artUrl('held-candle-flame')}"/>`,
      },
      { grip: { x: 704, y: 734 }, scale: 1.2 },
    ),
};

const yarn: WardrobeItem = {
  id: 'held-yarn',
  slot: 'held',
  label: 'Pelote de laine',
  draw: () => {
    const wool = WOOL.pink;
    return {
      front: {
        defs: linearGradient('held-yarn', [0, 0, 1, 1], [
          [0, wool.light],
          [1, wool.shade],
        ]),
        body:
          // Resting on the floor beside the pot, a loose strand curling out.
          `<g transform="translate(758 822) scale(1.2) translate(-780 -832)">` +
          `<path d="M 724 812 C 700 832 676 818 690 800" fill="none" stroke="${wool.shade}" stroke-width="7" stroke-linecap="round"/>` +
          `<path d="M 752 700 L 832 820 M 820 692 L 740 824" fill="none" stroke="#C98E5A" stroke-width="9" stroke-linecap="round"/>` +
          `<circle cx="780" cy="782" r="50" fill="${artUrl('held-yarn')}"/>` +
          `<path d="M 742 758 C 770 740 806 748 826 770 M 736 784 C 770 764 812 774 830 796 M 746 812 C 772 794 806 800 818 818 M 770 734 C 750 764 752 800 770 830" fill="none" stroke="${WOOL.cream.light}" stroke-width="6" stroke-linecap="round" opacity="0.55"/>` +
          `<circle cx="752" cy="700" r="8" fill="${GOLD.light}"/>` +
          `<circle cx="820" cy="692" r="8" fill="${GOLD.light}"/>` +
          `</g>`,
      },
    };
  },
};

/** The accessories. */
export const HELD: WardrobeItem[] = [tea, wateringCan, book, trowel, bouquet, balloon, candle, yarn];
