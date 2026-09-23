import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  HeaderButton,
  IconButton,
  icons,
  ListRow,
  ListSection,
  Screen,
  Text,
  TextField,
} from '@/components/ui';
import { useCurrentPlace } from '@/db/hooks';
import { renamePlace, setPlaceLocation } from '@/db/repo';
import type { Place, PlaceLocation } from '@/db/types';
import { useTownSearch, type TownSearch } from '@/hooks/use-town-search';
import { closeScreen } from '@/lib/navigation';
import { RAIN_THRESHOLD_MM } from '@/lib/weather';
import { spacing } from '@/theme';
import { refreshWeather } from '@/weather/sync';

const WEATHER_FOOTER =
  `Pour tes plantes des pièces en extérieur : après une bonne pluie (${RAIN_THRESHOLD_MM} mm ou plus), leur arrosage compte comme fait, et Aujourd’hui te dit quand il va pleuvoir. ` +
  'Seules les coordonnées de la ville sont envoyées à Open-Meteo, un service météo gratuit.';

function placeLocation(place: Place): PlaceLocation | null {
  const { location_name, latitude, longitude } = place;
  return location_name && latitude !== null && longitude !== null
    ? { name: location_name, latitude, longitude }
    : null;
}

const sameLocation = (a: PlaceLocation | null, b: PlaceLocation | null) =>
  a === b || (!!a && !!b && a.name === b.name && a.latitude === b.latitude && a.longitude === b.longitude);

function searchHint({ status, towns }: TownSearch): { hint?: string; error?: string } {
  if (status === 'searching') return { hint: 'Recherche…' };
  if (status === 'error') return { error: 'Recherche impossible : vérifie ta connexion.' };
  if (status === 'done' && towns.length === 0) return { hint: 'Aucune ville trouvée.' };
  return {};
}

export default function EditPlace() {
  const place = useCurrentPlace();
  const [name, setName] = useState(place.name);
  const [location, setLocation] = useState(() => placeLocation(place));
  const [query, setQuery] = useState('');
  const search = useTownSearch(location ? '' : query);

  const renamed = name.trim() !== place.name;
  const moved = !sameLocation(location, placeLocation(place));
  const canSave = name.trim().length > 0 && (renamed || moved);

  const save = () => {
    if (!canSave) return;
    if (renamed) renamePlace(place.id, name);
    if (moved) {
      setPlaceLocation(place.id, location);
      void refreshWeather();
    }
    closeScreen();
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Enregistrer" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <TextField
          label="Nom du lieu"
          value={name}
          onChangeText={setName}
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={save}
        />

        {location ? (
          <ListSection title="Météo" footer={WEATHER_FOOTER}>
            <ListRow
              leading={icons.rain}
              title={location.name}
              subtitle="Ville pour la pluie"
              trailing={
                <IconButton
                  icon={icons.close}
                  label="Retirer la ville"
                  onPress={() => {
                    setQuery('');
                    setLocation(null);
                  }}
                />
              }
            />
          </ListSection>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <TextField
              label="Ville pour la météo (facultatif)"
              placeholder="Nantes, Lyon…"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={80}
              returnKeyType="search"
              {...searchHint(search)}
            />
            {search.towns.length > 0 && (
              <ListSection>
                {search.towns.map((town) => (
                  <ListRow
                    key={`${town.latitude},${town.longitude}`}
                    leading={icons.home}
                    title={town.name}
                    subtitle={town.region}
                    onPress={() =>
                      setLocation({ name: town.name, latitude: town.latitude, longitude: town.longitude })
                    }
                  />
                ))}
              </ListSection>
            )}
            <Text variant="caption" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
              {WEATHER_FOOTER}
            </Text>
          </View>
        )}
      </Screen>
    </>
  );
}
