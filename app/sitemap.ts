import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";

// Crawlers consultam o sitemap com frequência; 1h de cache evita uma query
// por hit sem atrasar de forma relevante a entrada de vitrines novas.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  const profiles = await prisma.providerProfile.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...profiles.map((profile) => ({
      url: `${baseUrl}/u/${profile.slug}`,
      lastModified: profile.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
