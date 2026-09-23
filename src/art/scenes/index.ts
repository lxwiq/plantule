/**
 * Cozy scenes starring Pépin, for the empty and quiet moments of the app: all
 * care done, no plant yet, an empty wishlist… Each scene dresses Pépin in the
 * outfit chosen in its wardrobe.
 */

import { potPalette } from '../palette';
import { normalizeOutfit, pepinFragment } from '../pepin';
import { plantArtFragment } from '../plant-art';
import { combine, svgDocument, transformed } from '../svg';
import type { Fragment, Mood, Outfit } from '../types';
import { blob, GROUND, groundShadow, r1, SCENE_VIEWBOX, type BlobShape, type Tone } from './backdrop';
import {
  COZY,
  cuttingJar,
  drop,
  heart,
  littlePot,
  magnifier,
  moon,
  mug,
  openBook,
  plaid,
  questionMark,
  roundGlasses,
  seedPacket,
  seeds,
  snore,
  sparkle,
  speechBubble,
  steam,
  thoughtBubble,
  trowel,
  wateringCan,
} from './props';

export { SCENE_HEIGHT, SCENE_VIEWBOX, SCENE_WIDTH } from './backdrop';

export const SCENES = ['resting', 'welcome', 'watering', 'cutting', 'dreaming', 'searching', 'chatting'] as const;

export type SceneId = (typeof SCENES)[number];

/** How big Pépin stands in a scene. */
const PEPIN_SCALE = 0.6;

/** Pépin standing on the ground at x, with what it wears or holds in the scene (in the pot's coordinates). */
function pepinAt(
  outfit: Outfit,
  mood: Mood,
  x: number,
  extras: { back?: Fragment; front?: Fragment } = {},
  scale = PEPIN_SCALE,
): Fragment {
  return transformed(
    combine(extras.back, pepinFragment(outfit, mood), extras.front),
    `translate(${r1(x - 512 * scale)} ${r1(GROUND - 830 * scale)}) scale(${scale})`,
  );
}

/** A prop placed at (x, y), turned by `angle` degrees and scaled. */
function place(fragment: Fragment, x: number, y: number, scale = 1, angle = 0): Fragment {
  const turn = angle ? ` rotate(${angle})` : '';
  const size = scale !== 1 ? ` scale(${scale})` : '';
  return transformed(fragment, `translate(${x} ${y})${turn}${size}`);
}

/** Loose markup (sparkles, hearts) as a fragment. */
const loose = (...body: string[]): Fragment => ({ body: body.join('') });

type Draw = (outfit: Outfit, dark: boolean, withBackdrop: boolean) => Fragment;

/** What a scene draws with, in the light or dark version. */
type Kit = {
  dark: boolean;
  /** A shadow on the ground under something `width` wide. */
  shadow: (x: number, width: number) => Fragment;
  /** Twinkles in the air, as [x, y, size]. */
  twinkles: (...points: [number, number, number][]) => Fragment;
  /** The fill of a speech or thought bubble. */
  bubble: string;
};

/** A scene: its backdrop, then what stands on it. */
function scene(tone: Tone, shape: BlobShape, draw: (outfit: Outfit, kit: Kit) => Fragment[]): Draw {
  return (outfit, dark, withBackdrop) => {
    const kit: Kit = {
      dark,
      shadow: (x, width) => groundShadow(tone, dark, x, width),
      twinkles: (...points) =>
        loose(...points.map(([x, y, size]) => sparkle(x, y, size, dark ? COZY.butter : COZY.butterShade))),
      bubble: dark ? '#F3ECE2' : '#FFFFFF',
    };
    return combine(withBackdrop && blob(tone, dark, shape), ...draw(outfit, kit));
  };
}

const DRAW: Record<SceneId, Draw> = {
  // All care done for today: Pépin asleep in its plaid, a mug of cocoa beside.
  resting: scene('dusk', [1, 1.04, 0.96, 1.02, 0.97, 1.03, 0.98, 1.01], (outfit, { dark, shadow, twinkles }) => [
    place(moon(), 650, 150),
    twinkles([566, 118, 32], [716, 250, 24], [170, 170, 28], [230, 112, 18]),
    shadow(320, 300),
    shadow(574, 130),
    pepinAt({ ...outfit, held: null }, 'sleepy', 320, { front: plaid() }),
    place(mug(), 574, GROUND, 1.2),
    loose(steam(574, GROUND - 130, '#FFFFFF', dark ? 0.55 : 0.95)),
    loose(snore(474, 286, dark ? '#8F8BCB' : COZY.lavender)),
  ]),

  // No plant yet: Pépin, a packet of seeds, a pot of soil and a trowel.
  welcome: scene('meadow', [1.02, 0.97, 1.03, 0.98, 1, 1.02, 0.96, 1.01], (outfit, { shadow, twinkles }) => [
    twinkles([600, 190, 32], [676, 262, 20], [160, 210, 24]),
    shadow(290, 260),
    shadow(590, 290),
    pepinAt(outfit, 'happy', 290),
    place(trowel(), 700, GROUND - 4, 1, 16),
    place(littlePot(), 616, GROUND + 2),
    place(seedPacket(), 510, GROUND + 4, 1.05),
    loose(`<g transform="translate(446 ${GROUND + 10})">${seeds()}</g>`),
  ]),

  // Plants without reminders: Pépin under a shower from its watering can.
  watering: scene('meadow', [0.98, 1.03, 0.99, 1.02, 1.01, 0.97, 1.03, 0.99], (outfit, { shadow, twinkles }) => [
    twinkles([640, 390, 28], [700, 330, 18], [150, 230, 22]),
    shadow(290, 260),
    pepinAt({ ...outfit, held: null }, 'joy', 290),
    loose(drop(446, 262, 1.2), drop(410, 286, 1.4), drop(458, 306, 1.1), drop(382, 250, 1.1)),
    place(wateringCan(), 690, 276, 1.1, -32),
  ]),

  // No cutting yet: a cutting rooting in a jar of water, next to Pépin.
  cutting: scene('meadow', [1.01, 0.97, 1.02, 1, 0.97, 1.03, 0.99, 1.02], (outfit, { shadow, twinkles }) => [
    twinkles([680, 200, 28], [450, 170, 20], [160, 220, 22]),
    shadow(290, 270),
    shadow(570, 180),
    pepinAt(outfit, 'happy', 290),
    place(cuttingJar(), 570, GROUND, 1.25),
  ]),

  // An empty wishlist: Pépin dreaming of a new plant.
  dreaming: scene('peach', [1, 1.03, 0.98, 1, 1.02, 0.97, 1.02, 0.99], (outfit, { shadow, bubble }) => [
    loose(`<g transform="translate(566 196)">${thoughtBubble(bubble)}</g>`),
    place(plantArtFragment({ kind: 'monstera' }, 'happy'), r1(566 - 512 * 0.25), r1(196 + 82 - 830 * 0.25), 0.25),
    loose(heart(696, 116, 0.6), heart(432, 106, 0.45)),
    shadow(270, 260),
    pepinAt(outfit, 'love', 270),
  ]),

  // Scan intro, "introuvable": Pépin looking through a magnifying glass.
  searching: scene('meadow', [1.02, 0.98, 1, 1.03, 0.97, 1.01, 1.02, 0.97], (outfit, { dark, shadow, twinkles }) => [
    twinkles([190, 200, 26], [676, 330, 18], [238, 136, 16]),
    loose(questionMark(612, 210, dark ? '#8F8BCB' : COZY.lavender)),
    shadow(390, 300),
    pepinAt({ ...outfit, held: null, eyes: null }, 'happy', 370, { front: magnifier(potPalette(outfit.pot).body) }),
  ]),

  // The plant expert's empty conversation: Pépin with its glasses and a book.
  chatting: scene('meadow', [0.99, 1.02, 1, 0.97, 1.03, 0.99, 1, 1.02], (outfit, { shadow, bubble }) => [
    place(speechBubble(bubble), 590, 190, 0.95),
    shadow(310, 280),
    pepinAt({ ...outfit, held: null }, 'happy', 310, {
      front: combine(outfit.eyes ? null : roundGlasses(), openBook()),
    }),
  ]),
};

/**
 * Keeps the first of the defs sharing an id: two drawings in one scene (Pépin
 * and a plant in a terracotta pot) define the same pot gradient.
 */
function dedupeDefs(fragment: Fragment): Fragment {
  const seen = new Set<string>();
  const defs = (fragment.defs ?? '').replace(
    /<(linearGradient|radialGradient|clipPath)\b[^>]*?\sid="([^"]+)"[^>]*>[\s\S]*?<\/\1>/g,
    (element, _tag: string, id: string) => {
      if (seen.has(id)) return '';
      seen.add(id);
      return element;
    },
  );
  return { defs, body: fragment.body };
}

type SceneOptions = {
  /** What Pépin wears; the default outfit when missing. */
  outfit?: Partial<Outfit> | null;
  /** Colors for the app's dark mode. */
  dark?: boolean;
  /** The soft blob behind the scene; leave it out on a colored card. True by default. */
  backdrop?: boolean;
};

/** The SVG document of a scene, transparent around its backdrop, framed by SCENE_VIEWBOX (4:3). */
export function sceneSvg(id: SceneId, { outfit, dark = false, backdrop = true }: SceneOptions = {}): string {
  const draw = DRAW[id] ?? DRAW.welcome;
  return svgDocument(dedupeDefs(draw(normalizeOutfit(outfit), dark, backdrop)), { viewBox: SCENE_VIEWBOX });
}
