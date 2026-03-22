import Link from "next/link";
import { Scissors, ShieldCheck, UserRound } from "lucide-react";
import { getSession } from "@/lib/auth";

export async function AppShell({
  children,
  title,
  subtitle,
  myAreaHref = "/dashboard",
  hideAdminLinks = false,
  secondaryNav,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  myAreaHref?: string;
  hideAdminLinks?: boolean;
  secondaryNav?: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#40372a_0%,#171412_45%,#090909_100%)] text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-6 rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur sm:rounded-[32px] sm:p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-amber-200/70 sm:text-xs sm:tracking-[0.5em]">
              Dommus Barbearia
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-amber-50 sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">{subtitle}</p>
          </div>
          <nav className="grid grid-cols-2 gap-3 text-sm sm:flex sm:flex-wrap sm:items-center">
            <Link
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-amber-300/50 hover:bg-amber-300/10 sm:px-4 sm:py-2"
              href={myAreaHref}
            >
              <UserRound className="mr-2 inline size-4" />
              Minha área
            </Link>
            {secondaryNav}
            {!hideAdminLinks || session?.role === "OWNER" ? (
              <>
                {!hideAdminLinks ? (
                  <Link
                    className="rounded-full border border-white/10 px-4 py-3 text-center hover:border-amber-300/50 sm:px-4 sm:py-2"
                    href="/admin"
                  >
                    <Scissors className="mr-2 inline size-4" />
                    Barbeiro
                  </Link>
                ) : null}
                {session?.role === "OWNER" ? (
                  <Link
                    className="rounded-full border border-white/10 px-4 py-3 text-center hover:border-amber-300/50 sm:px-4 sm:py-2"
                    href="/owner"
                  >
                    <ShieldCheck className="mr-2 inline size-4" />
                    Owner
                  </Link>
                ) : !hideAdminLinks ? (
                  <Link
                    className="rounded-full border border-white/10 px-4 py-3 text-center hover:border-amber-300/50 sm:px-4 sm:py-2"
                    href="/owner"
                  >
                    <ShieldCheck className="mr-2 inline size-4" />
                    Owner
                  </Link>
                ) : null}
              </>
            ) : null}
            {session ? (
              <form action="/api/auth/logout" method="post">
                <button
                  className="w-full rounded-full bg-amber-300 px-4 py-3 font-medium text-stone-950 transition hover:bg-amber-200 sm:w-auto sm:py-2"
                  type="submit"
                >
                  Sair
                </button>
              </form>
            ) : null}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
