import Image from "next/image";

type ServiceOSBrandProps = {
  subtitle?: string;
  showTagline?: boolean;
  iconSize?: number;
  textSize?: "sm" | "md" | "lg";
  variant?: "compact" | "full";
  tone?: "light" | "dark";
};

export function ServiceOSBrand({
  subtitle,
  showTagline = false,
  iconSize = 48,
  textSize = "md",
  variant = "compact",
  tone = "light",
}: ServiceOSBrandProps) {
  const isDark = tone === "dark";
  const baseTitleClass = textSize === "sm" ? "text-base" : textSize === "lg" ? "text-xl" : "text-lg";
  const titleClass = variant === "full" ? "text-4xl sm:text-5xl" : baseTitleClass;
  const subtitleClass = isDark ? "text-sm text-slate-300" : "text-sm text-slate-500";
  const taglineClass = isDark ? "text-xs text-slate-300" : "text-xs text-slate-500";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const resolvedIconSize = variant === "full" ? Math.max(iconSize, 72) : Math.max(iconSize, 48);
  const shouldRenderSubtitle = !!subtitle && subtitle !== "Operate with Confidence.";
  const iconSrc = isDark ? "/serviceos-mark-light.svg" : "/serviceos-mark.svg";

  return (
    <div className="flex items-center gap-4">
      <Image
        src={iconSrc}
        alt="ServiceOS logo"
        width={resolvedIconSize}
        height={resolvedIconSize}
        className="rounded-2xl"
        priority
      />
      <div>
        <p className={`${titleClass} font-semibold ${textColor}`}>ServiceOS</p>
        {shouldRenderSubtitle ? <p className={subtitleClass}>{subtitle}</p> : null}
        {showTagline ? <p className={taglineClass}>Operate with Confidence.</p> : null}
      </div>
    </div>
  );
}
