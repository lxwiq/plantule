/**
 * The pot and its face, drawn exactly as in the logo. Every drawing uses the
 * logo's coordinates:
 *
 * - rim: x 318–706, y 552–626; body: x 348–676, y 612–830;
 * - the soil, where stems start, is hidden behind the rim around (512, 600);
 * - the face sits on the body: eyes at (462, 700) and (562, 700), mouth
 *   around (512, 740), cheeks at (420, 730) and (604, 730).
 *
 * `ART_VIEWBOX` frames a pot with a plant above it.
 */

import { BLUSH, INK, TONGUE, potPalette } from './palette';
import { artId, artUrl, verticalGradient } from './svg';
import type { Fragment, Mood } from './types';

/** The square shown of a plant in its pot: the pot at the bottom, room above for leaves. */
export const ART_VIEWBOX = '162 150 700 700';

/** The pot body's outline, e.g. to clip a pattern to it. */
export const POT_BODY_PATH = 'M 348 612 L 676 612 L 646 808 Q 642 830 618 830 L 406 830 Q 382 830 378 808 Z';

/** Clip path of the pot body, defined by `potFragment`: for patterns and anything painted on the pot. */
export const POT_CLIP = 'pot-clip';

/**
 * The pot: body, rim and the rim's highlight. `onBody` is painted on the body,
 * clipped to it (a pattern, a knitted sweater), under the rim's shadow.
 */
export function potFragment(colorId = 'terracotta', onBody?: Fragment): Fragment {
  const p = potPalette(colorId);
  const gradient = `pot-${colorId}`;
  const defs =
    verticalGradient(gradient, [
      [0, p.shadow],
      [0.12, p.body],
      [1, p.light],
    ]) +
    verticalGradient(`${gradient}-shade`, [
      [0, p.shadow],
      [1, p.body],
    ]) +
    `<clipPath id="${artId(POT_CLIP)}"><path d="${POT_BODY_PATH}"/></clipPath>` +
    (onBody?.defs ?? '');

  // With something painted on the body, the shadow under the rim goes over it.
  const painted = onBody
    ? `<g clip-path="${artUrl(POT_CLIP)}">${onBody.body}` +
      `<rect x="340" y="612" width="344" height="30" fill="${artUrl(`${gradient}-shade`)}" opacity="0.55"/></g>`
    : '';

  const body =
    `<path d="${POT_BODY_PATH}" fill="${artUrl(gradient)}"/>` +
    painted +
    `<rect x="318" y="552" width="388" height="74" rx="26" fill="${p.rim}"/>` +
    `<rect x="340" y="560" width="344" height="14" rx="7" fill="${p.rimHighlight}" opacity="0.8"/>`;
  return { defs, body };
}

const cheeks = (opacity = 0.85) =>
  `<ellipse cx="420" cy="730" rx="25" ry="15" fill="${BLUSH}" opacity="${opacity}"/>` +
  `<ellipse cx="604" cy="730" rx="25" ry="15" fill="${BLUSH}" opacity="${opacity}"/>`;

const openEyes =
  `<ellipse cx="462" cy="700" rx="15" ry="20" fill="${INK}"/>` +
  `<ellipse cx="562" cy="700" rx="15" ry="20" fill="${INK}"/>` +
  `<circle cx="467" cy="693" r="5.5" fill="#fff"/>` +
  `<circle cx="567" cy="693" r="5.5" fill="#fff"/>`;

const line = (d: string, width = 11) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

const smile = line('M 488 734 Q 512 758 536 734');

/** A heart centered on (x, y). */
const heart = (x: number, y: number, color: string) =>
  `<path transform="translate(${x} ${y}) scale(1.25)" d="M 0 13 C -24 -1 -19 -23 -6 -21 C -1 -20 0 -15 0 -12 C 0 -15 1 -20 6 -21 C 19 -23 24 -1 0 13 Z" fill="${color}"/>`;

const FACES: Record<Mood, string> = {
  // The logo's face.
  happy: cheeks() + openEyes + smile,
  // Eyes closed with pleasure, mouth open.
  joy:
    cheeks() +
    line('M 446 706 Q 462 684 478 706') +
    line('M 546 706 Q 562 684 578 706') +
    `<path d="M 484 728 Q 512 780 540 728 Q 512 736 484 728 Z" fill="${INK}"/>` +
    `<path d="M 498 752 Q 512 768 526 752 Q 512 744 498 752 Z" fill="${TONGUE}"/>`,
  // Eyes closed, a small calm mouth.
  sleepy:
    cheeks(0.7) +
    line('M 446 698 Q 462 714 478 698') +
    line('M 546 698 Q 562 714 578 698') +
    line('M 502 742 Q 512 750 522 742', 9),
  // Tongue out, and a drop of sweat.
  thirsty:
    cheeks(0.6) +
    openEyes +
    `<ellipse cx="512" cy="742" rx="15" ry="12" fill="${INK}"/>` +
    `<path d="M 503 746 Q 503 772 513 772 Q 523 772 522 746 Z" fill="${TONGUE}"/>` +
    `<path d="M 648 646 Q 636 668 636 678 A 12 12 0 0 0 660 678 Q 660 668 648 646 Z" fill="#8CC8F0"/>`,
  // Raised eyebrows, a wavy mouth.
  worried:
    cheeks(0.6) +
    openEyes +
    line('M 442 668 L 478 658', 9) +
    line('M 546 658 L 582 668', 9) +
    line('M 490 744 Q 501 734 512 744 Q 523 754 534 744', 9),
  // Heart eyes.
  love: cheeks() + heart(462, 700, '#E5484D') + heart(562, 700, '#E5484D') + smile,
};

/** The pot's face for a mood. */
export function faceFragment(mood: Mood = 'happy'): Fragment {
  return { body: FACES[mood] ?? FACES.happy };
}
