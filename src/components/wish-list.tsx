import { router } from 'expo-router';

import { PlantThumb } from '@/components/plant-thumb';
import { EmptyState, icons, ListRow, ListSection } from '@/components/ui';
import type { Wish } from '@/db/types';
import { formatShortDate, toDateString } from '@/lib/dates';
import { findReference } from '@/lib/plant-reference';
import { capitalize } from '@/lib/text';
import { wishSummary } from '@/lib/wishes';

/** The wishlist, on the Plantes tab, with what the reference base says of each species. */
export function WishList({ wishes }: { wishes: Wish[] }) {
  if (wishes.length === 0) {
    return (
      <EmptyState
        icon={icons.star}
        title="Aucune envie"
        message="Note les plantes que tu aimerais avoir. Pour les espèces connues, Plantule te dit leur lumière, leur arrosage et si elles sont toxiques pour tes animaux."
        action={{ label: 'Nouvelle envie', icon: icons.add, onPress: () => router.push('/wish/new') }}
      />
    );
  }
  return (
    <ListSection footer="Tes envies sont les mêmes pour tous tes lieux.">
      {wishes.map((wish) => {
        const reference = findReference(wish.species);
        return (
          <ListRow
            key={wish.id}
            leading={<PlantThumb species={wish.species} mood="love" size={48} />}
            title={capitalize(wish.species)}
            subtitle={
              reference
                ? wishSummary(reference)
                : (wish.note ?? `Ajoutée le ${formatShortDate(toDateString(new Date(wish.created_at)))}`)
            }
            onPress={() => router.push({ pathname: '/wish/[id]', params: { id: wish.id } })}
            chevron
          />
        );
      })}
    </ListSection>
  );
}
