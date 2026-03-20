import { getBookingDurationMinutes, listScheduleSlots } from "@/lib/booking";
import { requireRoles } from "@/lib/auth";
import {
  ensureDefaultBlockedPeriodsForDate,
  getPrimaryBarber,
  getServiceById,
  listAppointmentsByBarberOnDate,
  listBlockedSlotsByBarberOnDate,
} from "@/lib/db";
import { formatBrazilTime, getBrazilDayRange, toBrazilDateObject } from "@/lib/brazil-time";

export async function GET(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);

  const { searchParams } = new URL(request.url);
  const date = String(searchParams.get("date") || "");
  const serviceId = String(searchParams.get("serviceId") || "");
  const barber = getPrimaryBarber();
  const service = getServiceById(serviceId);

  if (!barber || !service || !date) {
    return Response.json({ slots: [], isBlockedDay: false });
  }

  ensureDefaultBlockedPeriodsForDate(barber.id, date);
  const dayRange = getBrazilDayRange(date);
  const appointments = listAppointmentsByBarberOnDate(barber.id, dayRange.startIso, dayRange.endIso);
  const blockedSlots = listBlockedSlotsByBarberOnDate(barber.id, dayRange.startIso, dayRange.endIso);
  const isBlockedDay = blockedSlots.some(
    (slot) =>
      formatBrazilTime(slot.starts_at) === "00:00" &&
      formatBrazilTime(slot.ends_at) === "23:59",
  );

  const slots = listScheduleSlots({
    date: toBrazilDateObject(date, "00:00:00"),
    barber,
    service: {
      ...service,
      duration_minutes: getBookingDurationMinutes([service]),
    },
    appointments,
    blockedSlots,
  }).map((slot) => ({
    time: formatBrazilTime(slot.time),
    status: slot.status,
    appointmentId: slot.appointmentId ?? null,
    blockedSlotId: slot.blockedSlotId ?? null,
  }));

  return Response.json({
    isBlockedDay,
    slots,
  });
}
