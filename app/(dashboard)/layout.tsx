import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { prisma } from "@/lib/prisma";
import { getPublicThemePreset } from "@/lib/theme-presets";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      plan: true,
      themePreset: true
    }
  });
  const theme = getPublicThemePreset(profile?.plan ?? "FREE", profile?.themePreset);

  return (
    <div className="flex min-h-screen bg-paper font-jakarta text-ink" data-brand-theme={theme.id}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto pt-16 md:pt-0">{children}</div>
    </div>
  );
}
