import Image from "next/image";

type ServiceOSBrandProps = {
  subtitle?: string;
  showTagline?: boolean;
  iconSize?: number;
  textSize?: "sm" | "md" | "lg";
  variant?: "compact" | "full";
};

export function ServiceOSBrand({
  subtitle,
  showTagline = false,
  iconSize = 44,
  textSize = "md",
  variant = "compact",
}: ServiceOSBrandProps) {
  if (variant === "full") {
    return (
      <Image
        src="/serviceos-logo.svg"
        alt="ServiceOS"
        width={768}
        height={768}
        className="h-auto w-full max-w-[420px]"
        priority
      />
    );
  }

  const titleClass = textSize === "sm" ? "text-base" : textSize === "lg" ? "text-xl" : "text-lg";

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/serviceos-mark.svg"
        alt="ServiceOS logo"
        width={iconSize}
        height={iconSize}
        className="rounded-xl"
        priority
      />
      <div>
        <p className={`${titleClass} font-semibold text-slate-900`}>ServiceOS</p>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        {showTagline ? <p className="text-xs text-slate-500">Operate with Confidence.</p> : null}
      </div>
    </div>
  );
}
