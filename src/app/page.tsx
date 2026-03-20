import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { HomeAccessTabs } from "@/components/home-access-tabs";
import { getSession } from "@/lib/auth";
import { getSiteSetting, listServices } from "@/lib/db";

type SearchParams = Promise<{ blocked?: string; reset?: string; loginError?: string; email?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const [session, site, services] = await Promise.all([
    getSession(),
    Promise.resolve(getSiteSetting()),
    Promise.resolve(listServices()),
  ]);
  const params = await searchParams;
  const isBlocked = !site.is_open;
  const featuredServices = services.slice(0, 4);

  if (session && (!isBlocked || session.role === "OWNER")) {
    redirect("/dashboard");
  }

  if (isBlocked) {
    return (
      <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#5b432a_0%,#120d0a_34%,#050505_100%)] text-stone-100">
        <section className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl rounded-[28px] border border-amber-200/15 bg-[#15100d]/92 px-6 py-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur sm:rounded-[36px] sm:px-8 sm:py-10">
            <div className="mx-auto flex justify-center">
              <div className="overflow-hidden rounded-full border border-amber-200/20 bg-black/30 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
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
            <h1 className="mt-4 font-[var(--font-display)] text-3xl text-amber-50 sm:text-5xl">Dommus em aviso</h1>
            <p className="mt-4 text-sm leading-7 text-stone-200 sm:text-lg sm:leading-8">{site.maintenance_message}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#070605] text-stone-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#8b6536_0%,rgba(28,20,14,0.96)_24%,#070605_70%)]" />
      <div className="absolute inset-0 opacity-70 bg-[linear-gradient(180deg,rgba(255,221,160,0.08),transparent_15%),radial-gradient(circle_at_bottom,rgba(255,212,143,0.05),transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.015),transparent_14%,transparent_86%,rgba(255,255,255,0.015))]" />

      <section className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[32px] border border-amber-200/10 bg-[#15100d]/90 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="border-b border-amber-200/10 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.32em] text-amber-100/80 lg:justify-between">
              <nav className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <a href="#inicio" className="rounded-full px-3 py-2 transition hover:bg-white/[0.04] hover:text-amber-50">
                  Home
                </a>
                <a href="#servicos" className="rounded-full px-3 py-2 transition hover:bg-white/[0.04] hover:text-amber-50">
                  Servicos
                </a>
                <a href="#acesso" className="rounded-full px-3 py-2 transition hover:bg-white/[0.04] hover:text-amber-50">
                  Cadastro
                </a>
              </nav>

              <div className="hidden items-center gap-2 rounded-full border border-amber-200/15 bg-white/[0.03] px-4 py-2 text-[10px] tracking-[0.38em] text-amber-200/75 lg:flex">
                <Sparkles className="size-4" />
                Padrao Dommus
              </div>
            </div>
          </div>

          <div className="grid items-center gap-8 px-5 py-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
            <div className="hidden lg:block" />

            <div className="flex justify-center">
              <div className="overflow-hidden rounded-full border border-amber-200/18 bg-black/25 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.5)]">
                <Image
                  src="/logo-dommus-2026.png"
                  alt="Logo Dommus Barbearia"
                  width={190}
                  height={190}
                  className="h-auto w-[136px] rounded-full object-cover sm:w-[156px] lg:w-[190px]"
                  priority
                />
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <a
                href="#acesso"
                className="inline-flex items-center gap-3 rounded-full border border-amber-300/45 bg-[linear-gradient(180deg,#7d5a2d,#372314)] px-5 py-3 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,239,204,0.18),0_16px_35px_rgba(0,0,0,0.3)] transition hover:brightness-110"
              >
                Agendar horario
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </header>

        <section id="inicio" className="mt-6 overflow-hidden rounded-[34px] border border-amber-200/10 bg-[#130f0c] shadow-[0_35px_120px_rgba(0,0,0,0.5)]">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-12">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,214,154,0.06),transparent_35%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-3 rounded-full border border-amber-200/15 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.36em] text-amber-100/80">
                  <Sparkles className="size-4" />
                  Tradicao e elegancia
                </div>

                <h1 className="mt-7 max-w-3xl font-[var(--font-display)] text-5xl leading-[0.94] text-amber-50 sm:text-6xl lg:text-7xl">
                  Sua melhor versao pede a experiencia Dommus!
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-8 text-amber-100/85 sm:text-lg">
                  Porque quando se trata da sua imagem, o padrao e sempre o mais alto.
                </p>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
                  Um inicio mais nobre, uma reserva mais rapida e uma apresentacao que ja passa o cuidado premium da barbearia antes mesmo do primeiro atendimento.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="#acesso"
                    className="inline-flex items-center justify-center rounded-full border border-amber-300/45 bg-[linear-gradient(180deg,#7b592d,#3c2916)] px-6 py-3 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,239,204,0.18),0_18px_40px_rgba(0,0,0,0.28)] transition hover:brightness-110"
                  >
                    Faca seu cadastro e agende seu horario
                  </a>
                  <a
                    href="#servicos"
                    className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-stone-100 transition hover:border-amber-200/30 hover:bg-white/[0.05]"
                  >
                    Ver servicos
                  </a>
                </div>
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden border-t border-amber-200/10 lg:min-h-[690px] lg:border-l lg:border-t-0">
              <Image
                src="/services/cabelo-barboterapia.jpg"
                alt="Experiencia premium Dommus"
                fill
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,15,12,0.55),rgba(20,15,12,0.05)_28%,rgba(20,15,12,0.7))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,220,160,0.18),transparent_34%)]" />
              <div className="absolute bottom-6 left-6 right-6 rounded-[26px] border border-amber-200/10 bg-black/40 p-4 backdrop-blur-md sm:bottom-8 sm:left-8 sm:right-8 sm:p-5">
                <p className="text-[10px] uppercase tracking-[0.38em] text-amber-200/70">Assinatura Dommus</p>
                <p className="mt-3 font-[var(--font-display)] text-2xl text-amber-50 sm:text-3xl">
                  Padrao classico em cuidados masculinos.
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-200/80">
                  Ambiente marcante, presenca forte e acabamento preciso para transformar a reserva online em uma experiencia de verdade.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="servicos" className="mt-6 rounded-[34px] border border-amber-200/10 bg-[#120d0b]/92 px-4 py-6 shadow-[0_30px_100px_rgba(0,0,0,0.42)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.42em] text-amber-200/70">Servicos</p>
            <h2 className="mt-3 font-[var(--font-display)] text-3xl text-amber-50 sm:text-4xl lg:text-5xl">Escolha seu proximo cuidado</h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base">
              A vitrine da Dommus ja aparece aqui para induzir o cliente a seguir direto para a agenda sem perder tempo.
            </p>
          </div>

          <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4">
            {featuredServices.map((service) => (
              <article
                key={service.id}
                className="min-w-[276px] snap-start overflow-hidden rounded-[28px] border border-amber-200/10 bg-[linear-gradient(180deg,rgba(255,222,173,0.04),rgba(12,9,7,0.86))] shadow-[0_20px_55px_rgba(0,0,0,0.32)] md:min-w-0"
              >
                <div className="relative h-44 sm:h-48 md:h-52">
                  <Image src={service.image_path} alt={service.name} fill className="object-cover object-center" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_18%,rgba(12,9,7,0.9))]" />
                </div>
                <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-[var(--font-display)] text-xl text-amber-50 sm:text-2xl">{service.name}</h3>
                    <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100 sm:text-sm">
                      {(service.price_in_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-stone-300">{service.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="acesso" className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[30px] border border-amber-200/10 bg-[#15110d]/92 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <p className="text-[10px] uppercase tracking-[0.42em] text-amber-200/70">Acesso</p>
                <h2 className="mt-4 font-[var(--font-display)] text-3xl text-amber-50 sm:text-4xl">Entre ou crie sua conta</h2>
                <p className="mt-3 text-sm leading-7 text-stone-300">
                  Em vez de separar demais a experiencia, o acesso fica junto da vitrine para acelerar a decisao e empurrar o cliente para a reserva com mais facilidade.
                </p>
              </div>
              <div className="rounded-[24px] border border-amber-200/12 bg-black/20 px-5 py-4 text-sm leading-7 text-stone-300 lg:max-w-xs">
                <p className="text-[10px] uppercase tracking-[0.35em] text-amber-200/65">Fluxo rapido</p>
                <p className="mt-2">Servico, cadastro, login e agenda organizados em uma so entrada.</p>
              </div>
            </div>

            <HomeAccessTabs
              email={params.email}
              loginError={params.loginError}
              reset={params.reset}
              blocked={params.blocked}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
