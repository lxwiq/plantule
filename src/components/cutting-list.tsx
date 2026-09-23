import { router } from 'expo-router';

import { PlantThumb } from '@/components/plant-thumb';
import { Scene } from '@/components/scene';
import { EmptyState, icons, ListRow, ListSection } from '@/components/ui';
import type { Cutting, Plant } from '@/db/types';
import { cuttingProgress, cuttingTitle, groupCuttings } from '@/lib/cuttings';
import { today } from '@/lib/dates';

/** The cuttings of the place, on the Plantes tab: growing, potted, failed. */
export function CuttingList({ cuttings, plants }: { cuttings: Cutting[]; plants: Plant[] }) {
  if (cuttings.length === 0) {
    return (
      <EmptyState
        art={<Scene id="cutting" />}
        title="Aucune bouture"
        message="Note d’où viennent tes boutures, comment elles s’enracinent, et fais-en des plantes une fois rempotées."
        action={{ label: 'Nouvelle bouture', icon: icons.add, onPress: () => router.push('/cutting/new') }}
      />
    );
  }

  const names = new Map(plants.map((p) => [p.id, p.nickname]));
  const day = today();
  const groups = groupCuttings(cuttings);
  const rows = (list: Cutting[]) =>
    list.map((cutting) => {
      const parent = cutting.parent_plant_id ? names.get(cutting.parent_plant_id) : null;
      const became = cutting.plant_id ? names.get(cutting.plant_id) : null;
      return (
        <ListRow
          key={cutting.id}
          leading={<PlantThumb uri={cutting.photo_uri} size={56} />}
          title={cuttingTitle(cutting, parent)}
          subtitle={[
            parent ? cutting.species : null,
            became ? `Devenue « ${became} »` : cuttingProgress(cutting, day),
          ]
            .filter(Boolean)
            .join('\n')}
          onPress={() => router.push({ pathname: '/cutting/[id]', params: { id: cutting.id } })}
          chevron
        />
      );
    });

  return (
    <>
      {groups.growing.length > 0 && <ListSection title="En cours">{rows(groups.growing)}</ListSection>}
      {groups.potted.length > 0 && <ListSection title="Rempotées">{rows(groups.potted)}</ListSection>}
      {groups.failed.length > 0 && <ListSection title="Ratées">{rows(groups.failed)}</ListSection>}
    </>
  );
}
