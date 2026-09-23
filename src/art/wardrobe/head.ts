/**
 * Hats, sitting on the rim (Pépin's forehead, x 318–706, y 552–626). The
 * plant keeps growing from behind: its stem pokes out of the hat.
 */

import { artUrl, linearGradient, verticalGradient } from '../svg';
import type { WardrobeItem } from '../types';
import { GOLD, WOOL, flower, leaf, r1, star } from './common';

/** A fluffy ball of wool: a disc ringed with small bumps, lit from the top left. */
function pompom(x: number, y: number, r: number, color: { light: string; shade: string }): string {
  let bumps = '';
  for (let i = 0; i < 9; i++) {
    const a = (i * 40 * Math.PI) / 180;
    bumps += `<circle cx="${r1(x + r * 0.78 * Math.cos(a))}" cy="${r1(y + r * 0.78 * Math.sin(a))}" r="${r1(r * 0.34)}" fill="${color.shade}"/>`;
  }
  return (
    bumps +
    `<circle cx="${x}" cy="${y}" r="${r1(r * 0.86)}" fill="${color.shade}"/>` +
    `<circle cx="${r1(x - r * 0.12)}" cy="${r1(y - r * 0.12)}" r="${r1(r * 0.72)}" fill="${color.light}"/>` +
    `<circle cx="${r1(x - r * 0.32)}" cy="${r1(y - r * 0.34)}" r="${r1(r * 0.18)}" fill="#FFFFFF" opacity="0.6"/>`
  );
}

/** A ribbed knit band over the rim, from x1 to x2. */
function ribbedCuff(x1: number, x2: number, y: number, height: number, color: { light: string; shade: string }): string {
  let ribs = '';
  for (let x = x1 + 16; x < x2 - 8; x += 17) ribs += `M ${x} ${y + 9} L ${x} ${y + height - 9} `;
  return (
    `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="${height}" rx="${r1(height / 2.2)}" fill="${color.shade}"/>` +
    `<path d="${ribs}" fill="none" stroke="${color.light}" stroke-width="7" stroke-linecap="round" opacity="0.7"/>`
  );
}

const beanie: WardrobeItem = {
  id: 'hat-beanie',
  slot: 'head',
  label: 'Bonnet à pompon',
  draw: () => {
    const wool = WOOL.red;
    // Knit ribs following the dome, towards its top.
    const ribs = [388, 436, 484, 540, 588, 636]
      .map((x) => `M ${x} 540 Q ${r1(x + (512 - x) * 0.25)} 470 ${r1(512 + (x - 512) * 0.35)} 436`)
      .join(' ');
    return {
      front: {
        defs: verticalGradient('hat-beanie-dome', [
          [0, wool.light],
          [1, wool.shade],
        ]),
        body:
          `<path d="M 336 552 C 330 452 420 416 512 416 C 604 416 694 452 688 552 Z" fill="${artUrl('hat-beanie-dome')}"/>` +
          `<path d="${ribs}" fill="none" stroke="${wool.shade}" stroke-width="7" stroke-linecap="round" opacity="0.55"/>` +
          `<path d="M 404 470 Q 440 440 488 432" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" opacity="0.3"/>` +
          ribbedCuff(318, 706, 526, 62, wool) +
          pompom(632, 426, 52, WOOL.cream),
      },
    };
  },
};

const straw: WardrobeItem = {
  id: 'hat-straw',
  slot: 'head',
  label: 'Chapeau de paille',
  draw: () => ({
    front: {
      defs:
        verticalGradient('hat-straw-brim', [
          [0, '#F4D894'],
          [1, '#DDB163'],
        ]) +
        verticalGradient('hat-straw-crown', [
          [0, '#F6DC9C'],
          [1, '#E3BA6E'],
        ]),
      body:
        `<ellipse cx="512" cy="558" rx="238" ry="42" fill="${artUrl('hat-straw-brim')}"/>` +
        `<path d="M 298 566 Q 512 612 726 566" fill="none" stroke="#F9E8BD" stroke-width="5" stroke-linecap="round" opacity="0.8"/>` +
        `<path d="M 406 562 C 400 484 442 454 512 454 C 582 454 624 484 618 562 Z" fill="${artUrl('hat-straw-crown')}"/>` +
        `<path d="M 426 500 Q 512 482 598 500 M 420 470 Q 440 462 470 459" fill="none" stroke="#FBEBC4" stroke-width="5" stroke-linecap="round" opacity="0.7"/>` +
        `<path d="M 404 524 Q 512 514 620 524 L 620 552 Q 512 544 404 552 Z" fill="${WOOL.red.light}"/>` +
        flower(592, 536, 26, WOOL.cream.light, GOLD.light) +
        leaf(604, 540, 30, -20, '#6DB37A'),
    },
  }),
};

const beret: WardrobeItem = {
  id: 'hat-beret',
  slot: 'head',
  label: 'Béret',
  draw: () => ({
    front: {
      defs: linearGradient('hat-beret', [0, 0, 0.4, 1], [
        [0, '#C9596D'],
        [1, '#9E3D52'],
      ]),
      body:
        `<path d="M 452 462 Q 446 436 464 426" fill="none" stroke="#9E3D52" stroke-width="13" stroke-linecap="round"/>` +
        `<path d="M 340 560 C 290 530 300 466 420 454 C 540 442 652 470 652 526 C 652 552 622 568 568 570 L 392 574 C 366 574 350 568 340 560 Z" fill="${artUrl('hat-beret')}"/>` +
        `<path d="M 344 510 Q 370 474 450 468" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" opacity="0.25"/>` +
        `<path d="M 376 566 Q 490 582 618 558" fill="none" stroke="#8A3246" stroke-width="14" stroke-linecap="round"/>`,
    },
  }),
};

const flowerCrown: WardrobeItem = {
  id: 'hat-flower-crown',
  slot: 'head',
  label: 'Couronne de fleurs',
  draw: () => {
    const xs = [340, 396, 454, 512, 570, 628, 684];
    const y = (x: number) => r1(548 + 12 * (1 - ((x - 512) / 180) ** 2));
    const petals = [WOOL.pink.light, WOOL.cream.light, WOOL.lavender.light];
    const leaves = xs
      .slice(0, -1)
      .map((x, i) => leaf(x + 26, y(x + 28), 30, i % 2 ? -30 : 30, i % 2 ? '#5FB06D' : '#78C084'))
      .join('');
    return {
      front: {
        body:
          `<path d="M 330 548 Q 512 584 694 548" fill="none" stroke="#5FB06D" stroke-width="8" stroke-linecap="round"/>` +
          leaves +
          xs.map((x, i) => flower(x, y(x), i % 2 === 0 ? 36 : 31, petals[i % 3], GOLD.light, i * 20)).join(''),
      },
    };
  },
};

const nightcap: WardrobeItem = {
  id: 'hat-nightcap',
  slot: 'head',
  label: 'Bonnet de nuit',
  draw: () => {
    const cap = WOOL.blue;
    return {
      front: {
        defs: linearGradient('hat-nightcap', [0, 0, 1, 1], [
          [0, cap.light],
          [1, cap.shade],
        ]),
        body:
          `<path d="M 340 552 C 340 452 452 404 560 410 C 664 416 738 488 760 574 C 764 592 746 600 736 588 C 718 540 690 520 684 552 Z" fill="${artUrl('hat-nightcap')}"/>` +
          star(452, 470, 13, GOLD.light, 10) +
          star(590, 452, 10, GOLD.light, -8) +
          star(676, 500, 9, GOLD.light, 20) +
          `<circle cx="398" cy="516" r="5" fill="${GOLD.light}"/>` +
          `<circle cx="532" cy="436" r="5" fill="${GOLD.light}"/>` +
          ribbedCuff(318, 706, 530, 56, WOOL.cream) +
          pompom(748, 604, 30, WOOL.cream),
      },
    };
  },
};

const party: WardrobeItem = {
  id: 'hat-party',
  slot: 'head',
  label: 'Chapeau de fête',
  draw: () => ({
    front: {
      defs: linearGradient('hat-party', [0, 0, 1, 1], [
        [0, WOOL.pink.light],
        [1, WOOL.pink.shade],
      ]),
      body:
        `<polygon points="372,562 500,552 408,396" fill="${artUrl('hat-party')}" stroke="${WOOL.pink.light}" stroke-width="16" stroke-linejoin="round"/>` +
        `<path d="M 386 520 L 470 482 M 396 468 L 440 448" fill="none" stroke="${WOOL.cream.light}" stroke-width="12" stroke-linecap="round" opacity="0.9"/>` +
        `<circle cx="452" cy="530" r="9" fill="${GOLD.light}"/>` +
        `<circle cx="412" cy="496" r="7" fill="${GOLD.light}"/>` +
        `<circle cx="428" cy="430" r="6" fill="${GOLD.light}"/>` +
        pompom(406, 390, 28, { light: GOLD.light, shade: GOLD.shade }),
    },
  }),
};

const crown: WardrobeItem = {
  id: 'hat-crown',
  slot: 'head',
  label: 'Couronne',
  draw: () => ({
    front: {
      defs: verticalGradient('hat-crown', [
        [0, GOLD.light],
        [1, GOLD.shade],
      ]),
      body:
        `<path d="M 418 564 L 408 478 L 460 514 L 512 452 L 564 514 L 616 478 L 606 564 Q 512 574 418 564 Z" fill="${artUrl('hat-crown')}" stroke="${GOLD.shade}" stroke-width="8" stroke-linejoin="round"/>` +
        `<path d="M 420 538 Q 512 548 604 538" fill="none" stroke="${GOLD.shine}" stroke-width="6" stroke-linecap="round" opacity="0.8"/>` +
        `<circle cx="408" cy="474" r="11" fill="${GOLD.light}"/>` +
        `<circle cx="512" cy="446" r="12" fill="${GOLD.light}"/>` +
        `<circle cx="616" cy="474" r="11" fill="${GOLD.light}"/>` +
        `<circle cx="512" cy="516" r="12" fill="#E5586B"/>` +
        `<circle cx="460" cy="540" r="8" fill="#6FB3E0"/>` +
        `<circle cx="564" cy="540" r="8" fill="#7CC48A"/>` +
        `<circle cx="508" cy="512" r="4" fill="#FFFFFF" opacity="0.7"/>`,
    },
  }),
};

const earmuffs: WardrobeItem = {
  id: 'hat-earmuffs',
  slot: 'head',
  label: 'Cache-oreilles',
  draw: () => ({
    front: {
      body:
        `<path d="M 334 580 C 330 470 694 470 690 580" fill="none" stroke="${WOOL.pink.shade}" stroke-width="18" stroke-linecap="round"/>` +
        `<path d="M 380 512 Q 440 486 500 482" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.4"/>` +
        pompom(326, 590, 48, WOOL.pink) +
        pompom(698, 590, 48, WOOL.pink),
    },
  }),
};

/** The hats. */
export const HATS: WardrobeItem[] = [beanie, straw, beret, flowerCrown, nightcap, party, crown, earmuffs];
