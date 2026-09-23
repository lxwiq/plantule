'use no memo';
/**
 * The « Soins du jour » home-screen widget. react-native-android-widget draws
 * these components into a picture, calling them as plain functions: no hooks,
 * hence no React Compiler in this file. Tapping it opens the Today tab.
 */

import { FlexWidget, TextWidget, type ColorProp, type WidgetRepresentation } from 'react-native-android-widget';

import type { Plant, Task } from '@/db/types';
import { formatLongDate, today } from '@/lib/dates';
import { TASK_KINDS } from '@/lib/labels';
import { capitalize } from '@/lib/text';
import { widgetContent, type WidgetContent, type WidgetRow } from '@/lib/widget';
import { accentFor, fonts, palettes, type Scheme } from '@/theme';

/** The widget's name in app.json. */
export const TODAY_WIDGET = 'TodayCare';

/** The place shown in the app, with its plants and their care. */
export type WidgetData = { placeName: string; tasks: Task[]; plants: Plant[] };

const PADDING = 16;
const HEADER_HEIGHT = 52;
const ROW_HEIGHT = 24;

const color = (value: string) => value as ColorProp;

function Row({ row, scheme }: { row: WidgetRow; scheme: Scheme }) {
  const theme = palettes[scheme];
  const dot = row.late ? theme.error : accentFor(scheme, TASK_KINDS[row.kind].accent).content;
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: 20 }}>
      <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color(dot) }} />
      <FlexWidget style={{ flex: 1, width: 0, marginLeft: 8, marginRight: 8 }}>
        <TextWidget
          text={row.name}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 14, fontWeight: '500', color: color(theme.text) }}
        />
      </FlexWidget>
      <TextWidget
        text={row.care}
        maxLines={1}
        truncate="END"
        style={{ fontSize: 13, color: color(row.late ? theme.error : theme.textSecondary) }}
      />
    </FlexWidget>
  );
}

function TodayWidget({ content, subtitle, scheme }: { content: WidgetContent; subtitle: string; scheme: Scheme }) {
  const theme = palettes[scheme];
  const label = [
    content.title,
    content.late > 0 ? `dont ${content.late} en retard` : null,
    content.rows.map((r) => r.name).join(', ') || null,
    content.more,
    content.message,
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'plantule:///' }}
      accessibilityLabel={`${label}. Ouvre Plantule`}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        padding: PADDING,
        borderRadius: 24,
        backgroundColor: color(theme.surface),
      }}>
      <TextWidget
        text={content.title}
        maxLines={1}
        truncate="END"
        style={{ fontFamily: fonts.display, fontSize: 18, color: color(theme.text) }}
      />
      <TextWidget
        text={subtitle}
        maxLines={1}
        truncate="END"
        style={{ fontSize: 12, marginTop: 2, color: color(theme.textSecondary) }}
      />
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 10, flexGap: 4 }}>
        {content.rows.map((row) => (
          <Row key={row.plantId} row={row} scheme={scheme} />
        ))}
        {content.more ? (
          <TextWidget text={content.more} style={{ fontSize: 13, color: color(theme.textSecondary) }} />
        ) : null}
        {content.message ? (
          <TextWidget text={content.message} maxLines={2} style={{ fontSize: 14, color: color(theme.textSecondary) }} />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}

/**
 * The widget for its size in dp, in both themes (the phone picks one). Without
 * data (the app was never opened), it invites to open the app.
 */
export function renderTodayWidget(size: { height: number }, data: WidgetData | null): WidgetRepresentation {
  const day = today();
  const rows = Math.floor((size.height - 2 * PADDING - HEADER_HEIGHT) / ROW_HEIGHT);
  const content: WidgetContent = data
    ? widgetContent(data.tasks, data.plants, day, rows)
    : { title: 'Plantule', rows: [], more: null, message: 'Ouvre l’app pour voir les soins du jour.', late: 0 };
  const subtitle = [capitalize(formatLongDate(day)), data?.placeName].filter(Boolean).join(' · ');
  return {
    light: <TodayWidget content={content} subtitle={subtitle} scheme="light" />,
    dark: <TodayWidget content={content} subtitle={subtitle} scheme="dark" />,
  };
}
