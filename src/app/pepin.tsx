import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { INK, POT_COLORS } from '@/art/palette';
import { DEFAULT_MASCOT_NAME, pepinFragment, randomOutfit } from '@/art/pepin';
import { FOLIAGE } from '@/art/plants';
import { ART_VIEWBOX } from '@/art/pot';
import { svgDocument } from '@/art/svg';
import { DEFAULT_OUTFIT, PLANT_KINDS, type Outfit, type WardrobeSlot } from '@/art/types';
import { wardrobeSlot } from '@/art/wardrobe';
import { ArtImage, Pepin } from '@/components/art';
import { Button, Icon, icons, Screen, Text, TextField } from '@/components/ui';
import { updateSettings } from '@/db/repo';
import { useMascot } from '@/hooks/use-mascot';
import { wardrobeTitle } from '@/lib/greeting';
import { radius, spacing, touchTarget, useTheme } from '@/theme';

const NAME_MAX_LENGTH = 20;
const TILE = 88;

type Section = {
  slot: 'plant' | WardrobeSlot;
  title: string;
  /** The part of Pépin the tiles show, "minX minY width height" around the item. */
  frame: string;
};

const SECTIONS: Section[] = [
  { slot: 'plant', title: 'Plante', frame: ART_VIEWBOX },
  { slot: 'pattern', title: 'Motif', frame: '302 481 420 420' },
  { slot: 'head', title: 'Chapeau', frame: '242 300 540 540' },
  { slot: 'eyes', title: 'Lunettes', frame: '342 530 340 340' },
  { slot: 'neck', title: 'Cou', frame: '312 480 400 400' },
  { slot: 'held', title: 'Accessoire', frame: '262 250 600 600' },
];

type Choice = { id: string | null; label: string };

function choicesFor(slot: Section['slot']): Choice[] {
  if (slot === 'plant') return PLANT_KINDS.map((kind) => ({ id: kind, label: FOLIAGE[kind].label }));
  return [{ id: null, label: 'Aucun' }, ...wardrobeSlot(slot).map((item) => ({ id: item.id, label: item.label }))];
}

/** Tile drawings already made, by what they show: scrolling back and forth redraws nothing. */
const tileCache = new Map<string, string>();

/** Pépin in its plant and pot, wearing one item (or none), framed on it. */
function tileXml(section: Section, plant: Outfit['plant'], pot: string, id: string | null): string {
  const key = `${section.slot}|${plant}|${pot}|${id}`;
  let xml = tileCache.get(key);
  if (!xml) {
    const outfit: Outfit = { ...DEFAULT_OUTFIT, plant, pot, [section.slot]: id };
    xml = svgDocument(pepinFragment(outfit), { viewBox: section.frame });
    if (tileCache.size > 500) tileCache.clear();
    tileCache.set(key, xml);
  }
  return xml;
}

type TileProps = {
  xml: string;
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** A choice of the wardrobe: a small Pépin wearing it, and its name. */
function Tile({ xml, label, selected, onPress }: TileProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({ width: TILE, gap: spacing.xs, opacity: pressed ? 0.7 : 1 })}>
      <View
        style={{
          width: TILE,
          height: TILE,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 2,
          borderColor: selected ? theme.primary : 'transparent',
          backgroundColor: selected ? theme.primaryContainer : theme.surfaceContainer,
        }}>
        <ArtImage xml={xml} width={TILE - 10} />
        {selected && (
          <View
            style={{
              position: 'absolute',
              top: spacing.xs,
              right: spacing.xs,
              width: 22,
              height: 22,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.primary,
            }}>
            <Icon name={icons.check} size={14} color={theme.onPrimary} />
          </View>
        )}
      </View>
      <Text
        variant="caption"
        tone={selected ? 'primary' : 'secondary'}
        numberOfLines={2}
        style={{ textAlign: 'center', fontWeight: selected ? '600' : undefined }}>
        {label}
      </Text>
    </Pressable>
  );
}

type SlotRowProps = {
  section: Section;
  outfit: Outfit;
  onChoose: (id: string | null) => void;
};

/** One shelf of the wardrobe: every choice for a slot, in a row that scrolls sideways. */
function SlotRow({ section, outfit, onChoose }: SlotRowProps) {
  const choices = choicesFor(section.slot);
  const selected = outfit[section.slot];
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="overline" tone="secondary" accessibilityRole="header" style={{ paddingHorizontal: spacing.xs }}>
        {section.title}
      </Text>
      <FlatList
        horizontal
        data={choices}
        keyExtractor={(choice) => choice.id ?? 'none'}
        extraData={`${selected}|${outfit.plant}|${outfit.pot}`}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={4}
        windowSize={5}
        // Bleed to the screen edges, so the row scrolls under the margins.
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        renderItem={({ item }) => (
          <Tile
            xml={tileXml(section, outfit.plant, outfit.pot, item.id)}
            label={item.label}
            selected={item.id === selected}
            onPress={() => onChoose(item.id)}
          />
        )}
      />
    </View>
  );
}

/** The pot colors, as round swatches. */
function PotSwatches({ selected, onChoose }: { selected: string; onChoose: (id: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="overline" tone="secondary" accessibilityRole="header" style={{ paddingHorizontal: spacing.xs }}>
        Pot
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm }}>
        {Object.entries(POT_COLORS).map(([id, { label, palette }]) => {
          const isSelected = id === selected;
          return (
            <Pressable
              key={id}
              onPress={() => onChoose(id)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => ({
                width: '20%',
                minHeight: touchTarget,
                alignItems: 'center',
                gap: spacing.xs,
                opacity: pressed ? 0.7 : 1,
              })}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isSelected ? 3 : 0,
                  borderColor: theme.primary,
                  padding: 3,
                }}>
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: palette.body,
                    borderWidth: 4,
                    borderColor: palette.rim,
                  }}>
                  {isSelected && <Icon name={icons.check} size={18} color={palette.ink ?? INK} />}
                </View>
              </View>
              <Text
                variant="caption"
                tone={isSelected ? 'primary' : 'secondary'}
                numberOfLines={2}
                style={{ textAlign: 'center' }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Pépin, big, wearing the outfit: tapping it makes it happy. */
function Preview({ name, outfit }: { name: string; outfit: Outfit }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(width - spacing.lg * 4, 240);
  const [taps, setTaps] = useState(0);
  const [pressed, setPressed] = useState(false);
  const joyful = taps > 0;

  // The joy lasts a moment after the last tap.
  useEffect(() => {
    if (taps === 0) return;
    const timer = setTimeout(() => setTaps(0), 1200);
    return () => clearTimeout(timer);
  }, [taps]);

  return (
    <Pressable
      onPress={() => {
        setTaps((n) => n + 1);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint="Fais-lui un câlin"
      style={{
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        backgroundColor: theme.primaryContainer,
      }}>
      <Animated.View
        style={{
          transformOrigin: 'bottom',
          transform: [{ scale: pressed ? 0.96 : 1 }],
          transitionProperty: 'transform',
          transitionDuration: 120,
          transitionTimingFunction: 'ease-out',
        }}>
        <Pepin mood={joyful ? 'joy' : 'happy'} size={size} outfit={outfit} />
      </Animated.View>
    </Pressable>
  );
}

/** The name field: saved as it's typed, back to « Pépin » when left empty. */
function NameField({ name }: { name: string }) {
  const [draft, setDraft] = useState(name);
  return (
    <TextField
      label="Son nom"
      value={draft}
      onChangeText={(text) => {
        setDraft(text);
        const clean = text.trim();
        if (clean) updateSettings({ mascot_name: clean });
      }}
      onBlur={() => {
        const clean = draft.trim() || DEFAULT_MASCOT_NAME;
        setDraft(clean);
        updateSettings({ mascot_name: clean });
      }}
      maxLength={NAME_MAX_LENGTH}
      autoCapitalize="words"
      autoCorrect={false}
      returnKeyType="done"
      hint={`${NAME_MAX_LENGTH} caractères au plus.`}
    />
  );
}

/** Pépin's wardrobe: its name, its plant and pot, and what it wears. */
export default function PepinScreen() {
  const { name, outfit } = useMascot();

  const wear = (changes: Partial<Outfit>) => {
    void Haptics.selectionAsync();
    updateSettings({ mascot_outfit: { ...outfit, ...changes } });
  };
  const isDefault = (Object.keys(DEFAULT_OUTFIT) as (keyof Outfit)[]).every((key) => outfit[key] === DEFAULT_OUTFIT[key]);

  return (
    <>
      <Stack.Screen options={{ title: wardrobeTitle(name) }} />
      <Screen>
        <Preview name={name} outfit={outfit} />

        <NameField name={name} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button
            title="Au hasard"
            icon={icons.sparkles}
            variant="tonal"
            onPress={() => wear(randomOutfit(outfit))}
            style={{ flexGrow: 1 }}
          />
          <Button
            title="Tenue d’origine"
            icon={icons.retry}
            variant="outlined"
            disabled={isDefault}
            onPress={() => wear(DEFAULT_OUTFIT)}
            style={{ flexGrow: 1 }}
          />
        </View>

        <SlotRow section={SECTIONS[0]} outfit={outfit} onChoose={(id) => id && wear({ plant: id as Outfit['plant'] })} />
        <PotSwatches selected={outfit.pot} onChoose={(pot) => wear({ pot })} />
        {SECTIONS.slice(1).map((section) => (
          <SlotRow key={section.slot} section={section} outfit={outfit} onChoose={(id) => wear({ [section.slot]: id })} />
        ))}
      </Screen>
    </>
  );
}
