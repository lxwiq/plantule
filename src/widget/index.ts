/**
 * The « Soins du jour » home-screen widget (Android). The phone asks for it
 * when it is added, resized, and every hour (see app.json), through a
 * background task that reads the database; the app redraws it whenever its
 * data changes. Same exports as index.web.ts.
 */

import {
  registerWidgetTaskHandler,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';

import { renderTodayWidget, TODAY_WIDGET, type WidgetData } from './today-widget';
import { readWidgetData } from './widget-data';

export type { WidgetData };

async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(renderTodayWidget(widgetInfo, readWidgetData()));
}

/** Lets the phone draw the widget when the app is closed. Called by the entry file, before the app. */
export function registerTodayWidget() {
  registerWidgetTaskHandler(widgetTaskHandler);
}

/** Redraws the widgets on the home screen, if any, with the app's data. Safe to call often. */
export async function updateTodayWidget(data: WidgetData) {
  await requestWidgetUpdate({
    widgetName: TODAY_WIDGET,
    renderWidget: (info) => renderTodayWidget(info, data),
  });
}
