import { addDays, addWeeks, format, getDay, isBefore, setDay, startOfDay, startOfWeek } from "date-fns";

const quickWeekdays = [1, 2, 3, 4, 5, 6];

export function isSundayDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return getDay(date) === 0;
}

export function normalizeWorkingDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  const safeDate = startOfDay(date);
  return isSundayDate(safeDate) ? addDays(safeDate, 1) : safeDate;
}

export function getQuickWeekDates(today = new Date()) {
  const safeToday = normalizeWorkingDate(today);
  const weekStart = startOfWeek(safeToday, { weekStartsOn: 1 });

  return quickWeekdays.map((weekday) => {
    const currentWeekDate = startOfDay(setDay(weekStart, weekday, { weekStartsOn: 1 }));
    const resolvedDate = isBefore(currentWeekDate, safeToday) ? addWeeks(currentWeekDate, 1) : currentWeekDate;

    return {
      date: resolvedDate,
      iso: format(resolvedDate, "yyyy-MM-dd"),
      br: format(resolvedDate, "dd/MM/yyyy"),
      rolledToNextWeek: isBefore(currentWeekDate, safeToday),
    };
  });
}
