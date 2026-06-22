import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

const mvpSteps = [
  "Publique seu perfil e seus serviços.",
  "Receba pedidos de orçamento por link público.",
  "Acompanhe pedidos no painel do prestador.",
  "Envie propostas para aprovação ou recusa online."
];

export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-leaf">
            Orçamentos organizados para prestadores de serviço
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-normal text-ink md:text-6xl">
            Receba pedidos, envie propostas e feche serviços por link.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
            O OrçaFácil reúne perfil público, serviços, pedidos recebidos e
            propostas em um fluxo simples para prestadores de serviço.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443]"
              href="#proximos-passos"
            >
              Ver próximos passos
            </a>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
              href="#como-funciona"
            >
              Como funciona
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="border-b border-stone-200 pb-4">
            <p className="text-sm font-semibold text-stone-500">
              Pedido recebido
            </p>
            <h2 className="mt-2 text-2xl font-bold">Reforma de banheiro</h2>
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-stone-500">Cliente</dt>
              <dd className="mt-1 text-base text-ink">Mariana Costa</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-500">Serviço</dt>
              <dd className="mt-1 text-base text-ink">
                Troca de revestimento e instalação hidráulica
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-500">Status</dt>
              <dd className="mt-2 inline-flex rounded-full bg-mint px-3 py-1 text-sm font-semibold text-leaf">
                Aguardando proposta
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="como-funciona" className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-bold text-ink">Como o MVP funciona</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {mvpSteps.map((step, index) => (
              <div
                className="rounded-lg border border-stone-200 bg-paper p-5"
                key={step}
              >
                <span className="text-sm font-bold text-leaf">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-sm leading-6 text-stone-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proximos-passos" className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-2xl font-bold text-ink">Próxima etapa</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
          O MVP já cobre o fluxo principal. A próxima etapa é validar o caminho
          completo em ambiente real e preparar o deploy.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
