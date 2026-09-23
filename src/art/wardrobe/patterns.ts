/**
 * Patterns painted on Pépin's pot. Each is clipped to the pot body (x 348–676,
 * y 612–830) and keeps its motifs off the face; colors follow the pot, cream
 * on the tinted pots and deeper tones on the pale ones.
 */

import { mix } from '../svg';
import type { WardrobeItem, WearContext } from '../types';
import { GOLD, WOOL, clearOfFace, flower, heartPath, isPalePot, r1, star } from './common';

/** Positions of a staggered grid over the body, off the face. */
function scatter(step: number, rowStep: number, r: number, y0 = 640): [x: number, y: number, i: number][] {
  const spots: [number, number, number][] = [];
  let i = 0;
  for (let row = 0; y0 + row * rowStep < 840; row++) {
    const y = y0 + row * rowStep;
    for (let x = 340 + (row % 2) * (step / 2); x < 690; x += step) {
      if (clearOfFace(x, y, r)) spots.push([x, y, i]);
      i++;
    }
  }
  return spots;
}

/**
 * The color of a pattern's motifs: cream on tinted pots, `pale` on the pale
 * ones and `dark` on the dark ones.
 */
function motif({ pot }: WearContext, pale: string, dark: string = WOOL.cream.light): string {
  if (isPalePot(pot)) return pale;
  return pot.ink ? dark : WOOL.cream.light;
}

/** For motifs crossing the face on dark pots, whose face is drawn in cream: a softer cream. */
const softCream = ({ pot }: WearContext) => mix(pot.body, WOOL.cream.light, 0.5);

const breton: WardrobeItem = {
  id: 'breton',
  slot: 'pattern',
  label: 'Marinière',
  draw: (context) => {
    const color = motif(context, WOOL.navy.light, softCream(context));
    let stripes = '';
    for (let y = 648; y < 840; y += 38) stripes += `<rect x="340" y="${y}" width="350" height="15" fill="${color}"/>`;
    return { front: { body: `<g opacity="0.8">${stripes}</g>` } };
  },
};

const dots: WardrobeItem = {
  id: 'dots',
  slot: 'pattern',
  label: 'Pois',
  draw: (context) => {
    const color = motif(context, WOOL.red.light);
    const body = scatter(40, 34, 9)
      .map(([x, y]) => `<circle cx="${r1(x)}" cy="${y}" r="9" fill="${color}"/>`)
      .join('');
    return { front: { body: `<g opacity="0.8">${body}</g>` } };
  },
};

const hearts: WardrobeItem = {
  id: 'hearts',
  slot: 'pattern',
  label: 'Cœurs',
  draw: (context) => {
    const color = motif(context, WOOL.red.light, WOOL.pink.light);
    const body = scatter(58, 44, 14, 652)
      .map(
        ([x, y, i]) =>
          `<path transform="rotate(${i % 2 ? 12 : -12} ${r1(x)} ${y})" d="${heartPath(x, y, 14)}" fill="${color}"/>`,
      )
      .join('');
    return { front: { body: `<g opacity="0.85">${body}</g>` } };
  },
};

const flowers: WardrobeItem = {
  id: 'flowers',
  slot: 'pattern',
  label: 'Fleurs',
  draw: (context) => {
    const petal = motif(context, WOOL.pink.shade);
    const body = scatter(62, 46, 17, 650)
      .map(([x, y, i]) => flower(x, y, 17, petal, GOLD.shade, i * 23))
      .join('');
    return { front: { body: `<g opacity="0.9">${body}</g>` } };
  },
};

const gingham: WardrobeItem = {
  id: 'gingham',
  slot: 'pattern',
  label: 'Vichy',
  draw: (context) => {
    const color = motif(context, mix(context.pot.shadow, WOOL.red.shade, 0.35), softCream(context));
    // Each band is see-through: where two cross, the square is deeper.
    const band = (x: number, y: number, w: number, h: number) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="0.32"/>`;
    let bands = '';
    for (let y = 630; y < 840; y += 40) bands += band(340, y, 350, 20);
    for (let x = 346; x < 690; x += 40) bands += band(x, 600, 20, 240);
    return { front: { body: bands } };
  },
};

const sweater: WardrobeItem = {
  id: 'sweater',
  slot: 'pattern',
  label: 'Pull tricoté',
  draw: ({ pot }) => {
    const wool = mix(pot.body, WOOL.cream.light, 0.12);
    const shade = mix(wool, pot.shadow, 0.7);
    const shine = mix(wool, '#FFFFFF', 0.4);
    // Columns of chunky V stitches between cables, in one path.
    const cables = [376, 512, 648];
    let stitches = '';
    let gutters = '';
    for (const x of [420, 466, 558, 604]) {
      for (let y = 628; y < 800; y += 17) stitches += `M ${x - 10} ${y} L ${x} ${y + 9} L ${x + 10} ${y} `;
    }
    for (const x of [398, 443, 489, 535, 581, 626]) gutters += `M ${x} 620 L ${x} 800 `;
    // Cables: a rope of tilted twists, a shaded one under a lit one.
    let rope = '';
    for (const cx of cables) {
      for (let y = 630; y < 800; y += 20) {
        rope +=
          `<ellipse cx="${cx + 2}" cy="${y + 3}" rx="15" ry="8" transform="rotate(-38 ${cx + 2} ${y + 3})" fill="${shade}"/>` +
          `<ellipse cx="${cx}" cy="${y}" rx="14" ry="7" transform="rotate(-38 ${cx} ${y})" fill="${shine}"/>`;
      }
    }
    // Ribbing at the hem.
    let ribs = '';
    for (let x = 352; x < 680; x += 14) ribs += `M ${x} 804 L ${x} 834 `;
    return {
      front: {
        body:
          `<rect x="340" y="600" width="350" height="240" fill="${wool}"/>` +
          `<path d="${gutters}" fill="none" stroke="${shade}" stroke-width="4" opacity="0.5"/>` +
          `<path d="${stitches}" fill="none" stroke="${shine}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>` +
          rope +
          `<rect x="340" y="798" width="350" height="40" fill="${mix(wool, pot.shadow, 0.3)}"/>` +
          `<path d="${ribs}" fill="none" stroke="${shine}" stroke-width="6" stroke-linecap="round" opacity="0.55"/>`,
      },
    };
  },
};

const stars: WardrobeItem = {
  id: 'stars',
  slot: 'pattern',
  label: 'Étoiles',
  draw: ({ pot }) => {
    const color = isPalePot(pot) ? GOLD.shade : GOLD.light;
    const body = scatter(56, 42, 13, 648)
      .map(([x, y, i]) =>
        i % 3 === 1
          ? `<circle cx="${r1(x)}" cy="${y}" r="5" fill="${color}"/>`
          : star(x, y, i % 3 ? 13 : 10, color, i * 17),
      )
      .join('');
    return { front: { body: `<g opacity="0.9">${body}</g>` } };
  },
};

/** The patterns, coziest last. */
export const PATTERNS: WardrobeItem[] = [breton, dots, hearts, flowers, gingham, stars, sweater];
