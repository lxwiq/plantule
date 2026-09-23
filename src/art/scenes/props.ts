/**
 * The cozy things around Pépin in the scenes: a mug, a plaid, a jar, a
 * watering can… Unless said otherwise, a prop is drawn standing with its
 * bottom center at (0, 0), sized for a scene: place it with `transformed()`.
 * The ones Pépin wears or holds (plaid, magnifier, book, glasses) are drawn in
 * the pot's coordinates instead (see src/art/pot.ts).
 */

import { BLUSH, INK, LEAF, potPalette, SOIL } from '../palette';
import { artId, artUrl, linearGradient, verticalGradient } from '../svg';
import type { Fragment } from '../types';
import { r1 } from './backdrop';

/** The props' colors: wool, cream, honey wood, glass and water. */
export const COZY = {
  cream: '#FFF7EA',
  creamShade: '#F0DDC2',
  oat: '#F6E6CD',
  oatShade: '#E6CCA6',
  rose: '#F2AFA0',
  sage: '#AFD4A8',
  sageShade: '#86B784',
  wood: '#E7B27A',
  woodShade: '#C98A52',
  steel: '#D5DEE0',
  steelShade: '#A9B8BD',
  can: '#A9D3E4',
  canShade: '#7DADCB',
  water: '#9CD3EE',
  drop: '#8CC8F0',
  glass: '#DCF0F3',
  cocoa: '#B7825C',
  butter: '#FCE6A4',
  butterShade: '#F3CB6C',
  lavender: '#B3AEE6',
  heart: '#EE7F84',
  kraft: '#F4DCAE',
  kraftShade: '#E4BD84',
  paper: '#FFFBF3',
} as const;

const stroke = (d: string, color: string, width: number, opacity = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;

/** A heart centered on (x, y), about 40 wide at scale 1. */
export function heart(x: number, y: number, scale: number, color: string = COZY.heart): string {
  return `<path transform="translate(${x} ${y}) scale(${scale})" d="M 0 16 C -30 -2 -24 -28 -8 -26 C -2 -25 0 -19 0 -15 C 0 -19 2 -25 8 -26 C 24 -28 30 -2 0 16 Z" fill="${color}"/>`;
}

/** A four-pointed twinkle centered on (x, y), `size` from tip to tip. */
export function sparkle(x: number, y: number, size: number, color: string = COZY.butter): string {
  const s = size / 2;
  const k = r1(s * 0.18);
  return `<path transform="translate(${x} ${y})" d="M 0 ${-s} Q ${k} ${-k} ${s} 0 Q ${k} ${k} 0 ${s} Q ${-k} ${k} ${-s} 0 Q ${-k} ${-k} 0 ${-s} Z" fill="${color}"/>`;
}

/** A drop of water, its tip up, centered on (x, y). */
export function drop(x: number, y: number, scale = 1, color: string = COZY.drop): string {
  return (
    `<g transform="translate(${x} ${y}) scale(${scale})">` +
    `<path d="M 0 -20 Q 13 -3 13 6 A 13 13 0 0 1 -13 6 Q -13 -3 0 -20 Z" fill="${color}"/>` +
    `<ellipse cx="-4.5" cy="5" rx="3.5" ry="5" fill="#fff" opacity="0.7"/>` +
    `</g>`
  );
}

/** Wisps of steam rising from (x, y). */
export function steam(x: number, y: number, color = '#FFFFFF', opacity = 0.9): string {
  return (
    stroke(`M ${x - 14} ${y} C ${x - 30} ${y - 22} ${x + 2} ${y - 34} ${x - 14} ${y - 58}`, color, 9, opacity) +
    stroke(`M ${x + 14} ${y - 8} C ${x - 2} ${y - 30} ${x + 30} ${y - 42} ${x + 14} ${y - 70}`, color, 9, opacity)
  );
}

/** "Zzz", rising to the right from (x, y). */
export function snore(x: number, y: number, color: string = COZY.lavender): string {
  const z = (cx: number, cy: number, s: number) =>
    stroke(`M ${cx - s} ${cy - s} L ${cx + s} ${cy - s} L ${cx - s} ${cy + s} L ${cx + s} ${cy + s}`, color, r1(s * 0.55));
  return z(x, y, 11) + z(x + 34, y - 34, 15) + z(x + 80, y - 80, 20);
}

/** A rounded question mark centered on (x, y), about 80 tall, leaning a little. */
export function questionMark(x: number, y: number, color: string = COZY.lavender): string {
  return (
    `<g transform="translate(${x} ${y}) rotate(12)">` +
    stroke('M -18 -22 C -18 -46 18 -48 18 -24 C 18 -8 0 -6 0 12', color, 13) +
    `<circle cx="0" cy="34" r="8" fill="${color}"/>` +
    `</g>`
  );
}

/** A fat crescent moon, its center at (0, 0). */
export function moon(): Fragment {
  return {
    defs: linearGradient('scene-moon', [0, 0, 1, 1], [
      [0, COZY.butter],
      [1, COZY.butterShade],
    ]),
    body: `<path d="M 15 -41.3 A 44 44 0 1 0 15 41.3 A 46 46 0 0 1 15 -41.3 Z" fill="${artUrl('scene-moon')}"/>`,
  };
}

/** A mug of cocoa with a heart on it, the handle on the right. */
export function mug(): Fragment {
  return {
    defs: verticalGradient('scene-mug', [
      [0, COZY.cream],
      [1, COZY.creamShade],
    ]),
    body:
      stroke('M 36 -74 C 76 -78 78 -24 34 -30', COZY.creamShade, 15) +
      `<path d="M -45 -88 L 45 -88 L 41 -16 Q 39 0 22 0 L -22 0 Q -39 0 -41 -16 Z" fill="${artUrl('scene-mug')}"/>` +
      `<ellipse cx="0" cy="-88" rx="45" ry="11" fill="${COZY.cream}"/>` +
      `<ellipse cx="0" cy="-87" rx="37" ry="7" fill="${COZY.cocoa}"/>` +
      heart(2, -44, 0.75, COZY.rose) +
      stroke('M -32 -72 L -30 -30', '#FFFFFF', 7, 0.8),
  };
}

/**
 * A knitted plaid over Pépin's shoulders, wrapped around it and tucked up to
 * its chin, the face peeking out; in the pot's coordinates.
 */
export function plaid(): Fragment {
  const outline =
    'M 356 538 C 316 538 294 572 288 630 C 280 700 268 780 272 840 C 274 866 292 876 320 876 ' +
    'Q 512 890 704 876 C 732 876 750 866 752 840 C 756 780 744 700 736 630 C 730 572 708 538 668 538 ' +
    'C 646 538 640 566 642 600 L 644 738 C 644 774 600 786 512 786 C 424 786 380 774 380 738 ' +
    'L 382 600 C 384 566 378 538 356 538 Z';
  const edge =
    'M 358 544 C 377 550 382 574 381 604 L 380 738 C 380 774 424 786 512 786 C 600 786 644 774 644 738 ' +
    'L 643 604 C 642 574 647 550 666 544';
  const ribs = [-6, -5, -4, -3, 3, 4, 5, 6]
    .map((k) => stroke(`M ${512 + k * 34} 560 L ${512 + k * 37} 890`, COZY.oatShade, 5, 0.6))
    .concat([-2, -1, 0, 1, 2].map((k) => stroke(`M ${512 + k * 36} 790 L ${512 + k * 38} 890`, COZY.oatShade, 5, 0.6)))
    .join('');
  return {
    defs:
      verticalGradient('scene-plaid', [
        [0, COZY.oat],
        [1, COZY.oatShade],
      ]) + `<clipPath id="${artId('scene-plaid-clip')}"><path d="${outline}"/></clipPath>`,
    body:
      `<path d="${outline}" fill="${artUrl('scene-plaid')}"/>` +
      `<g clip-path="${artUrl('scene-plaid-clip')}">` +
      ribs +
      stroke('M 250 818 Q 512 842 774 818', COZY.rose, 14) +
      stroke('M 250 846 Q 512 870 774 846', COZY.sage, 10) +
      stroke('M 250 700 L 774 700', COZY.rose, 14) +
      `</g>` +
      stroke(edge, COZY.cream, 24) +
      stroke('M 386 612 L 386 730', '#FFFFFF', 5, 0.7),
  };
}

/** A packet of seeds, a sprout on its label, leaning a little. */
export function seedPacket(): Fragment {
  const top = 'M -48 -140 L -36 -128 L -24 -140 L -12 -128 L 0 -140 L 12 -128 L 24 -140 L 36 -128 L 48 -140';
  return {
    defs: verticalGradient('scene-packet', [
      [0, COZY.kraft],
      [1, COZY.kraftShade],
    ]),
    body:
      `<g transform="rotate(-7)">` +
      `<path d="${top} L 48 -10 Q 48 0 38 0 L -38 0 Q -48 0 -48 -10 Z" fill="${artUrl('scene-packet')}"/>` +
      `<rect x="-34" y="-108" width="68" height="70" rx="14" fill="${COZY.paper}"/>` +
      stroke('M 0 -48 L 0 -76', LEAF.stem, 6) +
      `<path d="M -1 -74 C -4 -92 -24 -96 -30 -88 C -28 -76 -12 -70 -1 -74 Z" fill="${LEAF.light}"/>` +
      `<path d="M 1 -78 C 6 -96 26 -98 30 -90 C 28 -78 12 -72 1 -78 Z" fill="${LEAF.mid}"/>` +
      stroke('M -30 -24 L 20 -24', COZY.paper, 7, 0.8) +
      `</g>`,
  };
}

/** A few seeds on the ground, around (0, 0). */
export function seeds(): string {
  return [
    [-20, -6, -20],
    [4, -3, 30],
    [26, -8, 70],
  ]
    .map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="5.5" transform="rotate(${a} ${x} ${y})" fill="${COZY.woodShade}"/>`)
    .join('');
}

/** A small terracotta pot filled with soil, waiting for a seed. */
export function littlePot(): Fragment {
  const terracotta = potPalette('terracotta');
  return {
    defs:
      verticalGradient('scene-little-pot', [
        [0, terracotta.shadow],
        [0.15, terracotta.body],
        [1, terracotta.light],
      ]) +
      verticalGradient('scene-little-soil', [
        [0, SOIL.bottom],
        [1, SOIL.top],
      ]),
    body:
      `<path d="M -50 -88 L 50 -88 L 40 -10 Q 38 0 28 0 L -28 0 Q -38 0 -40 -10 Z" fill="${artUrl('scene-little-pot')}"/>` +
      `<rect x="-60" y="-112" width="120" height="30" rx="12" fill="${terracotta.rim}"/>` +
      `<ellipse cx="0" cy="-110" rx="50" ry="8" fill="${artUrl('scene-little-soil')}"/>` +
      `<rect x="-50" y="-100" width="100" height="6" rx="3" fill="${terracotta.rimHighlight}" opacity="0.8"/>`,
  };
}

/** A garden trowel, the blade up. */
export function trowel(): Fragment {
  return {
    defs:
      linearGradient('scene-blade', [0, 0, 1, 0], [
        [0, COZY.steel],
        [1, COZY.steelShade],
      ]) +
      linearGradient('scene-handle', [0, 0, 1, 0], [
        [0, COZY.wood],
        [1, COZY.woodShade],
      ]),
    body:
      `<path d="M 0 -150 C 30 -128 34 -84 24 -64 L -24 -64 C -34 -84 -30 -128 0 -150 Z" fill="${artUrl('scene-blade')}"/>` +
      stroke('M -8 -128 C -18 -110 -18 -88 -14 -76', '#FFFFFF', 6, 0.7) +
      `<rect x="-6" y="-66" width="12" height="16" fill="${COZY.steelShade}"/>` +
      `<rect x="-14" y="-54" width="28" height="54" rx="14" fill="${artUrl('scene-handle')}"/>`,
  };
}

/** A watering can, the spout to the left, the handle on the right. */
export function wateringCan(): Fragment {
  return {
    defs: verticalGradient('scene-can', [
      [0, COZY.can],
      [1, COZY.canShade],
    ]),
    body:
      stroke('M 50 -100 C 104 -106 104 -30 52 -34', COZY.canShade, 16) +
      `<path d="M -46 -46 L -142 -112 L -128 -126 L -44 -82 Z" fill="${COZY.canShade}"/>` +
      `<rect x="-160" y="-146" width="40" height="30" rx="10" transform="rotate(-35 -140 -131)" fill="${COZY.can}"/>` +
      `<path d="M -58 -104 Q -58 -116 -44 -116 L 44 -116 Q 58 -116 58 -104 L 54 -14 Q 52 0 38 0 L -38 0 Q -52 0 -54 -14 Z" fill="${artUrl('scene-can')}"/>` +
      `<rect x="-62" y="-122" width="124" height="22" rx="11" fill="${COZY.can}"/>` +
      stroke('M -40 -86 L -38 -30', '#FFFFFF', 8, 0.7) +
      heart(4, -58, 0.7, '#FFFFFF'),
  };
}

/** A glass jar of water, a cutting in it with its first roots. */
export function cuttingJar(): Fragment {
  return {
    defs:
      verticalGradient('scene-jar-water', [
        [0, COZY.water],
        [1, COZY.drop],
      ]) +
      linearGradient('scene-jar-leaf', [0, 0, 1, 1], [
        [0, LEAF.light],
        [1, LEAF.dark],
      ]),
    body:
      // The glass, behind the water.
      `<path d="M -54 -150 L 54 -150 Q 62 -150 62 -140 L 62 -18 Q 62 0 44 0 L -44 0 Q -62 0 -62 -18 L -62 -140 Q -62 -150 -54 -150 Z" fill="${COZY.glass}" opacity="0.75"/>` +
      // The cutting: stem, leaves, roots.
      stroke('M 4 -40 C 0 -100 12 -160 2 -214', LEAF.stem, 8) +
      `<path d="M 4 -196 C -20 -216 -66 -210 -70 -186 C -54 -164 -18 -170 4 -196 Z" fill="${artUrl('scene-jar-leaf')}"/>` +
      `<path d="M 6 -176 C 26 -200 72 -198 76 -174 C 58 -150 24 -156 6 -176 Z" fill="${artUrl('scene-jar-leaf')}"/>` +
      `<path d="M 2 -212 C -6 -236 10 -252 22 -250 C 28 -236 16 -218 2 -212 Z" fill="${LEAF.light}"/>` +
      stroke('M -8 -190 Q -34 -192 -52 -186', LEAF.vein, 4, 0.8) +
      stroke('M 18 -174 Q 42 -178 60 -174', LEAF.vein, 4, 0.8) +
      // The water, over the stem, then the roots, pale against it.
      `<path d="M -62 -96 Q 0 -86 62 -96 L 62 -18 Q 62 0 44 0 L -44 0 Q -62 0 -62 -18 Z" fill="${artUrl('scene-jar-water')}" opacity="0.75"/>` +
      stroke('M 4 -48 C -8 -34 -30 -34 -36 -14', '#FFF6E6', 6) +
      stroke('M 4 -48 C 8 -32 -4 -22 0 -8', '#FFF6E6', 6) +
      stroke('M 4 -48 C 18 -36 34 -36 38 -16', '#FFF6E6', 6) +
      stroke('M -20 -32 L -30 -40', '#FFF6E6', 4) +
      stroke('M 24 -34 L 34 -44', '#FFF6E6', 4) +
      `<path d="M -62 -96 Q 0 -86 62 -96" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.8"/>` +
      // Shine, the neck and a bit of twine.
      stroke('M -46 -124 L -46 -24', '#FFFFFF', 9, 0.8) +
      stroke('M -34 -30 L -34 -40', '#FFFFFF', 7, 0.8) +
      `<rect x="-60" y="-162" width="120" height="20" rx="10" fill="${COZY.glass}" opacity="0.9"/>` +
      stroke('M -58 -138 Q 0 -130 58 -138', COZY.woodShade, 6) +
      stroke('M 34 -134 C 44 -122 54 -126 50 -114', COZY.woodShade, 4.5) +
      stroke('M 34 -134 C 30 -120 38 -114 32 -104', COZY.woodShade, 4.5),
  };
}

/**
 * A magnifying glass held up to Pépin's right eye, which it shows bigger; in
 * the pot's coordinates. `skin` is the color of the pot's body behind the lens.
 */
export function magnifier(skin: string): Fragment {
  // Up and to the right, so the smile stays in sight.
  const [cx, cy, r] = [592, 682, 62];
  return {
    defs:
      `<clipPath id="${artId('scene-lens')}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>` +
      linearGradient('scene-lens-handle', [0, 0, 1, 1], [
        [0, COZY.wood],
        [1, COZY.woodShade],
      ]),
    body:
      stroke(`M ${cx + 46} ${cy + 46} L ${cx + 132} ${cy + 132}`, artUrl('scene-lens-handle'), 34) +
      `<g clip-path="${artUrl('scene-lens')}">` +
      `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${skin}"/>` +
      `<ellipse cx="${cx + 18}" cy="${cy + 56}" rx="36" ry="20" fill="${BLUSH}" opacity="0.85"/>` +
      `<ellipse cx="${cx - 10}" cy="${cy + 4}" rx="25" ry="34" fill="${INK}"/>` +
      `<circle cx="${cx - 1}" cy="${cy - 8}" r="9.5" fill="#fff"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#DFF3FA" opacity="0.3"/>` +
      stroke(`M ${cx - 42} ${cy - 18} A 46 46 0 0 1 ${cx - 18} ${cy - 44}`, '#FFFFFF', 9, 0.85) +
      `</g>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COZY.woodShade}" stroke-width="18"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="none" stroke="${COZY.wood}" stroke-width="6" opacity="0.9"/>`,
  };
}

/** Round reading glasses on Pépin's eyes, in the pot's coordinates. */
export function roundGlasses(): Fragment {
  const frame = '#9A6441';
  return {
    body:
      `<circle cx="462" cy="700" r="33" fill="#FFFFFF" opacity="0.18"/>` +
      `<circle cx="562" cy="700" r="33" fill="#FFFFFF" opacity="0.18"/>` +
      `<circle cx="462" cy="700" r="33" fill="none" stroke="${frame}" stroke-width="8"/>` +
      `<circle cx="562" cy="700" r="33" fill="none" stroke="${frame}" stroke-width="8"/>` +
      stroke('M 495 697 Q 512 686 529 697', frame, 7) +
      stroke('M 429 694 L 390 682', frame, 7) +
      stroke('M 595 694 L 634 682', frame, 7),
  };
}

/** An open book held in front of Pépin, under its smile, in the pot's coordinates. */
export function openBook(): Fragment {
  return {
    defs: verticalGradient('scene-book-cover', [
      [0, COZY.sage],
      [1, COZY.sageShade],
    ]),
    body:
      `<path d="M 512 790 Q 450 766 380 776 L 380 858 Q 450 850 512 872 Q 574 850 644 858 L 644 776 Q 574 766 512 790 Z" fill="${artUrl('scene-book-cover')}"/>` +
      `<path d="M 510 786 Q 454 764 392 770 L 392 846 Q 454 842 510 864 Z" fill="${COZY.paper}"/>` +
      `<path d="M 514 786 Q 570 764 632 770 L 632 846 Q 570 842 514 864 Z" fill="${COZY.paper}"/>` +
      stroke('M 412 792 Q 450 788 490 800', COZY.creamShade, 6) +
      stroke('M 412 810 Q 450 806 490 818', COZY.creamShade, 6) +
      stroke('M 412 828 Q 440 824 468 832', COZY.creamShade, 6) +
      `<path d="M 572 836 C 552 812 566 790 598 788 C 604 814 592 832 572 836 Z" fill="${LEAF.light}"/>` +
      stroke('M 574 832 Q 584 810 596 794', LEAF.vein, 3.5),
  };
}

/** A speech bubble with three dots, its tail at the bottom left, centered on (0, 0). */
export function speechBubble(color: string = COZY.paper): Fragment {
  return {
    body:
      `<path d="M -70 -52 L 70 -52 Q 104 -52 104 -18 L 104 14 Q 104 48 70 48 L -26 48 L -62 76 L -54 48 L -70 48 Q -104 48 -104 14 L -104 -18 Q -104 -52 -70 -52 Z" fill="${color}"/>` +
      `<circle cx="-38" cy="-2" r="12" fill="${COZY.sage}"/>` +
      `<circle cx="0" cy="-2" r="12" fill="${COZY.sageShade}"/>` +
      `<circle cx="38" cy="-2" r="12" fill="${COZY.sage}"/>`,
  };
}

/**
 * A thought bubble: a cloud centered on (0, 0), about 250 by 180, and two
 * little puffs trailing down to the left.
 */
export function thoughtBubble(color: string = COZY.paper): string {
  return [
    [-60, -30, 62],
    [10, -52, 70],
    [74, -18, 58],
    [52, 40, 54],
    [-18, 46, 58],
    [-78, 24, 50],
    [0, 0, 80],
    [-112, 88, 18],
    [-142, 122, 11],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`)
    .join('');
}
