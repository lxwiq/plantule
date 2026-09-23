import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Scene } from '@/components/scene';
import { draftIsValid, draftToInput, TaskFields, taskDraft } from '@/components/task-form';
import { EmptyState, HeaderButton, icons, ListRow, ListSection, Screen } from '@/components/ui';
import { useTask } from '@/db/hooks';
import { deleteTask, updateTask } from '@/db/repo';
import type { Task } from '@/db/types';
import { closeScreen } from '@/lib/navigation';

export default function EditTask() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTask(id);
  if (!task) {
    return (
      <EmptyState
        art={<Scene id="searching" />}
        title="Tâche introuvable"
        message="Elle a peut-être été supprimée."
      />
    );
  }
  return <EditTaskForm task={task} />;
}

function EditTaskForm({ task }: { task: Task }) {
  const [draft, setDraft] = useState(() => taskDraft(task));
  const canSave = draftIsValid(draft);

  const save = () => {
    if (!canSave) return;
    updateTask(task.id, draftToInput(draft));
    closeScreen();
  };

  const confirmDelete = () =>
    Alert.alert('Supprimer ce soin ?', 'Son historique restera dans le journal de la plante.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          closeScreen();
          deleteTask(task.id);
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <HeaderButton title="Enregistrer" onPress={save} disabled={!canSave} /> }}
      />
      <Screen>
        <TaskFields draft={draft} onChange={setDraft} />
        <ListSection>
          <ListRow leading={icons.delete} title="Supprimer ce soin" destructive onPress={confirmDelete} />
        </ListSection>
      </Screen>
    </>
  );
}
