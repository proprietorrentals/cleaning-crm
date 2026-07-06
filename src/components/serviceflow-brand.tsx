import Image from "next/image";

type ServiceFlowBrandProps = {
  subtitle?: string;
  showTagline?: boolean;
  iconSize?: number;
  textSize?: "sm" | "md" | "lg";
  variant?: "compact" | "full";
};

const textSizeClassMap = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
} as const;

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
        src="/serviceflow-logo.svg"
        alt="ServiceFlow"
        width={420}
        height={128}
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
        <p className={`${textSizeClassMap[textSize]} font-semibold text-slate-900`}>ServiceFlow CRM</p>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        {showTagline ? (
          <p className="text-xs text-slate-500">One Plaform. Unlimited Growth</p>
        ) : null}
      </div>
    </div>
  );
}