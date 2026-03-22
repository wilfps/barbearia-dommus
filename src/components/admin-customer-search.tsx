"use client";

import Link from "next/link";
import { Copy, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { buildWhatsAppLink } from "@/lib/format";

type CustomerState = {
  id: string;
  name: string;
  phone: string;
  email: string;
  visitsCount?: number;
  lastVisitLabel?: string | null;
  lastServiceName?: string | null;
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function AdminCustomerSearch({ customers }: { customers: CustomerState[] }) {
  const [query, setQuery] = useState("");
  const [copiedCustomerId, setCopiedCustomerId] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const normalized = normalizeSearch(query);
    if (!normalized) return [];

    return customers.filter((customer) => {
      const haystack = `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [customers, query]);

  async function handleCopyPhone(customerId: string, phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedCustomerId(customerId);
      window.setTimeout(() => setCopiedCustomerId((current) => (current === customerId ? null : current)), 1800);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
      <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Clientes</p>
      <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Pesquisar cliente</h2>
      <p className="mt-2 text-sm text-stone-300">
        Busque por nome ou telefone para encontrar rapidamente um cliente cadastrado e já agir em cima dele.
      </p>

      <div className="mt-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar por nome ou telefone"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
        />
      </div>

      <div className="mt-5 space-y-3">
        {query.trim() ? (
          filteredCustomers.length ? (
            filteredCustomers.map((customer) => (
              <div key={customer.id} className="rounded-[22px] border border-white/10 bg-black/15 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg text-amber-50">{customer.name}</p>
                    <p className="mt-1 text-sm text-stone-300">{customer.phone}</p>
                    <p className="mt-1 text-sm text-stone-400">{customer.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.22em] text-stone-300">
                        {customer.visitsCount ?? 0} visita(s)
                      </span>
                      {customer.lastVisitLabel ? (
                        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-amber-100">
                          Última visita: {customer.lastVisitLabel}
                        </span>
                      ) : null}
                      {customer.lastServiceName ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.22em] text-stone-300">
                          {customer.lastServiceName}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:max-w-[320px] lg:justify-end">
                    <Link
                      href={`/admin/agendamento-manual?customerName=${encodeURIComponent(customer.name)}&customerPhone=${encodeURIComponent(customer.phone)}`}
                      className="rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/16"
                    >
                      Agendar
                    </Link>
                    <Link
                      href={buildWhatsAppLink(customer.phone, `Olá, ${customer.name}! Vamos alinhar seu próximo horário na Dommus?`)}
                      target="_blank"
                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/16"
                    >
                      <Phone className="mr-2 inline size-4" />
                      WhatsApp
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleCopyPhone(customer.id, customer.phone)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-amber-300/40 hover:bg-amber-300/10"
                    >
                      <Copy className="mr-2 inline size-4" />
                      {copiedCustomerId === customer.id ? "Copiado" : "Copiar telefone"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 p-4 text-sm text-stone-400">
              Nenhum cliente encontrado com essa pesquisa.
            </div>
          )
        ) : (
          <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 p-4 text-sm text-stone-400">
            Digite um nome ou telefone para localizar um cliente.
          </div>
        )}
      </div>
    </section>
  );
}
