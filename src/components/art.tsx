import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { artSpecForSpecies, pepinSvg, plantArtSvg, type Mood, type Outfit, type PlantKind } from '@/art';
import { useSettings } from '@/db/hooks';

type ArtImageProps = {
  /** An SVG document from src/art. */
  xml: string;
  width: number;
  height?: number;
  /** Spoken by screen readers; without it the drawing is decorative and skipped. */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** Shows a drawing from src/art. */
export function ArtImage({ xml, width, height = width, label, style }: ArtImageProps) {
  return (
    <View
      style={[{ width, height }, style]}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}>
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
}

type PlantArtProps = {
  /** The plant's species, in any form; the family drawn is guessed from it. */
  species?: string | null;
  /** The family to draw, when already known; wins over `species`. */
  kind?: PlantKind;
  /** The pot's face; null for none. */
  mood?: Mood | null;
  size: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** A plant in its smiling pot, drawn in the logo's style. */
export function PlantArt({ species, kind, mood = 'happy', size, label, style }: PlantArtProps) {
  const xml = useMemo(
    () => plantArtSvg(kind ? { kind } : artSpecForSpecies(species), { mood }),
    [kind, species, mood],
  );
  return <ArtImage xml={xml} width={size} label={label} style={style} />;
}

type PepinProps = {
  mood?: Mood;
  size: number;
  /** Another outfit than the one saved, e.g. while trying clothes on. */
  outfit?: Partial<Outfit>;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** Pépin, the mascot, in the outfit chosen in its wardrobe. */
export function Pepin({ mood = 'happy', size, outfit, label, style }: PepinProps) {
  const { mascot_outfit } = useSettings();
  const worn = outfit ?? mascot_outfit;
  const xml = useMemo(() => pepinSvg(worn, { mood }), [worn, mood]);
  return <ArtImage xml={xml} width={size} label={label} style={style} />;
}
