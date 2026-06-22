import type { ProviderProfile } from "@prisma/client";

import { saveProviderProfile } from "@/lib/actions/provider-profile";

type ProfileFormProps = {
  profile: ProviderProfile | null;
  userEmail?: string | null;
};

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  return (
    <form action={saveProviderProfile} className="mt-8 grid gap-5">
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="businessName">
          Nome do negócio
        </label>
        <input
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
          defaultValue={profile?.businessName ?? ""}
          id="businessName"
          name="businessName"
          required
          type="text"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="slug">
          Slug público
        </label>
        <input
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm lowercase outline-none focus:border-leaf"
          defaultValue={profile?.slug ?? ""}
          id="slug"
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          type="text"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="description">
          Descrição
        </label>
        <textarea
          className="min-h-32 rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          defaultValue={profile?.description ?? ""}
          id="description"
          name="description"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="phone">
            Telefone
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={profile?.phone ?? ""}
            id="phone"
            name="phone"
            type="text"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="email">
            E-mail de contato
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={profile?.email ?? userEmail ?? ""}
            id="email"
            name="email"
            type="email"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="city">
            Cidade
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={profile?.city ?? ""}
            id="city"
            name="city"
            type="text"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="state">
            Estado
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={profile?.state ?? ""}
            id="state"
            name="state"
            type="text"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold text-ink">
        <input
          className="h-4 w-4 accent-leaf"
          defaultChecked={profile?.isPublished ?? false}
          name="isPublished"
          type="checkbox"
        />
        Publicar perfil quando a página pública estiver disponível
      </label>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443] md:w-fit"
        type="submit"
      >
        Salvar perfil
      </button>
    </form>
  );
}
