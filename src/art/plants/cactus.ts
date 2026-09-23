import { LEAF } from '../palette';
import { artUrl, linearGradient } from '../svg';
import type { Foliage } from '../types';

import { bloom, bloomHeart, colorKey, fill, line, shades } from './shapes-bloom';

const PINK = '#F59BB6';

/** Cream of the spines. */
const SPINE = '#FFF4DC';

/** Tufts of three tiny spines along the ribs and on the arms. */
const SPINES: [x: number, y: number][] = [
  [512, 336],
  [512, 404],
  [512, 472],
  [512, 540],
  [462, 360],
  [455, 436],
  [456, 512],
  [562, 360],
  [569, 436],
  [568, 512],
  [364, 428],
  [654, 376],
];

const BODY = 'M 424 600 C 418 500 416 410 422 346 C 432 228 592 228 602 346 C 608 410 606 500 600 600 Z';

/** A chubby column cactus with two little arms and a flower on top. */
export const cactus: Foliage = {
  label: 'Cactus',
  back: ({ accent = PINK }) => {
    const s = shades(accent);
    const bloomId = `cactus-bloom-${colorKey(accent)}`;
    return {
      defs:
        linearGradient('cactus-body', [0, 0, 1, 1], [
          [0, LEAF.light],
          [1, LEAF.dark],
        ]) +
        linearGradient('cactus-arm', [0, 0, 1, 1], [
          [0, LEAF.light],
          [1, LEAF.deep],
        ]) +
        linearGradient(bloomId, [0, 0, 1, 1], [
          [0, s.light],
          [1, s.base],
        ]),
      body:
        // Arms first, so the body hides where they join.
        line('M 460 482 L 398 482 Q 364 482 364 448 L 364 404', artUrl('cactus-arm'), 66) +
        line('M 570 420 L 622 420 Q 654 420 654 388 L 654 356', artUrl('cactus-arm'), 56) +
        fill(BODY, artUrl('cactus-body')) +
        // Ribs.
        line('M 512 284 L 512 600', LEAF.vein, 9, 0.55) +
        line('M 470 296 Q 446 420 456 600', LEAF.vein, 8, 0.5) +
        line('M 554 296 Q 578 420 568 600', LEAF.vein, 8, 0.5) +
        line('M 364 412 L 364 440', LEAF.vein, 7, 0.5) +
        line('M 654 364 L 654 384', LEAF.vein, 6, 0.5) +
        SPINES.map(([x, y]) =>
          line(`M ${x - 8} ${y - 5} L ${x} ${y} L ${x + 8} ${y - 5} M ${x} ${y} L ${x} ${y - 9}`, SPINE, 4, 0.9),
        ).join('') +
        bloom([512, 246], 46, artUrl(bloomId), bloomHeart(accent), { turn: 36 }) +
        bloom([364, 374], 24, artUrl(bloomId), bloomHeart(accent), { turn: 10 }),
    };
  },
};
