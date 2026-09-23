import { LEAF } from '../palette';
import { artUrl } from '../svg';
import type { Foliage } from '../types';

import { ellipse, fillPath, leafGradients, num, polar, smooth, stem, vein } from './shapes-foliage';
import type { Pt } from './shapes-foliage';

/** The coins, back to front: center, radius, and where the stalk leaves the main stem. */
const COINS: [Pt, number, Pt][] = [
  [[512, 236], 54, [512, 430]],
  [[404, 286], 52, [508, 444]],
  [[620, 282], 52, [516, 440]],
  [[318, 378], 48, [506, 470]],
  [[706, 374], 48, [518, 466]],
  [[452, 372], 50, [508, 456]],
  [[574, 368], 50, [516, 452]],
  [[292, 482], 42, [504, 510]],
  [[732, 478], 42, [520, 506]],
  [[410, 462], 44, [506, 496]],
  [[614, 458], 44, [518, 492]],
];

/** A round coin leaf, seen a little from below, its stalk under a pale dot. */
function coin([center, r, from]: [Pt, number, Pt]): string {
  // The stalk's direction: 0 up, 90 right.
  const heading = (Math.atan2(center[0] - from[0], from[1] - center[1]) * 180) / Math.PI;
  const dot = polar(center, heading + 180, r * 0.12);
  const paint = artUrl(center[0] < 512 ? 'pilea-leaf-l' : 'pilea-leaf-r');
  const veins = [-50, 0, 50]
    .map((turn) => vein(smooth([polar(dot, heading + turn, r * 0.18), polar(dot, heading + turn, r * 0.62)]), 4, 0.45))
    .join('');
  return (
    fillPath(ellipse(center, r, r * 0.9, heading - 90), paint) +
    veins +
    `<circle cx="${num(dot[0])}" cy="${num(dot[1])}" r="${num(r * 0.12)}" fill="${LEAF.vein}" opacity="0.85"/>`
  );
}

/** Pilea and peperomia: round coin leaves on thin stalks, like little umbrellas. */
export const pilea: Foliage = {
  label: 'Pilea et peperomia',
  back: () => ({
    defs: leafGradients('pilea-leaf'),
    body:
      stem(smooth([[512, 600], [510, 520], [512, 430]]), 13) +
      COINS.map(([center, , from]) => stem(smooth([from, [(from[0] + center[0]) / 2, (from[1] + center[1]) / 2 + 12], center]), 6)).join('') +
      COINS.map(coin).join(''),
  }),
};
