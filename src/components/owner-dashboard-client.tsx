"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/stat-card";
import { formatDateTime, formatMoney } from "@/lib/format";

type SiteState = {
  is_open: number;
  maintenance_message: string;
};

type UserState = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_active: number;
};

type ServiceState = {
  id: string;
  name: string;
  price_in_cents: number;
};

type AppointmentState = {
  id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  barber_name?: string;
  service_name?: string;
  created_at: string;
};

type LeadState = {
  id: string;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  service_name?: string | null;
  last_step: string;
};

type CheckoutConfigState = {
  provider: string;
  handle: string;
  redirectUrl: string;
  webhookUrl: string;
  handleConfigured: boolean;
  readyForActivation: boolean;
};

type Props = {
  site: SiteState;
  users: UserState[];
  services: ServiceState[];
  pendingAppointments: AppointmentState[];
  leads: LeadState[];
  checkoutConfig: CheckoutConfigState;
};

function roleLabel(role: string) {
  if (role === "OWNER") return "Admin";
  if (role === "BARBER" || role === "ADMIN") return "Barbeiro";
  return "Cliente";
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (/[",;\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const csv = [
    headers.map((header) => escapeCsv(header)).join(";"),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(";")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function postJson<T>(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Falha ao salvar alteração.");
  }

  return (await response.json()) as T;
}

function PermissionCard({
  person,
  onSave,
  saving,
}: {
  person: UserState;
  onSave: (input: { userId: string; role: string; isActive: boolean }) => Promise<void>;
  saving: boolean;
}) {
  const [role, setRole] = useState(person.role);
  const [isActive, setIsActive] = useState(person.is_active ? "true" : "false");

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/15 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg text-amber-50">{person.name}</p>
          <p className="text-sm text-stone-300">
            {person.email} - {person.phone}
          </p>
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60">{roleLabel(role)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
          >
            <option value="CUSTOMER">Cliente</option>
            <option value="BARBER">Barbeiro</option>
            <option value="ADMIN">Barbeiro</option>
            <option value="OWNER">Admin</option>
          </select>
          <select
            value={isActive}
            onChange={(event) => setIsActive(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
          >
            <option value="true">Ativo</option>
            <option value="false">Bloqueado</option>
          </select>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave({ userId: person.id, role, isActive: isActive === "true" })}
            className="rounded-2xl border border-amber-300/60 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OwnerDashboardClient({
  site,
  users,
  services,
  pendingAppointments,
  leads,
  checkoutConfig,
}: Props) {
  const [allUsers, setAllUsers] = useState(users);
  const [serviceList, setServiceList] = useState(services);
  const [pendingList, setPendingList] = useState(pendingAppointments);
  const [leadList, setLeadList] = useState(leads);
  const [siteOpen, setSiteOpen] = useState(site.is_open ? "true" : "false");
  const [maintenanceMessage, setMaintenanceMessage] = useState(site.maintenance_message);
  const [siteSaving, setSiteSaving] = useState(false);
  const [siteNotice, setSiteNotice] = useState("");
  const [permissionQuery, setPermissionQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerNotice, setCustomerNotice] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [serviceSavingId, setServiceSavingId] = useState<string | null>(null);
  const [removingAppointmentId, setRemovingAppointmentId] = useState<string | null>(null);
  const [removingLeadId, setRemovingLeadId] = useState<string | null>(null);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>(
    Object.fromEntries(services.map((service) => [service.id, (service.price_in_cents / 100).toFixed(2)])),
  );

  const privilegedUsers = useMemo(
    () => allUsers.filter((person) => ["OWNER", "ADMIN", "BARBER"].includes(person.role)),
    [allUsers],
  );

  const filteredUsers = useMemo(() => {
    const normalized = normalizeSearch(permissionQuery);
    if (!normalized) return [];

    return allUsers.filter((person) => {
      const haystack = `${person.name} ${person.email} ${person.phone}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [allUsers, permissionQuery]);

  const filteredCustomers = useMemo(() => {
    const normalized = normalizeSearch(customerQuery);
    if (!normalized) return [];

    return allUsers.filter((person) => {
      if (person.role !== "CUSTOMER") return false;
      const haystack = `${person.name} ${person.phone}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [allUsers, customerQuery]);

  const exportCustomers = () => {
    const customers = allUsers
      .filter((person) => person.role === "CUSTOMER")
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    downloadCsv(
      "clientes-dommus.csv",
      ["Nome", "E-mail", "Telefone", "Permissão", "Status"],
      customers.map((customer) => [
        customer.name,
        customer.email,
        customer.phone,
        roleLabel(customer.role),
        customer.is_active ? "Ativo" : "Bloqueado",
      ]),
    );
  };

  const exportPendingAppointments = () => {
    downloadCsv(
      "pendencias-conversao-dommus.csv",
      ["Cliente", "Telefone", "E-mail", "Serviço", "Barbeiro", "Criado em"],
      pendingList.map((appointment) => [
        appointment.customer_name,
        appointment.customer_phone,
        appointment.customer_email,
        appointment.service_name,
        appointment.barber_name,
        formatDateTime(appointment.created_at),
      ]),
    );
  };

  const exportLeads = () => {
    downloadCsv(
      "leads-dommus.csv",
      ["Nome", "Telefone", "E-mail", "Serviço", "Última etapa"],
      leadList.map((lead) => [
        lead.user_name,
        lead.user_phone,
        lead.user_email,
        lead.service_name,
        lead.last_step,
      ]),
    );
  };

  const saveUser = async (input: { userId: string; role: string; isActive: boolean }) => {
    try {
      setSavingUserId(input.userId);
      const result = await postJson<{ user: UserState }>("/api/owner/users/role", input);
      setAllUsers((current) => current.map((user) => (user.id === result.user.id ? result.user : user)));
    } finally {
      setSavingUserId(null);
    }
  };

  const saveSiteState = async () => {
    try {
      setSiteSaving(true);
      setSiteNotice("");
      await postJson("/api/owner/site-status", {
        isOpen: siteOpen === "true",
        maintenanceMessage,
      });
      setSiteNotice("Bloqueio do sistema salvo com sucesso.");
    } catch {
      setSiteNotice("Não foi possível salvar o bloqueio agora.");
    } finally {
      setSiteSaving(false);
    }
  };

  const saveServicePrice = async (serviceId: string) => {
    const price = priceInputs[serviceId] ?? "";

    try {
      setServiceSavingId(serviceId);
      const result = await postJson<{ service: ServiceState }>("/api/owner/services/price", {
        serviceId,
        price,
      });
      setServiceList((current) => current.map((service) => (service.id === result.service.id ? result.service : service)));
      setPriceInputs((current) => ({
        ...current,
        [serviceId]: (result.service.price_in_cents / 100).toFixed(2),
      }));
    } finally {
      setServiceSavingId(null);
    }
  };

  const removePendingAppointment = async (appointmentId: string) => {
    try {
      setRemovingAppointmentId(appointmentId);
      await postJson("/api/owner/appointments/remove", { appointmentId });
      setPendingList((current) => current.filter((appointment) => appointment.id !== appointmentId));
    } finally {
      setRemovingAppointmentId(null);
    }
  };

  const removeLead = async (leadId: string) => {
    try {
      setRemovingLeadId(leadId);
      await postJson("/api/owner/leads/remove", { leadId });
      setLeadList((current) => current.filter((lead) => lead.id !== leadId));
    } finally {
      setRemovingLeadId(null);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Sistema" value={siteOpen === "true" ? "Liberado" : "Bloqueado"} helper="Bloqueio com mensagem na tela." />
        <StatCard label="Usuários" value={`${allUsers.length}`} helper="Total de contas cadastradas." />
        <StatCard label="Pendentes" value={`${pendingList.length}`} helper="Reservas aguardando sinal." />
        <StatCard label="Leads" value={`${leadList.length}`} helper="Clientes que iniciaram e não converteram." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Poder total</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Bloquear acesso com mensagem</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">
            O site continua no ar, mas cliente e barbeiro ficam travados e enxergam a mensagem que você escrever aqui.
          </p>
          <div className="mt-6 space-y-4">
            <select
              value={siteOpen}
              onChange={(event) => setSiteOpen(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
            >
              <option value="true">Sistema liberado</option>
              <option value="false">Sistema bloqueado com mensagem</option>
            </select>
            <textarea
              value={maintenanceMessage}
              onChange={(event) => setMaintenanceMessage(event.target.value)}
              placeholder="Escreva aqui a mensagem que vai aparecer no centro da tela para cliente e barbeiro."
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={siteSaving}
                onClick={saveSiteState}
                className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {siteSaving ? "Salvando..." : "Salvar bloqueio do sistema"}
              </button>
              {siteNotice ? <p className="text-sm text-amber-100">{siteNotice}</p> : null}
            </div>
          </div>
        </section>

        <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Permissões</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Buscar usuário para dar permissão</h2>

          <div className="mt-6">
            <input
              value={permissionQuery}
              onChange={(event) => setPermissionQuery(event.target.value)}
              placeholder="Pesquisar por nome, email ou telefone"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
            />
          </div>

          <div className="mt-6 space-y-3">
            {privilegedUsers.map((person) => (
              <PermissionCard
                key={`${person.id}-${person.role}-${person.is_active}`}
                person={person}
                onSave={saveUser}
                saving={savingUserId === person.id}
              />
            ))}
          </div>

          {permissionQuery.trim() ? (
            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60">Resultado da busca</p>
              <div className="mt-4 space-y-3">
                {filteredUsers.length ? (
                  filteredUsers.map((person) => (
                    <PermissionCard
                      key={`search-${person.id}-${person.role}-${person.is_active}`}
                      person={person}
                      onSave={saveUser}
                      saving={savingUserId === person.id}
                    />
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                    Usuário não encontrado.
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
          {serviceList.map((service) => (
            <div key={service.id} className="rounded-[24px] border border-white/10 bg-black/15 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-lg text-amber-50">{service.name}</p>
                  <p className="mt-1 text-sm text-stone-400">
                    Valor atual: {formatMoney(service.price_in_cents)} | Sinal automático:{" "}
                    {formatMoney(Math.round(service.price_in_cents / 2))}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    value={priceInputs[service.id] ?? ""}
                    type="number"
                    min="0"
                    step="0.01"
                    onChange={(event) =>
                      setPriceInputs((current) => ({
                        ...current,
                        [service.id]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveServicePrice(service.id);
                      }
                    }}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
                  />
                  <button
                    type="button"
                    disabled={serviceSavingId === service.id}
                    onClick={() => void saveServicePrice(service.id)}
                    className="rounded-2xl border border-amber-300/60 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {serviceSavingId === service.id ? "Salvando..." : "Salvar preço"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Checkout online</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Preparar checkout da InfinitePay</h2>
        <p className="mt-3 max-w-3xl text-sm text-stone-300">
          Deixe a estrutura pronta aqui. Quando o Gabriel criar a conta, você só ajusta a InfiniteTag e ativa a integração
          real sem precisar mexer no código.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Provider"
            value="InfinitePay"
            helper="Fluxo preparado para checkout externo com botão neutro."
          />
          <StatCard
            label="Handle"
            value={checkoutConfig.handleConfigured ? "Configurada" : "Pendente"}
            helper="A InfiniteTag do recebedor entra aqui."
          />
          <StatCard
            label="Ativação"
            value={checkoutConfig.readyForActivation ? "Pronto" : "Em preparação"}
            helper="Com a handle salva, o checkout já pode gerar o link real."
          />
        </div>

        <form action="/api/owner/checkout-settings" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-stone-300">Provedor do checkout</label>
            <input
              name="provider"
              defaultValue={checkoutConfig.provider || "infinitepay"}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-300">InfiniteTag / handle</label>
            <input
              name="handle"
              defaultValue={checkoutConfig.handle}
              placeholder="@gabriel ou handle da conta"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-300">URL de retorno</label>
            <input
              name="redirectUrl"
              defaultValue={checkoutConfig.redirectUrl}
              placeholder="https://barbeariadommus.com.br/cliente/minha-area"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-stone-300">Webhook futuro</label>
            <input
              name="webhookUrl"
              defaultValue={checkoutConfig.webhookUrl}
              placeholder="https://barbeariadommus.com.br/api/payments/infinitepay/webhook"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
            />
          </div>
          <div className="lg:col-span-2">
            <button type="submit" className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-200">
              Salvar configuração do checkout
            </button>
          </div>
        </form>
      </section>

      <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Banco de clientes</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Pesquisar clientes cadastrados</h2>
        <p className="mt-3 max-w-3xl text-sm text-stone-300">
          Aqui você consulta a base de clientes da Dommus por nome ou telefone e, se quiser, também ajusta a permissão na hora.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportCustomers}
            className="rounded-2xl border border-amber-300/45 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300/65 hover:bg-amber-300/15"
          >
            Exportar clientes CSV
          </button>
        </div>

        <div className="mt-6">
          <input
            value={customerQuery}
            onChange={(event) => {
              setCustomerQuery(event.target.value);
              setCustomerNotice("");
            }}
            placeholder="Pesquisar por nome ou telefone"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
          />
        </div>

        <div className="mt-6 space-y-3">
          {customerQuery.trim() ? (
            filteredCustomers.length ? (
              filteredCustomers.map((customer) => (
                <PermissionCard
                  key={`customer-${customer.id}-${customer.role}-${customer.is_active}`}
                  person={customer}
                  onSave={saveUser}
                  saving={savingUserId === customer.id}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                Cadastro não encontrado.
              </div>
            )
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
              Digite um nome ou telefone para consultar a base de clientes.
            </div>
          )}
          {customerNotice ? <p className="text-sm text-amber-100">{customerNotice}</p> : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Check-in não concluído</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Relatório para conversão</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportPendingAppointments}
              className="rounded-2xl border border-amber-300/45 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300/65 hover:bg-amber-300/15"
            >
              Exportar pendências CSV
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {pendingList.length ? (
              pendingList.map((appointment) => (
                <div key={appointment.id} className="rounded-[24px] border border-white/10 bg-black/15 p-5">
                  <p className="text-lg text-amber-50">{appointment.customer_name}</p>
                  <p className="mt-2 text-sm text-stone-300">
                    {appointment.customer_phone} - {appointment.customer_email}
                  </p>
                  <p className="mt-2 text-sm text-stone-400">
                    {appointment.service_name} com {appointment.barber_name}
                  </p>
                  <p className="mt-2 text-sm text-amber-100">{formatDateTime(appointment.created_at)}</p>
                  <button
                    type="button"
                    disabled={removingAppointmentId === appointment.id}
                    onClick={() => void removePendingAppointment(appointment.id)}
                    className="mt-4 rounded-2xl border border-rose-400/50 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingAppointmentId === appointment.id ? "Excluindo..." : "Excluir do relatório"}
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                Nenhum registro pendente no relatório de conversão.
              </div>
            )}
          </div>
        </section>

        <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Leads abandonados</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Interesse sem finalização</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportLeads}
              className="rounded-2xl border border-amber-300/45 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300/65 hover:bg-amber-300/15"
            >
              Exportar leads CSV
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {leadList.length ? (
              leadList.map((lead) => (
                <div key={lead.id} className="rounded-[24px] border border-white/10 bg-black/15 p-5">
                  <p className="text-lg text-amber-50">{lead.user_name || "Usuário não identificado"}</p>
                  <p className="mt-2 text-sm text-stone-300">
                    {lead.user_phone || "Sem telefone"} - {lead.user_email || "Sem e-mail"}
                  </p>
                  <p className="mt-2 text-sm text-stone-400">{lead.service_name || "Serviço ainda não escolhido"}</p>
                  <p className="mt-2 text-sm text-amber-100">{lead.last_step}</p>
                  <button
                    type="button"
                    disabled={removingLeadId === lead.id}
                    onClick={() => void removeLead(lead.id)}
                    className="mt-4 rounded-2xl border border-rose-400/50 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingLeadId === lead.id ? "Excluindo..." : "Excluir lead"}
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                Nenhum lead restante para limpar.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}


