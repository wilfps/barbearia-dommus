import { format } from "date-fns";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import { AdminManualBooking } from "@/components/admin-manual-booking";
import { requireRoles } from "@/lib/auth";
import { getPrimaryBarber, listServices } from "@/lib/db";

type SearchParams = Promise<{
  success?: string;
  error?: string;
  date?: string;
  serviceId?: string;
}>;

export default async function AdminManualBookingPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);
  const params = await searchParams;
  const barber = getPrimaryBarber();
  const services = listServices();
  const initialDate = params.date || format(new Date(), "yyyy-MM-dd");

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
        services={services}
        barberName={barber?.name || "Gabriel Rodrigues"}
        initialDate={initialDate}
        initialServiceId={params.serviceId}
        success={params.success === "1"}
        error={params.error}
      />
    </AppShell>
  );
}
