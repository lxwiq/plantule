import { router } from 'expo-router';
import { Alert } from 'react-native';

import { Button, Icon, icons, ListRow, ListSection, Screen, ScreenTitle } from '@/components/ui';
import { selectPlace, useCurrentPlace, usePlaces, usePlants, useRooms } from '@/db/hooks';
import { deletePlace } from '@/db/repo';
import { LIGHT_LABELS, plural } from '@/lib/labels';
import { useTheme } from '@/theme';

/** The current place: its rooms, the other places, and the settings. */
export default function PlaceScreen() {
  const theme = useTheme();
  const place = useCurrentPlace();
  const places = usePlaces();
  const rooms = useRooms(place.id);
  const plants = usePlants(place.id);

  const plantCount = (roomId: string) => plants.filter((p) => p.room_id === roomId).length;

  const confirmDelete = () => {
    if (places.length === 1) {
      Alert.alert(
        'Impossible de supprimer ce lieu',
        'C’est ton seul lieu. Crée-en un autre d’abord, ou renomme celui-ci.',
      );
      return;
    }
    Alert.alert(
      `Supprimer « ${place.name} » ?`,
      `Ses pièces et ses ${plural(plants.length, 'plante')}, avec leurs soins, leur journal et leurs photos, seront supprimées. C’est définitif.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const next = places.find((p) => p.id !== place.id);
            if (next) selectPlace(next.id);
            deletePlace(place.id);
          },
        },
      ],
    );
  };

  return (
    <Screen topInset>
      <ScreenTitle
        title={place.name}
        subtitle={`${plural(rooms.length, 'pièce')} · ${plural(plants.length, 'plante')}`}
      />

      <ListSection
        title="Pièces et zones"
        action={
          <Button title="Ajouter" icon={icons.add} variant="text" size="sm" onPress={() => router.push('/room/new')} />
        }
        footer={
          rooms.length === 0
            ? 'Ajoute les pièces (salon, chambre…) ou les zones extérieures (balcon, jardin) pour ranger tes plantes.'
            : undefined
        }>
        {rooms.map((room) => (
          <ListRow
            key={room.id}
            leading={room.is_outdoor ? icons.outdoor : icons.room}
            title={room.name}
            subtitle={[room.light ? LIGHT_LABELS[room.light] : null, plural(plantCount(room.id), 'plante')]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}
            chevron
          />
        ))}
      </ListSection>

      <ListSection
        title="Mes lieux"
        footer={places.length === 1 ? 'Une maison de campagne, un bureau ? Chaque lieu a ses pièces et ses plantes.' : undefined}>
        {places.length > 1 &&
          places.map((p) => (
            <ListRow
              key={p.id}
              leading={icons.home}
              title={p.name}
              trailing={p.id === place.id ? <Icon name={icons.check} color={theme.primary} /> : undefined}
              onPress={p.id === place.id ? undefined : () => selectPlace(p.id)}
              accessibilityHint="Afficher ce lieu"
            />
          ))}
        <ListRow
          leading={icons.edit}
          title="Modifier ce lieu"
          subtitle={place.location_name ? `Météo : ${place.location_name}` : 'Nom, ville pour la météo'}
          onPress={() => router.push('/place/edit')}
          chevron
        />
        <ListRow leading={icons.add} title="Ajouter un lieu" onPress={() => router.push('/place/new')} chevron />
      </ListSection>

      <ListSection>
        <ListRow
          leading={icons.settings}
          title="Réglages"
          subtitle="Résumé quotidien, sauvegarde"
          onPress={() => router.push('/settings')}
          chevron
        />
      </ListSection>

      <ListSection>
        <ListRow leading={icons.delete} title="Supprimer ce lieu" destructive onPress={confirmDelete} />
      </ListSection>
    </Screen>
  );
}
