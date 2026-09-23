/**
 * What Pépin wears around its neck, just under the rim (y 626–665). Drawn
 * before the face, so worried eyebrows stay on top, and clear of the eyes.
 */

import { artId, artUrl, linearGradient, verticalGradient } from '../svg';
import type { WardrobeItem } from '../types';
import { GOLD, WOOL, flower, leaf, r1, standOut } from './common';

const scarf: WardrobeItem = {
  id: 'neck-scarf',
  slot: 'neck',
  label: 'Écharpe tricotée',
  draw: ({ pot, potId }) => {
    const wool = standOut(pot, [WOOL.mustard, WOOL.red, WOOL.blue]);
    const id = `neck-scarf-${potId}`;
    // Knit stitches along the band.
    let stitches = '';
    for (let x = 356; x < 680; x += 22) {
      const y = r1(632 + 14 * (1 - ((x - 512) / 170) ** 2));
      stitches += `M ${x - 7} ${y} L ${x} ${y + 8} L ${x + 7} ${y} `;
    }
    let fringe = '';
    for (let i = 0; i < 5; i++) fringe += `M ${r1(656 + i * 11)} ${r1(790 - i * 1.6)} l ${r1(1 + i * 0.6)} 22 `;
    return {
      front: {
        defs: verticalGradient(id, [
          [0, wool.light],
          [1, wool.shade],
        ]),
        body:
          // The band around the neck, curving with the pot.
          `<path d="M 336 616 Q 512 646 688 616 L 690 652 Q 512 690 334 652 Z" fill="${artUrl(id)}"/>` +
          `<path d="${stitches}" fill="none" stroke="${WOOL.cream.light}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>` +
          // The end hanging down the side, striped, with its fringe.
          `<path d="M 632 648 L 680 642 L 706 780 Q 708 792 696 794 L 664 798 Q 652 800 650 788 Z" fill="${wool.shade}"/>` +
          `<path d="M 642 692 L 689 684 M 648 730 L 697 722" fill="none" stroke="${WOOL.cream.light}" stroke-width="14"/>` +
          `<path d="${fringe}" fill="none" stroke="${wool.shade}" stroke-width="7" stroke-linecap="round"/>` +
          // The knot.
          `<ellipse cx="652" cy="646" rx="30" ry="24" fill="${wool.light}"/>` +
          `<path d="M 634 640 Q 646 628 664 630" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.4"/>`,
      },
    };
  },
};

const bowTie: WardrobeItem = {
  id: 'neck-bow-tie',
  slot: 'neck',
  label: 'Nœud papillon',
  draw: ({ pot, potId }) => {
    const cloth = standOut(pot, [WOOL.red, WOOL.navy]);
    const id = `neck-bow-tie-${potId}`;
    const dots = [
      [476, 638],
      [482, 660],
      [548, 638],
      [542, 660],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${WOOL.cream.light}" opacity="0.9"/>`)
      .join('');
    return {
      front: {
        defs: verticalGradient(id, [
          [0, cloth.light],
          [1, cloth.shade],
        ]),
        body:
          `<g transform="translate(512 646) scale(1.2) translate(-512 -648)">` +
          `<path d="M 512 648 C 494 624 460 616 456 634 L 456 662 C 460 680 494 672 512 648 Z" fill="${artUrl(id)}"/>` +
          `<path d="M 512 648 C 530 624 564 616 568 634 L 568 662 C 564 680 530 672 512 648 Z" fill="${artUrl(id)}"/>` +
          dots +
          `<rect x="498" y="634" width="28" height="28" rx="10" fill="${cloth.shade}"/>` +
          `<path d="M 504 642 Q 510 638 518 639" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.5"/>` +
          `</g>`,
      },
    };
  },
};

const fairyLights: WardrobeItem = {
  id: 'neck-fairy-lights',
  slot: 'neck',
  label: 'Guirlande lumineuse',
  draw: () => {
    const colors = [GOLD.light, WOOL.pink.light, '#A8E6CF', WOOL.blue.light];
    // The wire droops between the bulbs, around the neck.
    const xs = [376, 444, 512, 580, 648];
    const y = (x: number) => r1(630 + 16 * (1 - ((x - 512) / 180) ** 2));
    let wire = `M 340 ${y(340)}`;
    for (const x of [...xs, 684]) wire += ` Q ${x - 34} ${y(x - 34) + 16} ${x} ${y(x)}`;
    const bulbs = xs
      .map((x, i) => {
        const by = y(x) + 16;
        const c = colors[i % colors.length];
        return (
          `<circle cx="${x}" cy="${by + 4}" r="30" fill="${artUrl('neck-fairy-glow')}"/>` +
          `<rect x="${x - 7}" y="${y(x) - 3}" width="14" height="14" rx="4" fill="#8C7B6E"/>` +
          `<ellipse cx="${x}" cy="${by + 6}" rx="12" ry="15" fill="${c}"/>` +
          `<circle cx="${x - 4}" cy="${by + 1}" r="4" fill="#FFFFFF" opacity="0.8"/>`
        );
      })
      .join('');
    return {
      front: {
        defs:
          `<radialGradient id="${artId('neck-fairy-glow')}" cx="0.5" cy="0.5" r="0.5">` +
          `<stop offset="0" stop-color="${GOLD.shine}" stop-opacity="0.9"/><stop offset="1" stop-color="${GOLD.shine}" stop-opacity="0"/>` +
          `</radialGradient>`,
        body: `<path d="${wire}" fill="none" stroke="#8C7B6E" stroke-width="5" stroke-linecap="round"/>` + bulbs,
      },
    };
  },
};

const lei: WardrobeItem = {
  id: 'neck-lei',
  slot: 'neck',
  label: 'Collier de fleurs',
  draw: () => {
    const xs = [352, 404, 458, 512, 566, 620, 672];
    const y = (x: number) => r1(632 + 22 * (1 - ((x - 512) / 170) ** 2));
    const petals = [WOOL.pink.light, GOLD.light, WOOL.cream.light];
    const leaves = xs
      .slice(0, -1)
      .map((x, i) => leaf(x + 24, y(x + 26) + 4, 26, i % 2 ? 20 : 150, i % 2 ? '#5FB06D' : '#78C084'))
      .join('');
    return {
      front: {
        body:
          leaves + xs.map((x, i) => flower(x, y(x), i % 2 ? 24 : 27, petals[i % 3], i % 3 === 1 ? '#F08A5D' : GOLD.shade, i * 30)).join(''),
      },
    };
  },
};

const bell: WardrobeItem = {
  id: 'neck-bell',
  slot: 'neck',
  label: 'Grelot',
  draw: ({ pot }) => {
    const ribbon = standOut(pot, [WOOL.red, WOOL.navy]);
    return {
      front: {
        defs: linearGradient('neck-bell', [0.2, 0, 0.8, 1], [
          [0, GOLD.light],
          [1, GOLD.shade],
        ]),
        body:
          `<path d="M 348 624 Q 512 650 676 624 L 676 642 Q 512 668 348 642 Z" fill="${ribbon.light}"/>` +
          `<path d="M 380 632 Q 512 652 644 632" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.35"/>` +
          `<circle cx="512" cy="654" r="7" fill="none" stroke="${GOLD.shade}" stroke-width="5"/>` +
          `<circle cx="512" cy="678" r="23" fill="${artUrl('neck-bell')}"/>` +
          `<path d="M 492 678 L 532 678" fill="none" stroke="${GOLD.shade}" stroke-width="4" stroke-linecap="round"/>` +
          `<circle cx="512" cy="690" r="5" fill="#8A6420"/>` +
          `<circle cx="503" cy="668" r="6" fill="${GOLD.shine}" opacity="0.9"/>`,
      },
    };
  },
};

const collar: WardrobeItem = {
  id: 'neck-collar',
  slot: 'neck',
  label: 'Col Claudine',
  draw: ({ pot }) => {
    const cloth = standOut(pot, [WOOL.cream, WOOL.pink]);
    // Two round flaps meeting under the rim, with a stitched edge.
    const flap = (side: 1 | -1) => {
      const x = (dx: number) => 512 + side * dx;
      return (
        `<path d="M ${x(0)} 622 L ${x(0)} 636 C ${x(0)} 666 ${x(40)} 680 ${x(76)} 672 C ${x(108)} 664 ${x(124)} 640 ${x(118)} 620 Z" fill="${cloth.shade}"/>` +
        `<path d="M ${x(0)} 620 L ${x(0)} 632 C ${x(2)} 658 ${x(40)} 670 ${x(74)} 663 C ${x(102)} 656 ${x(116)} 638 ${x(112)} 620 Z" fill="${cloth.light}"/>` +
        `<path d="M ${x(10)} 638 C ${x(14)} 654 ${x(42)} 662 ${x(72)} 655 C ${x(94)} 650 ${x(104)} 638 ${x(102)} 628" fill="none" stroke="${cloth.shade}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="2 8"/>`
      );
    };
    return {
      front: {
        body:
          flap(-1) +
          flap(1) +
          `<path d="M 512 636 C 496 622 480 626 482 638 C 484 650 500 648 512 636 C 524 648 540 650 542 638 C 544 626 528 622 512 636 Z" fill="${WOOL.red.light}"/>` +
          `<circle cx="512" cy="637" r="7" fill="${WOOL.red.shade}"/>`,
      },
    };
  },
};

/** Scarves, bows and collars. */
export const NECK: WardrobeItem[] = [scarf, bowTie, collar, lei, bell, fairyLights];
