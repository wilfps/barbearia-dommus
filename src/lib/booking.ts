import { addMinutes, endOfDay, format, isBefore, setHours, setMinutes, startOfDay } from "date-fns";
import type { AppointmentRecord, BlockedSlotRecord, ServiceRecord, UserRecord } from "@/lib/db";

type BarberWithProfile = UserRecord;
type SlotStatus = "available" | "booked" | "blocked" | "past";

export type ScheduleSlot = {
  time: Date;
  status: SlotStatus;
};

export function generateProtocolCode() {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  const date = format(new Date(), "ddMMyy");
  return `DOM-${date}-${random}`;
}

const nonBlockingServiceSlugs = new Set(["sombrancelha", "depilacao-cera", "acabamento", "piguimentacao"]);

export function getBookingDurationMinutes(
  services: Array<Pick<ServiceRecord, "duration_minutes" | "slug">>,
) {
  if (!services.length) {
    return 0;
  }

  const timedServices = services.filter((service) => !nonBlockingServiceSlugs.has(service.slug));
  if (!timedServices.length) {
    return 0;
  }

  const standardServices = timedServices.filter((service) => service.duration_minutes > 10);
  if (standardServices.length) {
    return standardServices.reduce((sum, service) => sum + service.duration_minutes, 0);
  }

  const addonsOnlyMinutes = timedServices.reduce((sum, service) => sum + service.duration_minutes, 0);
  if (addonsOnlyMinutes <= 30) {
    return 30;
  }

  return Math.ceil(addonsOnlyMinutes / 30) * 30;
}

export function listScheduleSlots({
  date,
  barber,
  service,
  appointments,
  blockedSlots,
}: {
  date: Date;
  barber: BarberWithProfile;
  service: ServiceRecord;
  appointments: AppointmentRecord[];
  blockedSlots: BlockedSlotRecord[];
}) {
  const slots: ScheduleSlot[] = [];
  const startsAtHour = barber.starts_at_hour ?? 9;
  const endsAtHour = barber.ends_at_hour ?? 20;
  const intervalMinutes = barber.interval_minutes ?? 30;

  let cursor = setMinutes(setHours(startOfDay(date), startsAtHour), 0);
  const finish = setMinutes(setHours(endOfDay(date), endsAtHour), 0);

  while (isBefore(cursor, finish)) {
    const slotEnd = addMinutes(cursor, service.duration_minutes);
    const hasAppointment = appointments.some(
      (appointment) =>
        cursor < new Date(appointment.end_at) && slotEnd > new Date(appointment.scheduled_at),
    );
    const isBlocked = blockedSlots.some(
      (blocked) => cursor < new Date(blocked.ends_at) && slotEnd > new Date(blocked.starts_at),
    );
    const isPast = isBefore(cursor, new Date());

    let status: SlotStatus = "available";
    if (hasAppointment) {
      status = "booked";
    } else if (isBlocked) {
      status = "blocked";
    } else if (isPast) {
      status = "past";
    }

    slots.push({
      time: cursor,
      status,
    });

    cursor = addMinutes(cursor, intervalMinutes);
  }

  return slots;
}

