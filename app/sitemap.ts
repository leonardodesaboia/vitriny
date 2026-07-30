import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { hasSufficientStorefrontContent } from "@/lib/seo/storefront-content";

// Crawlers consultam o sitemap com frequência; 1h de cache (ISR) evita uma
// query por hit sem atrasar de forma relevante a entrada de vitrines novas.
// Sem `force-dynamic`: ele anularia o `revalidate` e faria uma query por hit.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  const profiles = await prisma.providerProfile.findMany({
    where: { isPublished: true },
    select: {
      slug: true,
      updatedAt: true,
      description: true,
      city: true,
      state: true,
      address: true,
      phone: true,
      email: true,
      services: { where: { isActive: true }, select: { id: true } },
    },
  });

  const routes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/termos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];

  for (const profile of profiles) {
    // Vitrines sem conteúdo suficiente não entram (evita thin content indexado).
    const sufficient = hasSufficientStorefrontContent({
      activeItemCount: profile.services.length,
      description: profile.description,
      city: profile.city,
      state: profile.state,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
    });
    if (!sufficient) continue;

    routes.push({
      url: `${baseUrl}/u/${profile.slug}`,
      lastModified: profile.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return routes;
}
