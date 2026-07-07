import Image from "next/image";

type ServiceFlowBrandProps = {
  subtitle?: string;
  showTagline?: boolean;
  iconSize?: number;
  textSize?: "sm" | "md" | "lg";
  variant?: "compact" | "full";
};

export function ServiceFlowBrand({
  subtitle,
  showTagline = false,
  iconSize = 44,
  textSize = "md",
  variant = "compact",
}: ServiceFlowBrandProps) {
  if (variant === "full") {
    return (
      <Image
        src="/serviceflow-logo.png"
        alt="ServiceFlow"
        width={768}
        height={768}
        className="h-auto w-full max-w-[420px]"
        priority
      />
    );
  }

  const widthFactor = textSize === "lg" ? 5.2 : textSize === "sm" ? 4 : 4.5;
  const compactWidth = Math.max(120, Math.round(iconSize * widthFactor));

  return (
    <div className="flex flex-col items-start gap-2">
      <Image
        src="/serviceflow-logo.png"
        alt="ServiceFlow logo"
        width={768}
        height={768}
        className="h-auto"
        style={{ width: `${compactWidth}px` }}
        priority
      />
      {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      {showTagline ? (
        <p className="text-xs text-slate-500">One Plaform. Unlimited Growth</p>
      ) : null}
    </div>
  );
}