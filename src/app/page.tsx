import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { BirthDateInput } from "@/components/birth-date-input";
import { getSession } from "@/lib/auth";
import { getSiteSetting } from "@/lib/db";

type SearchParams = Promise<{ blocked?: string; reset?: string; loginError?: string; email?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const [session, site] = await Promise.all([getSession(), Promise.resolve(getSiteSetting())]);
  const params = await searchParams;
  const isBlocked = !site.is_open;

  if (session && (!isBlocked || session.role === "OWNER")) {
    redirect("/dashboard");
  }

  if (isBlocked) {
    return (
      <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#58452f_0%,#15110e_36%,#070707_100%)] text-stone-100">
        <section className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="glass gold-ring w-full max-w-2xl rounded-[28px] px-6 py-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)] sm:rounded-[36px] sm:px-8 sm:py-10">
            <div className="mx-auto flex justify-center">
              <div className="gold-ring overflow-hidden rounded-full border border-amber-200/20 bg-black/30 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <Image
                  src="/logo-dommus-2026.png"
                  alt="Logo Dommus Barbearia"
                  width={128}
                  height={128}
                  className="h-auto w-[108px] rounded-full object-cover sm:w-[128px]"
                  priority
                />
              </div>
            </div>

            <p className="mt-6 text-[10px] uppercase tracking-[0.45em] text-amber-200/70 sm:text-xs">Acesso temporariamente travado</p>
            <h1 className="mt-4 text-3xl text-amber-50 sm:text-5xl">Dommus em aviso</h1>
            <p className="mt-4 text-sm leading-7 text-stone-200 sm:text-lg sm:leading-8">{site.maintenance_message}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#58452f_0%,#15110e_36%,#070707_100%)] text-stone-100">
      <section className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-4 py-6 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
        <div className="flex flex-col justify-between rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur sm:rounded-[40px] sm:p-8 md:p-10">
          <div className="flex h-full flex-col justify-center">
            <div className="flex justify-center lg:justify-start">
              <div className="gold-ring overflow-hidden rounded-full border border-amber-200/20 bg-black/30 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <Image
                  src="/logo-dommus-2026.png"
                  alt="Logo Dommus Barbearia"
                  width={120}
                  height={120}
                  className="h-auto w-[104px] rounded-full object-cover sm:w-[120px]"
                  priority
                />
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-3 self-center rounded-full border border-amber-200/20 bg-amber-300/10 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-amber-100 sm:text-xs sm:tracking-[0.4em] lg:self-start">
              <Sparkles className="size-4" />
              Dommus Barbearia
            </div>

            <h1 className="mt-6 max-w-4xl text-center text-4xl leading-tight text-amber-50 sm:text-5xl md:text-6xl lg:text-left lg:text-7xl">
              Barbearia Dommus
            </h1>

            <p className="mt-5 max-w-3xl text-center text-lg leading-8 text-amber-100/90 lg:text-left">
              Sua melhor versão pede a experiência Dommus!
            </p>

            <p className="mt-5 max-w-3xl text-center text-base leading-7 text-stone-300 sm:text-lg sm:leading-8 lg:text-left">
              Porque quando se trata da sua imagem, o padrão é sempre o mais alto.
            </p>

            <p className="mt-5 max-w-3xl text-center text-base leading-7 text-stone-300 sm:text-lg sm:leading-8 lg:text-left">
              Faça seu cadastro e agende seu horário!
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="glass gold-ring rounded-[28px] p-5 sm:rounded-[36px] sm:p-8">
            <p className="text-xs uppercase tracking-[0.5em] text-amber-200/70">Entrar</p>
            <h2 className="mt-4 text-2xl text-amber-50 sm:text-3xl">Acesse a plataforma</h2>
            <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
              <input
                name="email"
                type="email"
                placeholder="Seu email"
                defaultValue={params.email ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Sua senha"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
                required
              />
              <button type="submit" className="w-full rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-200">
                Entrar no dashboard
              </button>
            </form>
            <div className="mt-4 flex justify-end">
              <Link href="/reset-password" className="text-sm font-medium text-amber-100 transition hover:text-amber-50">
                Esqueci minha senha
              </Link>
            </div>
            {params.reset ? (
              <p className="mt-4 text-sm text-emerald-300">Senha redefinida com sucesso. Agora você já pode entrar.</p>
            ) : null}
            {params.loginError ? (
              <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                E-mail ou senha incorretos. Confira seus dados e tente novamente.
              </p>
            ) : null}
            {params.blocked ? (
              <p className="mt-4 text-sm text-amber-100">As funcionalidades estão temporariamente travadas.</p>
            ) : null}
          </div>

          <div className="glass rounded-[28px] p-5 sm:rounded-[36px] sm:p-8">
            <p className="text-xs uppercase tracking-[0.5em] text-amber-200/70">Criar conta</p>
            <h2 className="mt-4 text-2xl text-amber-50 sm:text-3xl">Novo cliente Dommus</h2>
            <form action="/api/auth/register" method="post" className="mt-6 grid gap-4">
              <input name="name" placeholder="Nome completo" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500" required />
              <input name="email" type="email" placeholder="Email" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500" required />
              <input name="phone" placeholder="Telefone" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500" required />
              <BirthDateInput
                name="birthDate"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
                required
              />
              <input name="password" type="password" placeholder="Senha" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500" required />
              <button type="submit" className="rounded-2xl border border-amber-300/60 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/10">
                Criar minha conta
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
