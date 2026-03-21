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

type BookingPayload = {
  serviceIds?: string[];
  barberId?: string;
  date?: string;
  time?: string;
  paymentScope?: string;
};

function wantsJson(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const accept = request.headers.get("accept") || "";
  return contentType.includes("application/json") || accept.includes("application/json");
}

async function parsePayload(request: Request): Promise<BookingPayload> {
  if ((request.headers.get("content-type") || "").includes("application/json")) {
    return (await request.json().catch(() => ({}))) as BookingPayload;
  }

  const formData = await request.formData();
  return {
    serviceIds: formData.getAll("serviceId").map((value) => String(value)).filter(Boolean),
    barberId: String(formData.get("barberId") || ""),
    date: String(formData.get("date") || ""),
    time: String(formData.get("time") || ""),
    paymentScope: String(formData.get("paymentScope") || "DEPOSIT"),
  };
}

function bookingJsonError(message: string, status: number, code: string) {
  return Response.json({ success: false, message, code }, { status });
}

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
  const payload = await parsePayload(request);
  const expectsJson = wantsJson(request);
  const serviceIds = (payload.serviceIds || []).filter(Boolean);
  const barberIdInput = String(payload.barberId || "");
  const date = String(payload.date || "");
  const time = String(payload.time || "");
  const paymentScope = String(payload.paymentScope || "DEPOSIT") === "FULL" ? "FULL" : "DEPOSIT";

  const services = serviceIds
    .map((serviceId) => getServiceById(serviceId))
    .filter((service): service is ServiceRecord => Boolean(service));

  if (!services.length || !date || !time) {
    if (expectsJson) {
      return bookingJsonError("Escolha pelo menos um serviço, a data e o horário.", 400, "missing-fields");
    }

    redirect("/cliente");
  }

  const barber = getPrimaryBarber();
  const barberId = barberIdInput || barber?.id || "";

  if (!barberId) {
    if (expectsJson) {
      return bookingJsonError("Não encontramos o barbeiro principal para concluir essa reserva.", 400, "missing-barber");
    }

    redirect(buildClientRedirect(date, services, { bookingError: "missing-barber" }));
  }

  try {
    const totalPriceInCents = services.reduce((sum, service) => sum + service.price_in_cents, 0);
    const totalDurationMinutes = getBookingDurationMinutes(services);
    const serviceSummary = services.map((service) => service.name).join(" + ");
    const primaryService = services[0];

    const scheduledAt = toBrazilDateObject(date, time);
    const endAt = addMinutes(scheduledAt, totalDurationMinutes);
    const dayRange = getBrazilDayRange(date);

    const overlapping = listAppointmentsByBarberOnDate(barberId, dayRange.startIso, dayRange.endIso).find(
      (item) => scheduledAt < new Date(item.end_at) && endAt > new Date(item.scheduled_at),
    );

    const blocked = listBlockedSlotsByBarberOnDate(barberId, dayRange.startIso, dayRange.endIso).find(
      (item) => scheduledAt < new Date(item.ends_at) && endAt > new Date(item.starts_at),
    );

    if (overlapping || blocked) {
      createLead({
        userId: user.id,
        serviceId: primaryService.id,
        lastStep: "Tentou fechar um horário indisponível e não concluiu",
      });

      if (expectsJson) {
        return bookingJsonError(
          "Esse horário acabou de ficar indisponível. Escolha outro para continuar.",
          409,
          "slot-unavailable",
        );
      }

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
      lastStep: "Chegou até a geração do protocolo e aguarda pagar o sinal",
    });

    const redirectTo = `/cliente/minha-area?checkout=${appointmentId}#checkout`;

    if (expectsJson) {
      return Response.json({ success: true, appointmentId, redirectTo }, { status: 201 });
    }

    redirect(redirectTo);
  } catch (error) {
    console.error("Erro ao criar agendamento do cliente", error);

    if (expectsJson) {
      return bookingJsonError(
        "Não conseguimos criar sua reserva agora. Tente novamente em instantes.",
        500,
        "booking-create-failed",
      );
    }

    redirect(buildClientRedirect(date, services, { bookingError: "booking-create-failed" }));
  }
}
