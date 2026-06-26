"use client";

import { motion } from "framer-motion";
import { brand, splitLogoText } from "~/lib/branding";
import { cn } from "~/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "icon";
  animated?: boolean;
}

export function Logo({ className, size = "md", animated = true }: LogoProps) {
  const [logoPrefix, logoSuffix] = splitLogoText(brand.logoText);
  const sizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-5xl",
    icon: "text-2xl",
  };

  if (!animated) {
    return (
      <LogoContent
        className={className}
        size={size}
        sizeClasses={sizeClasses}
        logoPrefix={logoPrefix}
        logoSuffix={logoSuffix}
        icon={brand.icon}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className={cn(
        "flex items-center font-mono",
        sizeClasses[size],
        className,
      )}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.02, duration: 0.05, ease: "easeOut" }}
        className="text-primary font-bold tracking-tight"
      >
        {brand.icon}
      </motion.span>
      {size !== "icon" && (
        <>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.03, duration: 0.05, ease: "easeOut" }}
            className="inline-block w-1"
          />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.04, duration: 0.05, ease: "easeOut" }}
            className="text-foreground font-bold tracking-tight"
          >
            {logoPrefix}
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.06, duration: 0.05, ease: "easeOut" }}
            className="text-foreground/70 font-bold tracking-tight"
          >
            {logoSuffix}
          </motion.span>
        </>
      )}
    </motion.div>
  );
}

function LogoContent({
  className,
  size,
  sizeClasses,
  logoPrefix,
  logoSuffix,
  icon,
}: {
  className?: string;
  size: "sm" | "md" | "lg" | "xl" | "icon";
  sizeClasses: Record<string, string>;
  logoPrefix: string;
  logoSuffix: string;
  icon: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center font-mono",
        sizeClasses[size],
        className,
      )}
    >
      <span className="text-primary font-bold tracking-tight">{icon}</span>
      {size !== "icon" && (
        <>
          <span className="inline-block w-1" />
          <span className="text-foreground font-bold tracking-tight">
            {logoPrefix}
          </span>
          <span className="text-foreground/70 font-bold tracking-tight">
            {logoSuffix}
          </span>
        </>
      )}
    </div>
  );
}
