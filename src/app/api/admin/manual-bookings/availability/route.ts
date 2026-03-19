import { format } from "date-fns";
import { getBookingDurationMinutes, listScheduleSlots } from "@/lib/booking";
import { requireRoles } from "@/lib/auth";
import {
  getPrimaryBarber,
  getServiceById,
  listAppointmentsByBarberOnDate,
  listBlockedSlotsByBarberOnDate,
} from "@/lib/db";
import { getBrazilDayRange, toBrazilDateObject } from "@/lib/brazil-time";

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

  const dayRange = getBrazilDayRange(date);
  const appointments = listAppointmentsByBarberOnDate(barber.id, dayRange.startIso, dayRange.endIso);
  const blockedSlots = listBlockedSlotsByBarberOnDate(barber.id, dayRange.startIso, dayRange.endIso);
  const isBlockedDay = blockedSlots.some(
    (slot) =>
      format(new Date(slot.starts_at), "HH:mm") === "00:00" &&
      format(new Date(slot.ends_at), "HH:mm") === "23:59",
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
    time: format(slot.time, "HH:mm"),
    status: slot.status,
  }));

  return Response.json({
    isBlockedDay,
    slots,
  });
}
