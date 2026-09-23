/**
 * The browser build has no home screen: nothing to draw. Same exports as
 * index.ts.
 */

import type { WidgetData } from './today-widget';

export type { WidgetData };

export function registerTodayWidget() {}

export async function updateTodayWidget(_data: WidgetData) {}
