import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { AdminManualBooking } from "@/components/admin-manual-booking";
import { getBookingDurationMinutes, listScheduleSlots } from "@/lib/booking";
import { requireRoles } from "@/lib/auth";
import { formatBrazilTime, getBrazilDayRange, toBrazilDateObject } from "@/lib/brazil-time";
import {
  ensureDefaultBlockedPeriodsForDate,
  getPrimaryBarber,
  getServiceById,
  listAppointmentsByBarberOnDate,
  listBlockedSlotsByBarberOnDate,
  listCustomers,
  listServices,
} from "@/lib/db";
import { getQuickWeekDates, normalizeWorkingDate } from "@/lib/quick-dates";

type SearchParams = Promise<{
  success?: string;
  error?: string;
  date?: string;
  serviceId?: string;
  customerName?: string;
  customerPhone?: string;
}>;

function normalizeSelectedDate(value?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return format(normalizeWorkingDate(value), "yyyy-MM-dd");
  }

  return format(normalizeWorkingDate(new Date()), "yyyy-MM-dd");
}

export default async function AdminManualBookingPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);
  const params = await searchParams;
  const barber = getPrimaryBarber();
  const services = listServices();
  const customers = listCustomers().map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
  }));
  const selectedDate = normalizeSelectedDate(params.date);

  if (barber?.id) {
    ensureDefaultBlockedPeriodsForDate(barber.id, selectedDate);
  }

  const selectedServiceId = params.serviceId ?? services[0]?.id ?? "";
  const selectedService = getServiceById(selectedServiceId);
  const quickDates = getQuickWeekDates(new Date()).map((date) => ({
    value: date.iso,
    label: format(date.date, "EEEE", { locale: ptBR }).toUpperCase(),
    shortLabel: format(date.date, "dd/MM"),
  }));

  const dayRange = barber && selectedService ? getBrazilDayRange(selectedDate) : null;
  const appointments = barber && dayRange
    ? listAppointmentsByBarberOnDate(barber.id, dayRange.startIso, dayRange.endIso)
    : [];
  const blockedSlots = barber && dayRange
    ? listBlockedSlotsByBarberOnDate(barber.id, dayRange.startIso, dayRange.endIso)
    : [];

  const slots = barber && selectedService
    ? listScheduleSlots({
        date: toBrazilDateObject(selectedDate, "00:00:00"),
        barber,
        service: {
          ...selectedService,
          duration_minutes: getBookingDurationMinutes([selectedService]),
        },
        appointments,
        blockedSlots,
      }).map((slot) => ({
        time: formatBrazilTime(slot.time),
        status: slot.status,
        appointmentId: slot.appointmentId,
        blockedSlotId: slot.blockedSlotId,
      }))
    : [];

  const mappedServices = services.map((service) => ({
    id: service.id,
    name: service.name,
    priceCents: service.price_in_cents,
  }));

  return (
    <AppShell
      title="Agendamento manual"
      subtitle="Crie reservas direto do painel do barbeiro para clientes que preferem marcar na hora."
      myAreaHref="/admin"
      hideAdminLinks
      secondaryNav={
        <Link
          href="/admin"
          className="rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-center font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(210,178,124,0.08)] transition hover:border-amber-300/60 hover:bg-amber-300/16 sm:px-4 sm:py-2"
        >
          Voltar para agenda
        </Link>
      }
    >
      <AdminManualBooking
        barberId={barber?.id ?? ""}
        services={mappedServices}
        customers={customers}
        selectedServiceId={selectedServiceId}
        selectedDate={selectedDate}
        quickDates={quickDates}
        slots={slots}
        initialCustomerName={params.customerName ?? ""}
        initialCustomerPhone={params.customerPhone ?? ""}
      />
    </AppShell>
  );
}
