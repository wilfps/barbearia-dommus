import { addMinutes } from "date-fns";
import { redirect } from "next/navigation";
import { generateProtocolCode, getBookingDurationMinutes } from "@/lib/booking";
import { requireUser } from "@/lib/auth";
import { getBrazilDayRange, toBrazilDateObject } from "@/lib/brazil-time";
import {
  createAppointment,
  createLead,
  getPrimaryBarber,
  getServiceById,
  listAppointmentsByBarberOnDate,
  listBlockedSlotsByBarberOnDate,
  type ServiceRecord,
} from "@/lib/db";

function buildClientRedirect(date: string, services: ServiceRecord[], extra?: Record<string, string>) {
  const search = new URLSearchParams();

  if (date) {
    search.set("date", date);
  }

  for (const service of services) {
    search.append("serviceId", service.id);
  }

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      search.set(key, value);
    }
  }

  return `/cliente?${search.toString()}#horarios`;
}

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const serviceIds = formData.getAll("serviceId").map((value) => String(value)).filter(Boolean);
  const barberIdInput = String(formData.get("barberId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const paymentScope = String(formData.get("paymentScope") || "DEPOSIT") === "FULL" ? "FULL" : "DEPOSIT";

  const services = serviceIds
    .map((serviceId) => getServiceById(serviceId))
    .filter((service): service is ServiceRecord => Boolean(service));

  if (!services.length || !date || !time) {
    redirect("/cliente");
  }

  const barber = getPrimaryBarber();
  const barberId = barberIdInput || barber?.id || "";

  if (!barberId) {
    redirect(buildClientRedirect(date, services, { bookingError: "1" }));
  }

  try {
    const totalPriceInCents = services.reduce((sum, service) => sum + service.price_in_cents, 0);
    const totalDurationMinutes = getBookingDurationMinutes(services);
    const serviceSummary = services.map((service) => service.name).join(" + ");
    const primaryService = services[0];

    const scheduledAt = toBrazilDateObject(date, time);
    const endAt = addMinutes(scheduledAt, totalDurationMinutes);
    const dayRange = getBrazilDayRange(date);

    const overlapping = listAppointmentsByBarberOnDate(
      barberId,
      dayRange.startIso,
      dayRange.endIso,
    ).find((item) => scheduledAt < new Date(item.end_at) && endAt > new Date(item.scheduled_at));

    const blocked = listBlockedSlotsByBarberOnDate(
      barberId,
      dayRange.startIso,
      dayRange.endIso,
    ).find((item) => scheduledAt < new Date(item.ends_at) && endAt > new Date(item.starts_at));

    if (overlapping || blocked) {
      createLead({
        userId: user.id,
        serviceId: primaryService.id,
        lastStep: "Tentou fechar um horario indisponivel e nao concluiu",
      });
      redirect(buildClientRedirect(date, services, { bookingError: "slot-unavailable" }));
    }

    const appointmentId = createAppointment({
      protocolCode: generateProtocolCode(),
      customerId: user.id,
      barberId,
      serviceId: primaryService.id,
      serviceSummary,
      scheduledAt: scheduledAt.toISOString(),
      endAt: endAt.toISOString(),
      totalPriceInCents,
      depositInCents: Math.round(totalPriceInCents / 2),
      checkoutAmountInCents: paymentScope === "FULL" ? totalPriceInCents : Math.round(totalPriceInCents / 2),
      paymentScope,
      notes: "",
    });

    createLead({
      userId: user.id,
      serviceId: primaryService.id,
      lastStep: "Chegou ate a geracao do protocolo e aguarda pagar o sinal",
    });

    redirect(`/cliente/minha-area?checkout=${appointmentId}#checkout`);
  } catch (error) {
    console.error("Erro ao criar agendamento do cliente", error);
    redirect(buildClientRedirect(date, services, { bookingError: "1" }));
  }
}
