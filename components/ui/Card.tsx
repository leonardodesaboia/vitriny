"use client";

import { motion } from "framer-motion";
import { type HTMLAttributes } from "react";
import React from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({
  hoverable = false,
  children,
  className = "",
  ...props
}: CardProps) {
  const base =
    "rounded-xl border border-paper-soft bg-white shadow-card";

  if (hoverable) {
    return (
      <motion.div
        whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(28,25,23,0.12)" }}
        transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
        className={`${base} ${className}`}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  );
}
