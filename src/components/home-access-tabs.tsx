"use client";

import { useState } from "react";
import Link from "next/link";
import { BirthDateInput } from "@/components/birth-date-input";

type HomeAccessTabsProps = {
  email?: string;
  loginError?: string;
  reset?: string;
  blocked?: string;
};

export function HomeAccessTabs({ email, loginError, reset, blocked }: HomeAccessTabsProps) {
  const [tab, setTab] = useState<"login" | "register">(loginError ? "login" : "register");

  return (
    <div className="mt-8 rounded-[28px] border border-amber-200/10 bg-black/20 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 rounded-full border border-amber-200/12 bg-[#100c09] p-1">
        <button
          type="button"
          onClick={() => setTab("login")}
          className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
            tab === "login"
              ? "bg-[linear-gradient(180deg,#7b592d,#3c2916)] text-amber-50 shadow-[inset_0_1px_0_rgba(255,239,204,0.18)]"
              : "text-stone-300 hover:bg-white/[0.04] hover:text-amber-50"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
            tab === "register"
              ? "bg-[linear-gradient(180deg,#7b592d,#3c2916)] text-amber-50 shadow-[inset_0_1px_0_rgba(255,239,204,0.18)]"
              : "text-stone-300 hover:bg-white/[0.04] hover:text-amber-50"
          }`}
        >
          Cadastro
        </button>
      </div>

      {tab === "login" ? (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-5">
          <p className="text-[10px] uppercase tracking-[0.42em] text-amber-200/70">Entrar</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl text-amber-50">Já sou cliente</h3>
          <form action="/api/auth/login" method="post" className="mt-5 space-y-4">
            <input
              name="email"
              type="email"
              placeholder="Seu email"
              defaultValue={email ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Sua senha"
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              required
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-[linear-gradient(180deg,#7b592d,#3c2916)] px-4 py-3 font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,239,204,0.18)] transition hover:brightness-110"
            >
              Entrar na Dommus
            </button>
          </form>
          <div className="mt-4 flex justify-end">
            <Link href="/reset-password" className="text-sm font-medium text-amber-100 transition hover:text-amber-50">
              Esqueci minha senha
            </Link>
          </div>
          {reset ? <p className="mt-4 text-sm text-emerald-300">Senha redefinida com sucesso. Agora você já pode entrar.</p> : null}
          {loginError ? (
            <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              E-mail ou senha incorretos. Confira seus dados e tente novamente.
            </p>
          ) : null}
          {blocked ? <p className="mt-4 text-sm text-amber-100">As funcionalidades estão temporariamente travadas.</p> : null}
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-5">
          <p className="text-[10px] uppercase tracking-[0.42em] text-amber-200/70">Cadastro</p>
          <h3 className="mt-3 font-[var(--font-display)] text-3xl text-amber-50">Novo cliente</h3>
          <form action="/api/auth/register" method="post" className="mt-5 grid gap-4">
            <input
              name="name"
              placeholder="Nome completo"
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              required
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              required
            />
            <input
              name="phone"
              placeholder="Telefone"
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              required
            />
            <BirthDateInput
              name="birthDate"
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Senha"
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              required
            />
            <button
              type="submit"
              className="rounded-2xl border border-amber-300/60 bg-white/[0.02] px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/10"
            >
              Criar minha conta
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
