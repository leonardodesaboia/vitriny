import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { getBrandAppearance } from "@/lib/brand-appearance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Bloqueia contas excluídas mesmo com JWT residual em outro dispositivo.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true }
  });
  if (!user || user.deletedAt) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      plan: true,
      brandColor: true,
      brandFont: true,
    }
  });
  const appearance = getBrandAppearance(
    profile?.plan ?? "FREE",
    profile?.brandColor,
    profile?.brandFont,
  );

  return (
    <div
      className="flex min-h-screen bg-paper font-jakarta text-ink"
      data-brand-color={appearance.color}
      data-brand-font={appearance.font}
    >
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto pt-16 md:pt-0">{children}</div>
    </div>
  );
}
