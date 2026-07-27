// Normaliza o valor digitado pelo dono (@handle, handle ou URL completa)
// para a URL pública da rede. O valor digitado é o que persiste no banco.

export type SocialNetwork = "instagram" | "facebook" | "tiktok";

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const NETWORK_HOSTS: Record<SocialNetwork, string> = {
  instagram: "instagram.com",
  facebook: "facebook.com",
  tiktok: "tiktok.com",
};

const HANDLE_REGEX = /^[A-Za-z0-9._-]+$/;

export function normalizeSocialUrl(
  network: SocialNetwork,
  value: string
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    const host = url.hostname.replace(/^www\./, "");
    const expected = NETWORK_HOSTS[network];
    if (host !== expected && !host.endsWith(`.${expected}`)) return null;
    return url.toString();
  }

  const handle = trimmed.replace(/^@/, "");
  if (!HANDLE_REGEX.test(handle)) return null;

  if (network === "tiktok") return `https://tiktok.com/@${handle}`;
  return `https://${NETWORK_HOSTS[network]}/${handle}`;
}
