import Link from "next/link";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { BirthDateInput } from "@/components/birth-date-input";
import { CheckoutScrollFocus } from "@/components/checkout-scroll-focus";
import { AppShell } from "@/components/shell";
import { StatCard } from "@/components/stat-card";
import { requireRoles } from "@/lib/auth";
import {
  convertLeadsForUser,
  getAppointmentByProtocolCode,
  getSiteSetting,
  listUserAppointments,
  markAppointmentPaid,
} from "@/lib/db";
import { formatBirthDate, formatDateTime, formatMoney } from "@/lib/format";
import { checkInfinitePayPayment, getInfinitePayCheckoutConfig } from "@/lib/integrations/infinitepay";
import { buildPixCheckoutPayload, getPixIntegrationConfig } from "@/lib/integrations/pix";

type SearchParams = Promise<{
  checkout?: string;
  payment?: string;
  order_nsu?: string;
  slug?: string;
  transaction_nsu?: string;
  capture_method?: string;
  receipt_url?: string;
}>;

function PaymentNotice({ payment }: { payment?: string }) {
  if (payment === "success") {
    return (
      <section className="rounded-[24px] border border-emerald-400/35 bg-emerald-400/10 p-4 text-emerald-50 sm:rounded-[28px] sm:p-5">
        <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/80">Pagamento confirmado</p>
        <h2 className="mt-2 text-xl">Seu pagamento foi reconhecido com sucesso</h2>
        <p className="mt-2 text-sm text-emerald-100/90">
          A reserva foi confirmada e o protocolo já está pronto para identificação junto ao barbeiro.
        </p>
      </section>
    );
  }

  if (payment === "pending") {
    return (
      <section className="rounded-[24px] border border-amber-300/35 bg-amber-300/10 p-4 text-amber-50 sm:rounded-[28px] sm:p-5">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Pagamento em análise</p>
        <h2 className="mt-2 text-xl">A InfinitePay ainda não confirmou esse pagamento</h2>
        <p className="mt-2 text-sm text-stone-200">
          Se você já pagou, aguarde alguns instantes e atualize a página. Se preferir, finalize o pagamento novamente pelo
          check-out.
        </p>
      </section>
    );
  }

  if (payment === "checkout-error" || payment === "checkout-unavailable") {
    return (
      <section className="rounded-[24px] border border-red-500/35 bg-red-500/10 p-4 text-red-50 sm:rounded-[28px] sm:p-5">
        <p className="text-xs uppercase tracking-[0.35em] text-red-200/80">Checkout indisponível</p>
        <h2 className="mt-2 text-xl">Não conseguimos abrir o pagamento agora</h2>
        <p className="mt-2 text-sm text-stone-200">
          Tente novamente em alguns instantes. Se continuar falhando, ajuste a configuração do checkout no painel admin.
        </p>
      </section>
    );
  }

  return null;
}

export default async function ClienteMinhaAreaPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRoles(["CUSTOMER", "OWNER"]);
  const params = await searchParams;
  const site = getSiteSetting();
  const checkoutConfig = getInfinitePayCheckoutConfig(site);

  if (params.order_nsu && params.slug && params.transaction_nsu && checkoutConfig.handleConfigured) {
    try {
      const confirmation = await checkInfinitePayPayment({
        handle: checkoutConfig.handle,
        orderNsu: params.order_nsu,
        slug: params.slug,
        transactionNsu: params.transaction_nsu,
      });

      if (confirmation.paid) {
        const appointment = getAppointmentByProtocolCode(params.order_nsu);
        if (appointment?.customer_id === user.id) {
          const updated = markAppointmentPaid(appointment.id);
          if (updated) {
            convertLeadsForUser(user.id);
          }
        }

        redirect("/cliente/minha-area?payment=success#protocolos");
      }

      redirect("/cliente/minha-area?payment=pending#checkout");
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      console.error("InfinitePay payment confirmation error:", error);
      redirect("/cliente/minha-area?payment=checkout-error#checkout");
    }
  }

  const appointments = listUserAppointments(user.id).filter((appointment) => appointment.status !== "CANCELED");
  const pendingAppointments = appointments.filter((appointment) => appointment.deposit_status === "PENDING");
  const confirmedAppointments = appointments.filter((appointment) => appointment.status === "CONFIRMED");
  const avatarSrc = user.avatar_path ? `${user.avatar_path}?v=${encodeURIComponent(user.updated_at)}` : null;
  const needsBirthDate = !user.birth_date;
  const pixConfig = getPixIntegrationConfig();

  return (
    <AppShell
      title={`Minha área, ${user.name.split(" ")[0]}`}
      subtitle="Atualize seu perfil, acompanhe reservas ativas, veja seus protocolos e finalize pagamentos pendentes."
      myAreaHref="/cliente/minha-area"
      hideAdminLinks
      secondaryNav={
        <Link
          href="/cliente"
          className="rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-center font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(210,178,124,0.08)] transition hover:border-amber-300/60 hover:bg-amber-300/16 sm:px-4 sm:py-2"
        >
          Voltar para os serviços
        </Link>
      }
    >
      <div className="grid gap-6">
        {needsBirthDate ? (
          <section className="rounded-[24px] border border-amber-300/35 bg-amber-300/10 p-4 text-amber-50 sm:rounded-[28px] sm:p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Cadastro incompleto</p>
            <h2 className="mt-2 text-xl">Falta sua data de nascimento</h2>
            <p className="mt-2 text-sm text-stone-200">
              Para a Dommus te identificar melhor e liberar mensagens de aniversário, preencha sua data de nascimento aqui no perfil.
            </p>
          </section>
        ) : null}

        <PaymentNotice payment={params.payment} />

        <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Perfil</p>
            <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Minha conta</h2>
            <form action="/api/customer/profile" method="post" encType="multipart/form-data" className="mt-6 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                  className="relative shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/20"
                  style={{ width: "76px", height: "76px", minWidth: "76px", minHeight: "76px" }}
                >
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt={user.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-amber-100">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-lg leading-tight text-amber-50">{user.name}</p>
                  <p className="text-sm text-stone-400">Atualize sua foto, e-mail, telefone e nascimento.</p>
                </div>
              </div>
              <input id="profile-photo" type="file" name="photo" accept="image/*" className="sr-only" />
              <label
                htmlFor="profile-photo"
                className="inline-flex w-fit cursor-pointer items-center rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/16"
              >
                Trocar foto
              </label>
              <input name="email" type="email" defaultValue={user.email} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100" />
              <input name="phone" type="text" defaultValue={user.phone} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100" />
              <BirthDateInput
                name="birthDate"
                defaultValue={formatBirthDate(user.birth_date)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button type="submit" className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-200">
                  Salvar perfil
                </button>
              </div>
            </form>
          </section>

          <section id="checkout" className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
            <CheckoutScrollFocus />
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Check-out</p>
            <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Finalize seu pagamento</h2>
            <p className="mt-2 text-sm text-stone-300">
              Checkout online: {checkoutConfig.handleConfigured ? "ativo para gerar link real" : "aguardando configuração do admin"}.
              {" "}PIX: {pixConfig.tokenConfigured && pixConfig.pixKeyConfigured ? "estrutura pronta para integração real" : "modo preparação"}.
            </p>
            <div className="mt-6 space-y-4">
              {pendingAppointments.map((appointment) => {
                const payingFull = (appointment.payment_scope || "DEPOSIT") === "FULL";
                const amountDue = appointment.checkout_amount_in_cents || appointment.deposit_in_cents;

                return (
                <div
                  key={appointment.id}
                  data-appointment-id={appointment.id}
                  className={`rounded-[24px] border bg-black/15 p-5 ${
                    params.checkout === appointment.id
                      ? "border-amber-300/50 shadow-[0_0_24px_rgba(210,178,124,0.12)]"
                      : "border-white/10"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60">{appointment.protocol_code}</p>
                      <h3 className="mt-2 text-xl text-amber-50">{appointment.service_name}</h3>
                      <p className="mt-2 text-sm text-stone-300">
                        {appointment.barber_name} - {formatDateTime(appointment.scheduled_at)}
                      </p>
                    </div>
                    <div className="text-sm md:text-right">
                      <p className="text-stone-400">{payingFull ? "Valor total da reserva" : "Sinal da reserva"}</p>
                      <p className="font-semibold text-amber-100">{formatMoney(amountDue)}</p>
                      <p className="mt-1 font-medium text-amber-200">Pagamento pendente</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <span
                      className={`rounded-full border px-3 py-2 ${
                        !payingFull
                          ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                          : "border-white/10 bg-black/10 text-stone-300"
                      }`}
                    >
                      Reservar com sinal: {formatMoney(appointment.deposit_in_cents)}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-2 ${
                        payingFull
                          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                          : "border-white/10 bg-black/10 text-stone-300"
                      }`}
                    >
                      Pagar tudo: {formatMoney(appointment.total_price_in_cents)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {(() => {
                      const pixPayload = buildPixCheckoutPayload({
                        amountInCents: amountDue,
                        protocolCode: appointment.protocol_code,
                        customerName: user.name,
                        customerEmail: user.email,
                        customerPhone: user.phone,
                        description: payingFull
                          ? `Pagamento da reserva - ${appointment.service_name}`
                          : `Sinal da reserva - ${appointment.service_name}`,
                      });

                      return <input type="hidden" name={`pix-preview-${appointment.id}`} value={JSON.stringify(pixPayload)} />;
                    })()}
                    <form action="/api/bookings/pay" method="post">
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <input type="hidden" name="returnTo" value="/cliente/minha-area#checkout" />
                      <input type="hidden" name="paymentScope" value="DEPOSIT" />
                      <button type="submit" className="rounded-2xl bg-amber-300 px-4 py-2 font-semibold text-stone-950 transition hover:bg-amber-200">
                        Pagar sinal
                      </button>
                    </form>
                    <form action="/api/bookings/pay" method="post">
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <input type="hidden" name="returnTo" value="/cliente/minha-area#checkout" />
                      <input type="hidden" name="paymentScope" value="FULL" />
                      <button type="submit" className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-400/20">
                        Pagar tudo
                      </button>
                    </form>
                    <form action="/api/customer/appointments/cancel" method="post">
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <input type="hidden" name="returnTo" value="/cliente/minha-area#checkout" />
                      <button type="submit" className="rounded-2xl border border-red-500/45 bg-red-500/10 px-4 py-2 font-semibold text-red-200 transition hover:bg-red-500/20">
                        Cancelar e escolher novamente
                      </button>
                    </form>
                  </div>
                </div>
              );
              })}
              {!pendingAppointments.length ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                  Nenhum pagamento pendente no momento.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section id="protocolos" className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Meus protocolos</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Reservas ativas confirmadas</h2>
          <div className="mt-6 space-y-4">
            {confirmedAppointments.map((appointment) => (
              <div key={appointment.id} className="rounded-[24px] border border-white/10 bg-black/15 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60">{appointment.protocol_code}</p>
                    <h3 className="mt-2 text-xl text-amber-50">{appointment.service_name}</h3>
                    <p className="mt-2 text-sm text-stone-300">
                      {appointment.barber_name} - {formatDateTime(appointment.scheduled_at)}
                    </p>
                  </div>
                  <div className="text-sm md:text-right">
                    <p className="text-stone-400">
                      {appointment.paid_amount_in_cents && appointment.paid_amount_in_cents >= appointment.total_price_in_cents
                        ? "Pagamento total"
                        : "Sinal da reserva"}
                    </p>
                    <p className="font-semibold text-amber-100">
                      {formatMoney(appointment.paid_amount_in_cents || appointment.deposit_in_cents)}
                    </p>
                    <p className="mt-1 font-medium text-emerald-300">
                      {appointment.paid_amount_in_cents && appointment.paid_amount_in_cents >= appointment.total_price_in_cents
                        ? "Pagamento total confirmado"
                        : "Pagamento confirmado"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <p className="text-sm text-emerald-300">Reserva ativa com protocolo pronto para identificação junto ao barbeiro.</p>
                  <form action="/api/customer/appointments/cancel" method="post">
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <input type="hidden" name="returnTo" value="/cliente/minha-area#checkout" />
                    <button type="submit" className="rounded-2xl border border-red-500/45 bg-red-500/10 px-4 py-2 font-semibold text-red-200 transition hover:bg-red-500/20">
                      Cancelar e escolher novamente
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {!confirmedAppointments.length ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                Nenhum protocolo confirmado no momento.
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Ativas" value={`${appointments.length}`} helper="Reservas visíveis para o cliente." />
          <StatCard label="Pendentes" value={`${pendingAppointments.length}`} helper="Pagamentos do sinal ainda em aberto." />
        </div>
      </div>
    </AppShell>
  );
}

