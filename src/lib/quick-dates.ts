import { addWeeks, format, isBefore, setDay, startOfDay, startOfWeek } from "date-fns";

const quickWeekdays = [2, 3, 4, 5, 6];

export function getQuickWeekDates(today = new Date()) {
  const safeToday = startOfDay(today);
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
