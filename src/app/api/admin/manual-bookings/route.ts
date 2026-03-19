import { addMinutes } from "date-fns";
import { redirect } from "next/navigation";
import { generateProtocolCode, getBookingDurationMinutes } from "@/lib/booking";
import { requireRoles } from "@/lib/auth";
import { getBrazilDayRange, toBrazilDateObject } from "@/lib/brazil-time";
import {
  createAppointment,
  getPrimaryBarber,
  getServiceById,
  listAppointmentsByBarberOnDate,
  listBlockedSlotsByBarberOnDate,
  markAppointmentPaid,
} from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);

  const formData = await request.formData();
  const customerName = String(formData.get("customerName") || "").trim();
  const customerPhone = String(formData.get("customerPhone") || "").trim();
  const serviceId = String(formData.get("serviceId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const notes = String(formData.get("notes") || "").trim();

  const barber = getPrimaryBarber();
  const service = getServiceById(serviceId);

  if (!barber || !service || !customerName || !customerPhone || !date || !time) {
    redirect("/admin/agendamento-manual?error=missing-fields");
  }

  const scheduledAt = toBrazilDateObject(date, time);
  const durationMinutes = getBookingDurationMinutes([service]);
  const endAt = addMinutes(scheduledAt, durationMinutes);
  const dayRange = getBrazilDayRange(date);

  const overlapping = listAppointmentsByBarberOnDate(
    barber.id,
    dayRange.startIso,
    dayRange.endIso,
  ).find((item) => scheduledAt < new Date(item.end_at) && endAt > new Date(item.scheduled_at));

  const blocked = listBlockedSlotsByBarberOnDate(
    barber.id,
    dayRange.startIso,
    dayRange.endIso,
  ).find((item) => scheduledAt < new Date(item.ends_at) && endAt > new Date(item.starts_at));

  if (overlapping || blocked) {
    redirect(`/admin/agendamento-manual?date=${date}&serviceId=${serviceId}&error=slot-unavailable`);
  }

  const appointmentId = createAppointment({
    protocolCode: generateProtocolCode(),
    barberId: barber.id,
    serviceId: service.id,
    serviceSummary: service.name,
    scheduledAt: scheduledAt.toISOString(),
    endAt: endAt.toISOString(),
    totalPriceInCents: service.price_in_cents,
    depositInCents: Math.round(service.price_in_cents / 2),
    checkoutAmountInCents: service.price_in_cents,
    paymentScope: "FULL",
    manualCustomerName: customerName,
    manualCustomerPhone: customerPhone,
    notes: notes || "Agendamento manual criado pelo barbeiro.",
  });

  markAppointmentPaid(appointmentId);

  redirect(`/admin/agendamento-manual?success=1&date=${date}`);
}
