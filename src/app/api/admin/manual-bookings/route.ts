import { addMinutes } from "date-fns";
import { redirect } from "next/navigation";
import { generateProtocolCode, getBookingDurationMinutes } from "@/lib/booking";
import { requireRoles } from "@/lib/auth";
import { getBrazilDayRange, toBrazilDateObject } from "@/lib/brazil-time";
import {
  createAppointment,
  ensureManualCustomer,
  getPrimaryBarber,
  getServiceById,
  listAppointmentsByBarberOnDate,
  listBlockedSlotsByBarberOnDate,
  markAppointmentPaid,
} from "@/lib/db";

type ManualBookingPayload = {
  barberId?: string;
  customerName?: string;
  customerPhone?: string;
  serviceId?: string;
  date?: string;
  time?: string;
};

async function parsePayload(request: Request): Promise<ManualBookingPayload> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as ManualBookingPayload;
  }

  const formData = await request.formData();
  return {
    barberId: String(formData.get("barberId") || ""),
    customerName: String(formData.get("customerName") || "").trim(),
    customerPhone: String(formData.get("customerPhone") || "").trim(),
    serviceId: String(formData.get("serviceId") || ""),
    date: String(formData.get("date") || ""),
    time: String(formData.get("time") || ""),
  };
}

export async function POST(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);

  const payload = await parsePayload(request);
  const customerName = String(payload.customerName || "").trim();
  const customerPhone = String(payload.customerPhone || "").trim();
  const serviceId = String(payload.serviceId || "");
  const date = String(payload.date || "");
  const time = String(payload.time || "");

  const barber = getPrimaryBarber();
  const service = getServiceById(serviceId);

  if (!barber || !service || !customerName || !customerPhone || !date || !time) {
    if ((request.headers.get("content-type") || "").includes("application/json")) {
      return Response.json({ error: "Preencha nome, telefone, serviço, data e horário." }, { status: 400 });
    }
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
    if ((request.headers.get("content-type") || "").includes("application/json")) {
      return Response.json({ error: "Esse horário não está mais disponível." }, { status: 409 });
    }
    redirect(`/admin/agendamento-manual?date=${date}&serviceId=${serviceId}&error=slot-unavailable`);
  }

  const customer = ensureManualCustomer({
    name: customerName,
    phone: customerPhone,
  });

  const appointmentId = createAppointment({
    protocolCode: generateProtocolCode(),
    customerId: customer.id,
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
    notes: "Agendamento manual criado pelo barbeiro.",
  });

  markAppointmentPaid(appointmentId);

  if ((request.headers.get("content-type") || "").includes("application/json")) {
    return Response.json({ success: true, appointmentId }, { status: 201 });
  }

  redirect(`/admin/agendamento-manual?success=1&date=${date}`);
}
