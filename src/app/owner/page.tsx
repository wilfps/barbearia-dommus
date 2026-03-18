import { AppShell } from "@/components/shell";
import { StatCard } from "@/components/stat-card";
import { requireRoles } from "@/lib/auth";
import {
  getSiteSetting,
  listAllServices,
  listAllUsers,
  listLeads,
  listPendingAppointmentsForOwner,
} from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";

type SearchParams = Promise<{
  userSearch?: string;
}>;

function roleLabel(role: string) {
  if (role === "OWNER") return "Admin";
  if (role === "BARBER" || role === "ADMIN") return "Barbeiro";
  return "Cliente";
}

function PermissionCard({
  person,
}: {
  person: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    is_active: number;
  };
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/15 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg text-amber-50">{person.name}</p>
          <p className="text-sm text-stone-300">{person.email} - {person.phone}</p>
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60">{roleLabel(person.role)}</p>
        </div>
        <form action="/api/owner/users/role" method="post" className="flex flex-wrap gap-3">
          <input type="hidden" name="userId" value={person.id} />
          <select name="role" defaultValue={person.role} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100">
            <option value="CUSTOMER">Cliente</option>
            <option value="BARBER">Barbeiro</option>
            <option value="ADMIN">Barbeiro</option>
            <option value="OWNER">Admin</option>
          </select>
          <select name="isActive" defaultValue={person.is_active ? "true" : "false"} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100">
            <option value="true">Ativo</option>
            <option value="false">Bloqueado</option>
          </select>
          <button type="submit" className="rounded-2xl border border-amber-300/60 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/10">
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function OwnerPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRoles(["OWNER"]);
  const params = await searchParams;
  const searchTerm = params.userSearch?.trim() ?? "";

  const [site, users, pendingAppointments, leads, services] = await Promise.all([
    Promise.resolve(getSiteSetting()),
    Promise.resolve(listAllUsers()),
    Promise.resolve(listPendingAppointmentsForOwner()),
    Promise.resolve(listLeads()),
    Promise.resolve(listAllServices()),
  ]);

  const privilegedUsers = users.filter((person) => ["OWNER", "ADMIN", "BARBER"].includes(person.role));
  const searchedUsers = searchTerm
    ? users.filter((person) => {
        const haystack = `${person.name} ${person.email} ${person.phone}`.toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      })
    : [];

  return (
    <AppShell
      title="Controle admin do projeto"
      subtitle="Aqui fica seu acesso extremo: bloquear o sistema com uma mensagem personalizada, ajustar permissões e acompanhar oportunidades perdidas."
    >
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Sistema" value={site.is_open ? "Liberado" : "Bloqueado"} helper="Bloqueio com mensagem na tela." />
          <StatCard label="Usuários" value={`${users.length}`} helper="Total de contas cadastradas." />
          <StatCard label="Pendentes" value={`${pendingAppointments.length}`} helper="Reservas aguardando sinal." />
          <StatCard label="Leads" value={`${leads.length}`} helper="Clientes que iniciaram e não converteram." />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
          <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Poder total</p>
            <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Bloquear acesso com mensagem</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">
              O site continua no ar, mas cliente e barbeiro ficam travados e enxergam a mensagem que você escrever aqui.
            </p>
            <form action="/api/owner/site-status" method="post" className="mt-6 space-y-4">
              <select name="isOpen" defaultValue={site.is_open ? "true" : "false"} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100">
                <option value="true">Sistema liberado</option>
                <option value="false">Sistema bloqueado com mensagem</option>
              </select>
              <textarea
                name="maintenanceMessage"
                defaultValue={site.maintenance_message}
                placeholder="Escreva aqui a mensagem que vai aparecer no centro da tela para cliente e barbeiro."
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              />
              <button type="submit" className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-200">
                Salvar bloqueio do sistema
              </button>
            </form>
          </section>

          <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Permissões</p>
            <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Buscar usuário para dar permissão</h2>

            <form method="get" action="/owner" className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                name="userSearch"
                defaultValue={searchTerm}
                placeholder="Pesquisar por nome, email ou telefone"
                className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              />
              <button type="submit" className="rounded-2xl bg-amber-300 px-5 py-3 font-semibold text-stone-950 transition hover:bg-amber-200">
                Pesquisar
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {privilegedUsers.map((person) => (
                <PermissionCard key={person.id} person={person} />
              ))}
            </div>

            {searchTerm ? (
              <div className="mt-8">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60">Resultado da busca</p>
                <div className="mt-4 space-y-3">
                  {searchedUsers.length ? (
                    searchedUsers.map((person) => <PermissionCard key={`search-${person.id}`} person={person} />)
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                      Nenhum usuário encontrado com essa pesquisa.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Preços</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Alterar valores dos serviços</h2>
          <p className="mt-3 max-w-3xl text-sm text-stone-300">
            O sinal da reserva sempre será calculado automaticamente como 50% do valor que você definir aqui.
          </p>
          <div className="mt-6 space-y-3">
            {services.map((service) => (
              <div key={service.id} className="rounded-[24px] border border-white/10 bg-black/15 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg text-amber-50">{service.name}</p>
                    <p className="mt-1 text-sm text-stone-400">
                      Valor atual: {formatMoney(service.price_in_cents)} | Sinal automático: {formatMoney(Math.round(service.price_in_cents / 2))}
                    </p>
                  </div>
                  <form action="/api/owner/services/price" method="post" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input type="hidden" name="serviceId" value={service.id} />
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(service.price_in_cents / 100).toFixed(2)}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
                    />
                    <button type="submit" className="rounded-2xl border border-amber-300/60 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/10">
                      Salvar preço
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Check-in não concluído</p>
            <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Relatório para conversão</h2>
            <div className="mt-6 space-y-4">
              {pendingAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-[24px] border border-white/10 bg-black/15 p-5">
                  <p className="text-lg text-amber-50">{appointment.customer_name}</p>
                  <p className="mt-2 text-sm text-stone-300">{appointment.customer_phone} - {appointment.customer_email}</p>
                  <p className="mt-2 text-sm text-stone-400">
                    {appointment.service_name} com {appointment.barber_name}
                  </p>
                  <p className="mt-2 text-sm text-amber-100">{formatDateTime(appointment.created_at)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Leads abandonados</p>
            <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Interesse sem finalização</h2>
            <div className="mt-6 space-y-4">
              {leads.map((lead) => (
                <div key={lead.id} className="rounded-[24px] border border-white/10 bg-black/15 p-5">
                  <p className="text-lg text-amber-50">{lead.user_name || "Usuário não identificado"}</p>
                  <p className="mt-2 text-sm text-stone-300">
                    {lead.user_phone || "Sem telefone"} - {lead.user_email || "Sem e-mail"}
                  </p>
                  <p className="mt-2 text-sm text-stone-400">{lead.service_name || "Serviço ainda não escolhido"}</p>
                  <p className="mt-2 text-sm text-amber-100">{lead.last_step}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
