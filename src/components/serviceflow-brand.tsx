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

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/serviceflow-mark.svg"
        alt="ServiceFlow logo"
        width={iconSize}
        height={iconSize}
        className="rounded-xl"
        priority
      />
      <div>
        <p className="text-lg font-semibold text-slate-900">ServiceFlow CRM</p>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        {showTagline ? (
          <p className="text-xs text-slate-500">One Plaform. Unlimited Growth</p>
        ) : null}
      </div>
    </div>
  );
}