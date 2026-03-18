import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getSiteSetting } from "@/lib/db";

type SearchParams = Promise<{ blocked?: string; reset?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const [session, site] = await Promise.all([getSession(), Promise.resolve(getSiteSetting())]);
  const params = await searchParams;

  if (session) {
    redirect("/dashboard");
  }
  const isBlocked = !site.is_open;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#58452f_0%,#15110e_36%,#070707_100%)] text-stone-100">
      <section className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-4 py-6 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
        {isBlocked ? (
          <div className="pointer-events-none absolute inset-x-4 top-8 z-20 flex justify-center sm:inset-x-6 lg:inset-x-8">
            <div className="glass gold-ring pointer-events-auto w-full max-w-2xl rounded-[28px] px-6 py-5 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)] sm:rounded-[36px] sm:px-8 sm:py-6">
              <p className="text-[10px] uppercase tracking-[0.45em] text-amber-200/70 sm:text-xs">Acesso temporariamente travado</p>
              <h1 className="mt-3 text-2xl text-amber-50 sm:text-4xl">Dommus em aviso</h1>
              <p className="mt-3 text-sm leading-6 text-stone-200 sm:text-base">
                {site.maintenance_message}
              </p>
            </div>
          </div>
        ) : null}
        <div className="flex flex-col justify-between rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur sm:rounded-[40px] sm:p-8 md:p-10">
          <div className="flex h-full flex-col justify-center">
            <div className="flex justify-center lg:justify-start">
              <div className="gold-ring overflow-hidden rounded-full border border-amber-200/20 bg-black/30 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <Image
                  src="/logo-dommus.png"
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
              A MAIOR BARBEARIA DE ITU E REGIÃO
            </h1>

            <p className="mt-5 max-w-3xl text-center text-lg leading-8 text-amber-100/90 lg:text-left">
              Tradição, estilo e atendimento de alto nível para quem busca uma experiência premium de verdade.
            </p>

            <p className="mt-5 max-w-3xl text-center text-base leading-7 text-stone-300 sm:text-lg sm:leading-8 lg:text-left">
              A Dommus Barbearia nasceu para oferecer mais do que um corte: aqui cada cliente vive um atendimento pensado nos detalhes, com ambiente sofisticado, cuidado no acabamento e um padrão de serviço à altura da maior barbearia de Itu e Região.
            </p>

            <p className="mt-5 max-w-3xl text-center text-base leading-7 text-stone-300 sm:text-lg sm:leading-8 lg:text-left">
              De cortes clássicos a experiências completas de barboterapia, a Dommus combina presença, técnica e organização para entregar conforto, confiança e uma imagem forte em cada atendimento.
            </p>
          </div>
        </div>

        <div className={`grid gap-6 ${isBlocked ? "opacity-45" : ""}`}>
          <div className="glass gold-ring rounded-[28px] p-5 sm:rounded-[36px] sm:p-8">
            <p className="text-xs uppercase tracking-[0.5em] text-amber-200/70">Entrar</p>
            <h2 className="mt-4 text-2xl text-amber-50 sm:text-3xl">Acesse a plataforma</h2>
            <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
              <input name="email" type="email" placeholder="Seu email" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-60" required disabled={isBlocked} />
              <input name="password" type="password" placeholder="Sua senha" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-60" required disabled={isBlocked} />
              <button type="submit" disabled={isBlocked} className="w-full rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300">
                Entrar no dashboard
              </button>
            </form>
            <div className="mt-4 flex justify-end">
              <Link href="/reset-password" className="text-sm font-medium text-amber-100 transition hover:text-amber-50">
                Esqueci minha senha
              </Link>
            </div>
            {params.reset ? (
              <p className="mt-4 text-sm text-emerald-300">
                Senha redefinida com sucesso. Agora você já pode entrar.
              </p>
            ) : null}
            {isBlocked || params.blocked ? (
              <p className="mt-4 text-sm text-amber-100">
                As funcionalidades estão temporariamente travadas.
              </p>
            ) : null}
          </div>

          <div className="glass rounded-[28px] p-5 sm:rounded-[36px] sm:p-8">
            <p className="text-xs uppercase tracking-[0.5em] text-amber-200/70">Criar conta</p>
            <h2 className="mt-4 text-2xl text-amber-50 sm:text-3xl">Novo cliente Dommus</h2>
            <form action="/api/auth/register" method="post" className="mt-6 grid gap-4">
              <input name="name" placeholder="Nome completo" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-60" required disabled={isBlocked} />
              <input name="email" type="email" placeholder="Email" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-60" required disabled={isBlocked} />
              <input name="phone" placeholder="Telefone" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-60" required disabled={isBlocked} />
              <input name="birthDate" placeholder="Data de nascimento (dd/mm/aaaa)" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-60" required disabled={isBlocked} />
              <input name="password" type="password" placeholder="Senha" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-60" required disabled={isBlocked} />
              <button type="submit" disabled={isBlocked} className="rounded-2xl border border-amber-300/60 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:border-stone-600 disabled:text-stone-400">
                Criar minha conta
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
