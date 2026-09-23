import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { describeEvent } from '@/components/event-row';
import { PlantThumb } from '@/components/plant-thumb';
import { TaskKindBadge, TaskRow } from '@/components/task-row';
import { HeaderButton, IconButton, icons, ListRow, ListSection, Screen, Text } from '@/components/ui';
import { useCurrentPlace, usePlaceEvents, usePlants, useRooms, useTasks } from '@/db/hooks';
import type { CareEvent, Plant, Task, TaskKind } from '@/db/types';
import { addMonths, monthGrid, monthOf, projectTasks, WEEKDAYS, type Occurrence } from '@/lib/calendar';
import { careActions } from '@/lib/care-actions';
import { formatDayMonth, formatLongDate, formatMonth, formatTime, parseDate, toDateString, today } from '@/lib/dates';
import { plural, taskTitle } from '@/lib/labels';
import { capitalize } from '@/lib/text';
import { radius, spacing, touchTarget, useTheme } from '@/theme';

/** Done care from the journal, by local day. */
function doneByDay(events: CareEvent[]): Map<string, CareEvent[]> {
  const byDay = new Map<string, CareEvent[]>();
  for (const event of events) {
    if (event.kind !== 'done') continue;
    const day = toDateString(new Date(event.occurred_at));
    byDay.set(day, [...(byDay.get(day) ?? []), event]);
  }
  return byDay;
}

function openTask(taskId: string) {
  router.push({ pathname: '/task/[id]', params: { id: taskId } });
}

/** The month at a glance: care planned from today on, and what the journal says for past days. */
export default function Calendar() {
  const place = useCurrentPlace();
  const tasks = useTasks(place.id);
  const plants = usePlants(place.id);
  const rooms = useRooms(place.id);
  const now = today();
  const [month, setMonth] = useState(() => monthOf(now));
  const [selected, setSelected] = useState(now);

  const weeks = useMemo(() => monthGrid(month), [month]);
  const from = weeks[0][0].day;
  const to = weeks[weeks.length - 1][6].day;
  const events = usePlaceEvents(place.id, from, to);
  const planned = useMemo(() => projectTasks(tasks, from, to, now), [tasks, from, to, now]);
  const done = useMemo(() => doneByDay(events), [events]);
  const plantsById = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);
  const roomNames = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  // Past days show what was done, today and later what is planned.
  const careOn = (day: string): { kind: TaskKind; late: boolean }[] =>
    day < now
      ? (done.get(day) ?? []).map((e) => ({ kind: e.task_kind, late: false }))
      : (planned.get(day) ?? []).map((o) => ({ kind: o.task.kind, late: o.late }));

  const select = (day: string) => {
    setMonth(monthOf(day));
    setSelected(day);
  };
  const showMonth = (count: number) => {
    const next = addMonths(month, count);
    select(next === monthOf(now) ? now : next);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton title="Aujourd’hui" onPress={() => select(now)} disabled={selected === now} />
          ),
        }}
      />
      <Screen>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <IconButton icon={icons.chevronLeft} label="Mois précédent" onPress={() => showMonth(-1)} />
            <Text
              variant="title"
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              style={{ flex: 1, textAlign: 'center' }}>
              {capitalize(formatMonth(month))}
            </Text>
            <IconButton icon={icons.chevronRight} label="Mois suivant" onPress={() => showMonth(1)} />
          </View>
          <Text variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>
            {place.name}
          </Text>
        </View>

        <MonthGrid
          weeks={weeks}
          today={now}
          selected={selected}
          careOn={careOn}
          onSelect={select}
        />

        <DayDetails
          day={selected}
          today={now}
          planned={planned.get(selected) ?? []}
          done={done.get(selected) ?? []}
          plantsById={plantsById}
          roomNames={roomNames}
        />
      </Screen>
    </>
  );
}

type MonthGridProps = {
  weeks: ReturnType<typeof monthGrid>;
  today: string;
  selected: string;
  careOn: (day: string) => { kind: TaskKind; late: boolean }[];
  onSelect: (day: string) => void;
};

function MonthGrid({ weeks, today, selected, careOn, onSelect }: MonthGridProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: theme.surfaceContainerLow,
      }}>
      {/* Every day says its full date to screen readers: the initials are for the eyes. */}
      <View
        style={{ flexDirection: 'row', paddingBottom: spacing.xs }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        {WEEKDAYS.map((name) => (
          <Text key={name} variant="caption" tone="secondary" style={{ flex: 1, textAlign: 'center' }}>
            {name.charAt(0).toUpperCase()}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].day} style={{ flexDirection: 'row' }}>
          {week.map(({ day, inMonth }) => (
            <DayCell
              key={day}
              day={day}
              inMonth={inMonth}
              isToday={day === today}
              past={day < today}
              selected={day === selected}
              care={careOn(day)}
              onPress={() => onSelect(day)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

type DayCellProps = {
  day: string;
  inMonth: boolean;
  isToday: boolean;
  past: boolean;
  selected: boolean;
  care: { kind: TaskKind; late: boolean }[];
  onPress: () => void;
};

/** A day and up to 3 dots for its care: late in red, done in grey. */
function DayCell({ day, inMonth, isToday, past, selected, care, onPress }: DayCellProps) {
  const theme = useTheme();
  const count = care.length;
  const label = [
    formatDayMonth(day),
    isToday && 'aujourd’hui',
    count > 0 && (past ? `${plural(count, 'soin')} ${count > 1 ? 'faits' : 'fait'}` : plural(count, 'soin')),
  ]
    .filter(Boolean)
    .join(', ');
  const numberColor = selected
    ? theme.onPrimary
    : isToday
      ? theme.primary
      : inMonth
        ? theme.text
        : theme.textTertiary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ flex: 1, minHeight: touchTarget + 4, alignItems: 'center', gap: 3, paddingVertical: 2 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: isToday && !selected ? 1.5 : 0,
          borderColor: theme.primary,
          backgroundColor: selected ? theme.primary : undefined,
        }}>
        <Text variant={selected || isToday ? 'bodyStrong' : 'body'} color={numberColor}>
          {parseDate(day).getDate()}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 3, height: 6, opacity: inMonth ? 1 : 0.5 }}>
        {care.slice(0, 3).map((item, index) => (
          <View
            key={index}
            style={{
              width: 6,
              height: 6,
              borderRadius: radius.full,
              backgroundColor: item.late ? theme.error : past ? theme.outline : theme.primary,
            }}
          />
        ))}
      </View>
    </Pressable>
  );
}

type DayDetailsProps = {
  day: string;
  today: string;
  planned: Occurrence[];
  done: CareEvent[];
  plantsById: Map<string, Plant>;
  roomNames: Map<string, string>;
};

/** The selected day: its care to do (today and later), or what was done (today and before). */
function DayDetails({ day, today, planned, done, plantsById, roomNames }: DayDetailsProps) {
  const isToday = day === today;
  const past = day < today;
  const late = planned.filter((o) => o.late);
  const due = planned.filter((o) => !o.late);
  const title = isToday ? `Aujourd’hui, ${formatLongDate(day)}` : capitalize(formatLongDate(day));
  const roomOf = (plant: Plant) => (plant.room_id ? roomNames.get(plant.room_id) : null);

  // Today, rows act like on the Today screen: tap for the actions, tick when done.
  const todayRows = (list: Occurrence[]) =>
    list.map(({ task }) => {
      const plant = plantsById.get(task.plant_id);
      if (!plant) return null;
      return (
        <TaskRow
          key={task.id}
          task={task}
          plant={plant}
          roomName={roomOf(plant)}
          onPress={() => openTask(task.id)}
          onComplete={() => careActions.complete(task.id)}
        />
      );
    });

  const empty = past
    ? 'Rien de noté dans le journal ce jour-là.'
    : isToday
      ? 'Rien à faire aujourd’hui.'
      : 'Aucun soin prévu ce jour-là.';
  const nothing = planned.length === 0 && (past || isToday ? done.length === 0 : true);

  return (
    <View style={{ gap: spacing.lg }}>
      <Text variant="heading" accessibilityRole="header" accessibilityLiveRegion="polite">
        {title}
      </Text>
      {nothing && (
        <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
          {empty}
        </Text>
      )}
      {!past && late.length > 0 && <ListSection title="En retard">{todayRows(late)}</ListSection>}
      {!past && due.length > 0 && (
        <ListSection title={isToday ? 'À faire' : 'Prévu'}>
          {isToday
            ? todayRows(due)
            : due.map(({ task }) => {
                const plant = plantsById.get(task.plant_id);
                if (!plant) return null;
                return <PlannedRow key={task.id} task={task} plant={plant} roomName={roomOf(plant)} />;
              })}
        </ListSection>
      )}
      {(past || isToday) && done.length > 0 && (
        <ListSection title="Fait">
          {done.map((event) => {
            const plant = plantsById.get(event.plant_id);
            if (!plant) return null;
            return <DoneRow key={event.id} event={event} plant={plant} />;
          })}
        </ListSection>
      )}
    </View>
  );
}

/** The plant's photo with the care's badge, as on the Today screen. */
function CareThumb({ plant, kind }: { plant: Plant; kind: TaskKind }) {
  const theme = useTheme();
  return (
    <View>
      <PlantThumb uri={plant.main_photo_uri} species={plant.species} size={48} />
      <View style={{ position: 'absolute', right: -6, bottom: -6 }}>
        <View style={{ borderRadius: radius.full, borderWidth: 2, borderColor: theme.surfaceContainerLow }}>
          <TaskKindBadge task={{ kind }} size={24} />
        </View>
      </View>
    </View>
  );
}

/** Care planned on a later day. */
function PlannedRow({ task, plant, roomName }: { task: Task; plant: Plant; roomName?: string | null }) {
  return (
    <ListRow
      leading={<CareThumb plant={plant} kind={task.kind} />}
      title={plant.nickname}
      subtitle={[taskTitle(task), roomName].filter(Boolean).join(' · ')}
      onPress={() => openTask(task.id)}
      accessibilityHint="Ouvre les actions de la tâche"
    />
  );
}

/** Care written in the journal that day. */
function DoneRow({ event, plant }: { event: CareEvent; plant: Plant }) {
  // The rain has no time: only its day is known.
  const text =
    event.rain_mm != null ? describeEvent(event) : `${describeEvent(event)} à ${formatTime(event.occurred_at)}`;
  return (
    <ListRow
      leading={<CareThumb plant={plant} kind={event.task_kind} />}
      title={plant.nickname}
      subtitle={event.note ? `${text}\n« ${event.note} »` : text}
    />
  );
}
