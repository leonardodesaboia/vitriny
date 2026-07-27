"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

// Respeita prefers-reduced-motion do sistema em todas as animações
// framer-motion renderizadas dentro da landing.
export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
