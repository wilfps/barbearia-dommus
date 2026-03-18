import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#58452f_0%,#15110e_36%,#070707_100%)] px-4 py-8 text-stone-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <div className="glass rounded-[28px] p-5 sm:rounded-[36px] sm:p-8">
          <p className="text-xs uppercase tracking-[0.5em] text-amber-200/70">Redefinir senha</p>
          <h1 className="mt-4 text-3xl text-amber-50">Criar nova senha</h1>
          <p className="mt-3 text-sm text-stone-300">
            Digite seu email e escolha uma nova senha para voltar a entrar na plataforma.
          </p>

          <form action="/api/auth/reset-password" method="post" className="mt-6 space-y-4">
            <input
              name="email"
              type="email"
              placeholder="Seu email"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Nova senha"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
              required
            />
            <button type="submit" className="w-full rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-200">
              Redefinir senha
            </button>
          </form>

          <div className="mt-5">
            <Link href="/" className="text-sm font-medium text-amber-100 hover:text-amber-50">
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
