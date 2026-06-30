"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createService, updateService } from "@/lib/actions/services";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import type { ActionResult } from "@/types";
import type { ServiceForClient } from "@/types/service";

type ServiceFormProps = {
  service?: ServiceForClient;
  isPro?: boolean;
  onCancel?: () => void;
  embedded?: boolean;
};

type ImageStatus = "idle" | "removing";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
      {children}
    </p>
  );
}

export function ServiceForm({
  service,
  isPro = false,
  onCancel,
  embedded = false,
}: ServiceFormProps) {
  const router = useRouter();
  const action = service ? updateService : createService;
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    action,
    undefined,
  );
  const [pricingType, setPricingType] = useState<"FIXED" | "CUSTOM">(
    service?.pricingType ?? "CUSTOM",
  );
  const [checkoutMode, setCheckoutMode] = useState<
    "REQUEST_ONLY" | "REQUIRE_PIX_PAYMENT"
  >(service?.fixedServiceCheckoutMode ?? "REQUEST_ONLY");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [requiresScheduling, setRequiresScheduling] = useState(
    service?.requiresSchedulingDetails ?? false,
  );

  const [imageUrl, setImageUrl] = useState<string | null>(
    service?.imageUrl ?? null,
  );
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
          if (isEditing) {
            if (data?.imageUrl) setImageUrl(data.imageUrl);
            if (data?.error) {
              setImageMessage({
                type: "error",
                text: "Serviço salvo, mas a imagem falhou. Tente reenviar.",
              });
            } else {
              setImageMessage(null);
              setSavedSuccess(true);
            }
            router.refresh();
          } else {
            const param = data?.error
              ? `?success=saved&image_error=1`
              : `?success=saved`;
            router.push(`/dashboard/servicos${param}`);
            router.refresh();
          }
        })
        .catch(() => {
          if (isEditing) {
            setImageMessage({
              type: "error",
              text: "Serviço salvo, mas a imagem falhou. Tente reenviar.",
            });
            router.refresh();
          } else {
            router.push("/dashboard/servicos?success=saved&image_error=1");
            router.refresh();
          }
        });
    } else {
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
      const res = await fetch(`/api/services/${service.id}/image`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok) {
        setImageMessage({
          type: "error",
          text: data.error ?? "Erro ao remover imagem.",
        });
        return;
      }

      setImageUrl(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setImageMessage(null);
    } catch {
      setImageMessage({
        type: "error",
        text: "Erro de conexão. Tente novamente.",
      });
    } finally {
      setImageStatus("idle");
    }
  }

  const imageBusy = imageStatus !== "idle";
  const displayImage = previewUrl ?? imageUrl;
  const errorState = state && "error" in state ? state : null;

  return (
    <form
      action={formAction}
      className={`grid w-full min-w-0 gap-5 overflow-hidden ${embedded ? "" : "rounded-xl border border-paper-soft bg-white p-4 shadow-card sm:p-5"}`}
    >
      {service ? (
        <input name="serviceId" type="hidden" value={service.id} />
      ) : null}
      <input name="pricingType" type="hidden" value={pricingType} />
      <input
        name="fixedServiceCheckoutMode"
        type="hidden"
        value={pricingType === "FIXED" ? checkoutMode : "REQUEST_ONLY"}
      />
      <input name="isActive" type="hidden" value={isActive ? "on" : ""} />
      <input
        name="requiresSchedulingDetails"
        type="hidden"
        value={requiresScheduling ? "on" : ""}
      />

      {savedSuccess ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Serviço salvo com sucesso!
        </p>
      ) : null}

      {errorState ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorState.error}
        </p>
      ) : null}

      {/* ── Informações básicas ────────────────── */}
      <div className="grid min-w-0 gap-4">
        <SectionLabel>Informações</SectionLabel>

        <div className="grid min-w-0 gap-2">
          <label
            className="text-sm font-semibold text-ink"
            htmlFor={`name-${service?.id ?? "new"}`}
          >
            Nome do serviço
          </label>
          <input
            className="min-h-11 w-full min-w-0 rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            defaultValue={service?.name ?? ""}
            id={`name-${service?.id ?? "new"}`}
            maxLength={120}
            name="name"
            placeholder="Ex: Pintura residencial, Corte de cabelo"
            required
            type="text"
          />
          <p className="text-xs text-ink-muted">Máximo 120 caracteres.</p>
        </div>

        <div className="grid min-w-0 gap-2">
          <label
            className="text-sm font-semibold text-ink"
            htmlFor={`description-${service?.id ?? "new"}`}
          >
            Descrição{" "}
            <span className="font-normal text-ink-muted">(opcional)</span>
          </label>
          <textarea
            className="min-h-24 w-full min-w-0 rounded-lg border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            defaultValue={service?.description ?? ""}
            id={`description-${service?.id ?? "new"}`}
            maxLength={600}
            name="description"
            placeholder="Descreva o serviço, o que está incluso, diferenciais…"
          />
          <p className="text-xs text-ink-muted">Máximo 600 caracteres.</p>
        </div>
      </div>

      {/* ── Precificação ───────────────────────── */}
      <div className="grid min-w-0 gap-4">
        <SectionLabel>Precificação</SectionLabel>

        <div>
          <div className="flex min-w-0 rounded-xl border border-paper-soft bg-paper p-1">
            <button
              type="button"
              onClick={() => {
                setPricingType("CUSTOM");
                setCheckoutMode("REQUEST_ONLY");
              }}
              className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 sm:py-2.5 sm:text-sm ${
                pricingType === "CUSTOM"
                  ? "bg-white shadow-sm text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Sob orçamento
            </button>
            <button
              type="button"
              onClick={() => setPricingType("FIXED")}
              className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 sm:py-2.5 sm:text-sm ${
                pricingType === "FIXED"
                  ? "bg-white shadow-sm text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Preço fixo
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            {pricingType === "FIXED"
              ? "O preço é exibido publicamente e o cliente solicita diretamente, sem precisar enviar mensagem."
              : "O cliente envia um pedido descrevendo o que precisa e você responde com uma proposta."}
          </p>
        </div>

        {pricingType === "FIXED" ? (
          <button
            type="button"
            onClick={() =>
              setCheckoutMode((m) =>
                m === "REQUEST_ONLY" ? "REQUIRE_PIX_PAYMENT" : "REQUEST_ONLY",
              )
            }
            className={`flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition sm:gap-4 sm:p-4 ${
              checkoutMode === "REQUIRE_PIX_PAYMENT"
                ? "border-leaf/40 bg-mint/30"
                : "border-paper-soft bg-paper"
            }`}
          >
            <div className="relative mt-0.5 h-6 w-11 shrink-0">
              <div
                className={`h-6 w-11 rounded-full transition-colors duration-200 ${
                  checkoutMode === "REQUIRE_PIX_PAYMENT"
                    ? "bg-leaf"
                    : "bg-stone-300"
                }`}
              />
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  checkoutMode === "REQUIRE_PIX_PAYMENT"
                    ? "translate-x-5"
                    : "translate-x-0.5"
                }`}
              />
            </div>
            <div className="grid min-w-0 gap-0.5">
              <span className="break-words text-sm font-semibold text-ink">
                Exigir pagamento antecipado via Pix
              </span>
              <span className="break-words text-xs leading-5 text-ink-muted">
                {checkoutMode === "REQUIRE_PIX_PAYMENT"
                  ? "O cliente precisará pagar via Pix para concluir a solicitação. O pagamento é feito diretamente para você e a confirmação continua sendo manual."
                  : "O cliente apenas envia uma solicitação. Sem opção de pagamento antecipado."}
              </span>
            </div>
          </button>
        ) : null}

        <div className="grid min-w-0 gap-2">
          <label
            className="text-sm font-semibold text-ink"
            htmlFor={`basePrice-${service?.id ?? "new"}`}
          >
            {pricingType === "FIXED" ? "Preço" : "Preço base"}
            {pricingType === "FIXED" ? (
              <span className="ml-1 text-red-500">*</span>
            ) : (
              <span className="ml-1 font-normal text-ink-muted">
                (opcional)
              </span>
            )}
          </label>
          <CurrencyInput
            className="min-h-11 w-full min-w-0 rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            defaultValue={service?.basePrice ?? ""}
            id={`basePrice-${service?.id ?? "new"}`}
            name="basePrice"
          />
          <p className="text-xs text-ink-muted">
            {pricingType === "FIXED"
              ? "Exibido publicamente no card do serviço."
              : "Referência interna. Não é exibido ao cliente."}
          </p>
        </div>
      </div>

      {/* ── Opções ─────────────────────────────── */}
      <div className="grid min-w-0 gap-3">
        <SectionLabel>Opções</SectionLabel>

        {/* isActive toggle card */}
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className={`flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition sm:gap-4 sm:p-4 ${
            isActive
              ? "border-leaf/40 bg-mint/30"
              : "border-paper-soft bg-paper"
          }`}
        >
          <div className="relative mt-0.5 h-6 w-11 shrink-0">
            <div
              className={`h-6 w-11 rounded-full transition-colors duration-200 ${
                isActive ? "bg-leaf" : "bg-stone-300"
              }`}
            />
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isActive ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
          <div className="grid min-w-0 gap-0.5">
            <span className="break-words text-sm font-semibold text-ink">
              {isActive ? "Visível na página pública" : "Oculto"}
            </span>
            <span className="break-words text-xs leading-5 text-ink-muted">
              {isActive
                ? "Este serviço aparece no seu perfil e os clientes podem solicitá-lo."
                : "Este serviço está oculto. Clientes não conseguem vê-lo nem solicitá-lo."}
            </span>
          </div>
        </button>

        {/* requiresSchedulingDetails toggle card */}
        <button
          type="button"
          onClick={() => setRequiresScheduling((v) => !v)}
          className={`flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition sm:gap-4 sm:p-4 ${
            requiresScheduling
              ? "border-leaf/40 bg-mint/30"
              : "border-paper-soft bg-paper"
          }`}
        >
          <div className="relative mt-0.5 h-6 w-11 shrink-0">
            <div
              className={`h-6 w-11 rounded-full transition-colors duration-200 ${
                requiresScheduling ? "bg-leaf" : "bg-stone-300"
              }`}
            />
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                requiresScheduling ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
          <div className="grid min-w-0 gap-0.5">
            <span className="break-words text-sm font-semibold text-ink">
              Pedir data, horário e local
            </span>
            <span className="break-words text-xs leading-5 text-ink-muted">
              {requiresScheduling
                ? "O formulário de pedido pedirá a data desejada, horário ou período e o local do serviço."
                : "O formulário de pedido não pede informações de agendamento."}
            </span>
          </div>
        </button>
      </div>

      {/* ── Imagem ─────────────────────────────── */}
      <div className="grid min-w-0 gap-3">
        <SectionLabel>Imagem</SectionLabel>

        {!isPro ? (
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-paper-soft bg-paper px-4 py-3">
            <p className="text-xs text-ink-muted">
              Imagem por serviço está disponível no plano{" "}
              <span className="font-semibold text-ink">PRO</span>.
            </p>
          </div>
        ) : !service?.id ? (
          // PRO, novo serviço — pré-seleciona; upload ocorre após salvar
          <div className="grid min-w-0 gap-3">
            {displayImage ? (
              <div className="relative overflow-hidden rounded-xl border border-paper-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImage}
                  alt="Prévia da imagem"
                  loading="lazy"
                  className="h-40 w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Será enviada ao salvar
                </span>
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-paper-soft bg-paper">
                <p className="text-xs text-ink-muted">
                  Nenhuma imagem selecionada
                </p>
              </div>
            )}
            <div className="grid min-w-0 gap-1 overflow-hidden">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="w-full min-w-0 max-w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:bg-paper-soft"
                id="image-new"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <p className="text-xs text-ink-muted">
                JPEG, PNG ou WebP · máximo 2 MB · enviada automaticamente ao
                salvar
              </p>
            </div>
          </div>
        ) : (
          // PRO, serviço existente
          <div className="grid min-w-0 gap-3">
            {displayImage ? (
              <div className="relative overflow-hidden rounded-xl border border-paper-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImage}
                  alt="Prévia da imagem"
                  loading="lazy"
                  className="h-40 w-full object-cover"
                />
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

            <div className="grid min-w-0 gap-1 overflow-hidden">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="w-full min-w-0 max-w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:bg-paper-soft"
                disabled={imageBusy}
                id={`image-${service.id}`}
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <p className="text-xs text-ink-muted">
                JPEG, PNG ou WebP · máximo 2 MB · enviada automaticamente ao
                salvar
              </p>
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
              <p
                className={`text-xs font-semibold ${
                  imageMessage.type === "error" ? "text-red-600" : "text-leaf"
                }`}
              >
                {imageMessage.text}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Ações ──────────────────────────────── */}
      <div className="flex flex-col gap-3 border-t border-paper-soft pt-4 sm:flex-row">
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
              ? "Salvar serviço"
              : "Cadastrar serviço"}
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
