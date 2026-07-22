import { SectionHeader } from "@/components/provider-profile/profile-form-ui";
import { THEME_PRESET_OPTIONS } from "@/lib/theme-presets";

type AppearanceSectionProps = {
  isPro: boolean;
  currentThemePreset: string;
};

export function AppearanceSection({
  isPro,
  currentThemePreset,
}: AppearanceSectionProps) {
  return (
    <div className="grid gap-5">
      <SectionHeader
        label="Aparência da página"
        description="Escolha um preset visual simples para sua página pública."
        divider={false}
      />

      <div className="grid gap-4 rounded-xl border border-paper-soft bg-paper p-5">
        {!isPro ? (
          <>
            <input
              name="themePreset"
              type="hidden"
              value={currentThemePreset}
            />
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">
                Personalização visual está disponível no plano PRO.
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800/80">
                O tema padrão está ativo na página pública enquanto seu plano
                for FREE.
              </p>
            </div>
            <div className="rounded-xl border border-paper-soft bg-white p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-16 overflow-hidden rounded-lg border border-paper-soft"
                  data-brand-theme="DEFAULT"
                >
                  <span className="flex-1 bg-paper" />
                  <span className="flex-1 bg-leaf" />
                  <span className="flex-1 bg-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Padrão</p>
                  <p className="text-xs text-ink-muted">
                    Neutro e universal, combina com qualquer negócio.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {THEME_PRESET_OPTIONS.map((preset) => (
              <label
                className="cursor-pointer rounded-xl border border-paper-soft bg-white p-4 transition has-[:checked]:border-leaf has-[:checked]:ring-2 has-[:checked]:ring-leaf/20"
                key={preset.id}
              >
                <input
                  className="sr-only"
                  defaultChecked={currentThemePreset === preset.id}
                  name="themePreset"
                  type="radio"
                  value={preset.id}
                />
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-paper-soft"
                    data-brand-theme={preset.id}
                  >
                    <span className={`flex-1 ${preset.preview.background}`} />
                    <span className={`flex-1 ${preset.preview.accent}`} />
                    <span className={`flex-1 ${preset.preview.surface}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {preset.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">
                      {preset.description}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink-muted/80">
                      {preset.fontLabel}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
