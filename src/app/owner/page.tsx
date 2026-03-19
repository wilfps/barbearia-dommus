import { AppShell } from "@/components/shell";
import { OwnerDashboardClient } from "@/components/owner-dashboard-client";
import { requireRoles } from "@/lib/auth";
import {
  getSiteSetting,
  listAllServices,
  listAllUsers,
  listLeads,
  listPendingAppointmentsForOwner,
} from "@/lib/db";
import { getInfinitePayCheckoutConfig } from "@/lib/integrations/infinitepay";

export default async function OwnerPage() {
  await requireRoles(["OWNER"]);

  const [site, users, pendingAppointments, leads, services] = await Promise.all([
    Promise.resolve(getSiteSetting()),
    Promise.resolve(listAllUsers()),
    Promise.resolve(listPendingAppointmentsForOwner()),
    Promise.resolve(listLeads()),
    Promise.resolve(listAllServices()),
  ]);

  const checkoutConfig = getInfinitePayCheckoutConfig(site);

  return (
    <AppShell
      title="Controle admin do projeto"
      subtitle="Aqui fica seu acesso extremo: bloquear o sistema com uma mensagem personalizada, ajustar permissões e acompanhar oportunidades perdidas."
    >
      <OwnerDashboardClient
        site={site}
        users={users}
        services={services}
        pendingAppointments={pendingAppointments}
        leads={leads}
        checkoutConfig={checkoutConfig}
      />
    </AppShell>
  );
}
