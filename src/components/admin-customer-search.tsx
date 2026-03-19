"use client";

import { useMemo, useState } from "react";

type CustomerState = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function AdminCustomerSearch({ customers }: { customers: CustomerState[] }) {
  const [query, setQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    const normalized = normalizeSearch(query);
    if (!normalized) return [];

    return customers.filter((customer) => {
      const haystack = `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [customers, query]);

  return (
    <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
      <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Clientes</p>
      <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Pesquisar cliente</h2>
      <p className="mt-2 text-sm text-stone-300">
        Busque por nome ou telefone para encontrar rapidamente um cliente cadastrado.
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
                <p className="text-lg text-amber-50">{customer.name}</p>
                <p className="mt-1 text-sm text-stone-300">{customer.phone}</p>
                <p className="mt-1 text-sm text-stone-400">{customer.email}</p>
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
