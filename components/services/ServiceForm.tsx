"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createService, updateService } from "@/lib/actions/services";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { ItemCardPreview } from "@/components/services/ItemCardPreview";
import {
  getServiceSaleMode,
  getTechnicalSaleMode,
  SALE_MODE_OPTIONS,
  type ServiceSaleMode,
} from "@/lib/service-sale-mode";
import type { ActionResult } from "@/types";
import type { ServiceForClient } from "@/types/service";

type ServiceFormProps = {
  service?: ServiceForClient;
  isPro?: boolean;
  onCancel?: () => void;
  onSaved?: (name: string) => void;
  embedded?: boolean;
  defaultItemType?: "SERVICE" | "PRODUCT";
};

type ImageStatus = "idle" | "removing";

const inputClass =
  "min-h-11 w-full min-w-0 rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

function SectionDivider() {
  return <div className="border-t border-paper-soft" />;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-leaf">{children}</p>
  );
}

export function ServiceForm({
  service,
  isPro = false,
  onCancel,
  onSaved,
  embedded = false,
  defaultItemType = "SERVICE",
}: ServiceFormProps) {
  const router = useRouter();
  const action = service ? updateService : createService;
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    action,
    undefined,
  );

  const initialSaleMode = service
    ? getServiceSaleMode({
        pricingType: service.pricingType,
        fixedServiceCheckoutMode: service.fixedServiceCheckoutMode,
      })
    : "CUSTOM";

  const [saleMode, setSaleMode] = useState<ServiceSaleMode>(initialSaleMode);
  const [itemType, setItemType] = useState<"SERVICE" | "PRODUCT">(
    service?.itemType ?? defaultItemType
  );
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [requiresScheduling, setRequiresScheduling] = useState(
    service?.requiresSchedulingDetails ?? false,
  );

  // Preview state — tracks form fields for the live card preview
  const [previewName, setPreviewName] = useState(service?.name ?? "");
  const [previewDescription, setPreviewDescription] = useState(service?.description ?? "");
  const [previewPrice, setPreviewPrice] = useState(service?.basePrice ?? "");

  const [imageUrl, setImageUrl] = useState<string | null>(service?.imageUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageStatus, setImageStatus] = useState<ImageStatus>("idle");
  const [imageMessage, setImageMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!service;

  useEffect(() => {
    if (!state || !("serviceId" in state)) return;
    const { serviceId } = state;
    const fileToUpload = selectedFile;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null); // eslint-disable-line react-hooks/set-state-in-effect
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (fileToUpload) {
      const form = new FormData();
      form.set("image", fileToUpload);
      fetch(`/api/services/${serviceId}/image`, { method: "POST", body: form })
        .then((res) => res.json())
        .then((data: { imageUrl?: string; error?: string }) => {
          if (onSaved) {
            onSaved(previewName);
            router.refresh();
            return;
          }
          if (isEditing) {
            if (data?.imageUrl) setImageUrl(data.imageUrl);
            if (data?.error) {
              setImageMessage({ type: "error", text: "Item salvo, mas a imagem falhou. Tente reenviar." });
            } else {
              setImageMessage(null);
              setSavedSuccess(true);
            }
            router.refresh();
          } else {
            const param = data?.error ? `?success=saved&image_error=1` : `?success=saved`;
            router.push(`/dashboard/servicos${param}`);
            router.refresh();
          }
        })
        .catch(() => {
          if (onSaved) {
            onSaved(previewName);
            router.refresh();
            return;
          }
          if (isEditing) {
            setImageMessage({ type: "error", text: "Item salvo, mas a imagem falhou. Tente reenviar." });
            router.refresh();
          } else {
            router.push("/dashboard/servicos?success=saved&image_error=1");
            router.refresh();
          }
        });
    } else {
      if (onSaved) {
        onSaved(previewName);
        router.refresh();
        return;
      }
      if (isEditing) {
        setSavedSuccess(true);
        router.refresh();
      } else {
        router.push("/dashboard/servicos?success=saved");
        router.refresh();
      }
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFile(file);
    setImageMessage(null);
  }

  async function handleRemove() {
    if (!service?.id || !imageUrl) return;
    setImageStatus("removing");
    setImageMessage(null);
    try {
      const res = await fetch(`/api/services/${service.id}/image`, { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setImageMessage({ type: "error", text: data.error ?? "Erro ao remover imagem." });
        return;
      }
      setImageUrl(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setImageMessage(null);
    } catch {
      setImageMessage({ type: "error", text: "Erro de conexão. Tente novamente." });
    } finally {
      setImageStatus("idle");
    }
  }

  const imageBusy = imageStatus !== "idle";
  const displayImage = previewUrl ?? imageUrl;
  const errorState = state && "error" in state ? state : null;
  const technicalSaleMode = getTechnicalSaleMode(saleMode);

  return (
    <form
      action={formAction}
      className={`grid w-full min-w-0 gap-0 overflow-hidden ${
        embedded ? "" : "rounded-xl border border-paper-soft bg-white p-4 shadow-card sm:p-5"
      }`}
    >
      {service ? <input name="serviceId" type="hidden" value={service.id} /> : null}
      <input name="itemType" type="hidden" value={itemType} />
      <input name="pricingType" type="hidden" value={technicalSaleMode.pricingType} />
      <input name="fixedServiceCheckoutMode" type="hidden" value={technicalSaleMode.fixedServiceCheckoutMode} />
      <input name="isActive" type="hidden" value={isActive ? "on" : ""} />
      <input name="requiresSchedulingDetails" type="hidden" value={requiresScheduling ? "on" : ""} />

      {savedSuccess ? (
        <p className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Item salvo com sucesso!
        </p>
      ) : null}
      {errorState ? (
        <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorState.error}
        </p>
      ) : null}

      {/* ── Prévia na vitrine ───────────────────── */}
      <div className="mb-5 grid gap-2">
        <SectionHeader>Prévia na vitrine</SectionHeader>
        <ItemCardPreview
          name={previewName}
          description={previewDescription}
          basePrice={previewPrice}
          itemType={itemType}
          saleMode={saleMode}
        />
      </div>

      <SectionDivider />

      {/* ── Informações ─────────────────────────── */}
      <div className={`grid gap-4 ${embedded ? "py-5" : ""}`}>
        <SectionHeader>Informações</SectionHeader>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor={`name-${service?.id ?? "new"}`}>
            Nome do item
          </label>
          <input
            className={inputClass}
            defaultValue={service?.name ?? ""}
            id={`name-${service?.id ?? "new"}`}
            maxLength={120}
            name="name"
            onChange={(e) => setPreviewName(e.target.value)}
            placeholder={
              defaultItemType === "PRODUCT"
                ? "Ex: Kit presenteável, Cesta de café da manhã"
                : defaultItemType === "SERVICE"
                  ? "Ex: Pintura residencial, Consultoria de imagem"
                  : "Ex: Kit presenteável, Pintura residencial"
            }
            required
            type="text"
          />
          <p className="text-xs text-ink-muted">Máximo 120 caracteres.</p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor={`description-${service?.id ?? "new"}`}>
            Descrição <span className="font-normal text-ink-muted">(opcional)</span>
          </label>
          <textarea
            className="min-h-24 w-full min-w-0 rounded-lg border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            defaultValue={service?.description ?? ""}
            id={`description-${service?.id ?? "new"}`}
            maxLength={600}
            name="description"
            onChange={(e) => setPreviewDescription(e.target.value)}
            placeholder="Descreva o item, o que está incluso e seus diferenciais…"
          />
          <p className="text-xs text-ink-muted">Máximo 600 caracteres.</p>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-semibold text-ink">Este item é um:</p>
          <div className="flex min-w-0 rounded-xl border border-paper-soft bg-paper p-1">
            {(["PRODUCT", "SERVICE"] as const).map((type) => (
              <button
                key={type}
                aria-pressed={itemType === type}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 sm:py-2.5 sm:text-sm ${
                  itemType === type
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
                onClick={() => setItemType(type)}
                type="button"
              >
                {type === "PRODUCT" ? "Produto" : "Serviço"}
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-ink-muted">
            {itemType === "PRODUCT"
              ? "Itens físicos, digitais, kits, encomendas ou produtos da vitrine."
              : "Atendimentos, consultorias, trabalhos personalizados ou serviços prestados."}
          </p>
        </div>
      </div>

      <SectionDivider />

      {/* ── Como é vendido ──────────────────────── */}
      <div className="grid gap-4 py-5">
        <SectionHeader>Como este item é vendido?</SectionHeader>

        <div className="grid gap-2">
          {SALE_MODE_OPTIONS.map((opt) => {
            const selected = saleMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setSaleMode(opt.value)}
                className={`flex w-full min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition sm:gap-4 sm:p-4 ${
                  selected
                    ? "border-leaf/40 bg-mint/30"
                    : "border-paper-soft bg-paper hover:border-stone-300"
                }`}
              >
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-current">
                  {selected ? <div className="h-2 w-2 rounded-full bg-leaf" /> : null}
                </div>
                <div className="grid min-w-0 gap-0.5">
                  <span className="break-words text-sm font-semibold text-ink">{opt.label}</span>
                  <span className="break-words text-xs leading-5 text-ink-muted">{opt.description}</span>
                </div>
              </button>
            );
          })}
          {saleMode === "FIXED_PIX" ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Requer dados Pix configurados no perfil. O pagamento é feito diretamente para você e a confirmação é manual.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor={`basePrice-${service?.id ?? "new"}`}>
            {saleMode !== "CUSTOM" ? (
              <>
                Preço <span className="text-red-500">*</span>
              </>
            ) : (
              <>
                Preço base <span className="font-normal text-ink-muted">(opcional)</span>
              </>
            )}
          </label>
          <CurrencyInput
            className={inputClass}
            defaultValue={service?.basePrice ?? ""}
            id={`basePrice-${service?.id ?? "new"}`}
            name="basePrice"
            onValueChange={setPreviewPrice}
          />
          <p className="text-xs text-ink-muted">
            {saleMode !== "CUSTOM"
              ? "Exibido publicamente no card do item."
              : "Referência interna. Não é exibido ao cliente."}
          </p>
        </div>
      </div>

      <SectionDivider />

      {/* ── Opções ─────────────────────────────── */}
      <div className="grid gap-3 py-5">
        <SectionHeader>Opções</SectionHeader>

        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className={`flex w-full min-w-0 cursor-pointer items-center gap-4 rounded-xl border p-3 text-left transition sm:p-4 ${
            isActive ? "border-leaf/40 bg-mint/30" : "border-paper-soft bg-paper"
          }`}
        >
          <div className="relative h-6 w-11 shrink-0">
            <div className={`h-6 w-11 rounded-full transition-colors duration-200 ${isActive ? "bg-leaf" : "bg-stone-300"}`} />
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <div className="grid min-w-0 gap-0.5">
            <span className="text-sm font-semibold text-ink">
              {isActive ? "Visível na vitrine" : "Oculto"}
            </span>
            <span className="text-xs leading-5 text-ink-muted">
              {isActive
                ? "Aparece na vitrine pública. Clientes podem solicitar."
                : "Oculto. Clientes não conseguem ver nem solicitar."}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRequiresScheduling((v) => !v)}
          className={`flex w-full min-w-0 cursor-pointer items-center gap-4 rounded-xl border p-3 text-left transition sm:p-4 ${
            requiresScheduling ? "border-leaf/40 bg-mint/30" : "border-paper-soft bg-paper"
          }`}
        >
          <div className="relative h-6 w-11 shrink-0">
            <div className={`h-6 w-11 rounded-full transition-colors duration-200 ${requiresScheduling ? "bg-leaf" : "bg-stone-300"}`} />
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${requiresScheduling ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <div className="grid min-w-0 gap-0.5">
            <span className="text-sm font-semibold text-ink">Pedir data, horário e local</span>
            <span className="text-xs leading-5 text-ink-muted">
              {requiresScheduling
                ? "O formulário de pedido pedirá data desejada, horário e local."
                : "Formulário de pedido sem campos de agendamento."}
            </span>
          </div>
        </button>
      </div>

      <SectionDivider />

      {/* ── Imagem ─────────────────────────────── */}
      <div className="grid gap-3 py-5">
        <SectionHeader>Imagem</SectionHeader>

        {!isPro ? (
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-paper-soft bg-paper px-4 py-3">
            <p className="text-xs text-ink-muted">
              Imagem por item disponível no plano <span className="font-semibold text-ink">PRO</span>.
            </p>
          </div>
        ) : !service?.id ? (
          <div className="grid gap-3">
            {displayImage ? (
              <div className="relative overflow-hidden rounded-xl border border-paper-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayImage!} alt="Prévia" loading="lazy" className="h-40 w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Será enviada ao salvar
                </span>
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-paper-soft bg-paper">
                <p className="text-xs text-ink-muted">Nenhuma imagem selecionada</p>
              </div>
            )}
            <div className="grid gap-1 overflow-hidden">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="w-full min-w-0 max-w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:bg-paper-soft"
                id="image-new"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <p className="text-xs text-ink-muted">JPEG, PNG ou WebP · máx. 2 MB · enviada ao salvar</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {displayImage ? (
              <div className="relative overflow-hidden rounded-xl border border-paper-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayImage!} alt="Prévia" loading="lazy" className="h-40 w-full object-cover" />
                {previewUrl ? (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Será salva ao salvar
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-paper-soft bg-paper">
                <p className="text-xs text-ink-muted">Nenhuma imagem</p>
              </div>
            )}
            <div className="grid gap-1 overflow-hidden">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="w-full min-w-0 max-w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:bg-paper-soft"
                disabled={imageBusy}
                id={`image-${service.id}`}
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <p className="text-xs text-ink-muted">JPEG, PNG ou WebP · máx. 2 MB · enviada ao salvar</p>
            </div>
            {imageUrl && !previewUrl ? (
              <button
                className="inline-flex min-h-9 w-fit items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                disabled={imageBusy}
                onClick={handleRemove}
                type="button"
              >
                {imageStatus === "removing" ? "Removendo..." : "Remover imagem"}
              </button>
            ) : null}
            {imageMessage ? (
              <p className={`text-xs font-semibold ${imageMessage.type === "error" ? "text-red-600" : "text-leaf"}`}>
                {imageMessage.text}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Ações ──────────────────────────────── */}
      <div className="flex flex-col gap-3 border-t border-paper-soft pt-5 sm:flex-row">
        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-50 sm:w-fit"
          disabled={isPending || imageBusy}
          type="submit"
        >
          {isPending
            ? selectedFile && !service
              ? "Salvando e enviando imagem..."
              : "Salvando..."
            : service
              ? "Salvar item"
              : "Cadastrar item"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-paper-soft bg-white px-5 text-sm font-semibold text-ink transition hover:border-stone-300 disabled:opacity-50 sm:w-fit"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
