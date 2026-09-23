import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { addDays, parseDate, today } from '@/lib/dates';

/** Today's date, which changes at midnight and when the app comes back on another day. */
export function useToday(): string {
  const [day, setDay] = useState(today);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDay(today());
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDay(today()), parseDate(addDays(day, 1)).getTime() - Date.now() + 1000);
    return () => clearTimeout(timer);
  }, [day]);

  return day;
}
