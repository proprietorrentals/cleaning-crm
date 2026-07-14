import Image from "next/image";

const SERVICEOS_ICON_SRC = "/icon.svg";

type Surface = "light" | "dark";
type LogoVariant = "horizontal" | "stacked" | "icon-only";
type LogoSize = "default" | "compact-sidebar" | "mobile" | "hero";

function getSizeTokens(size: LogoSize) {
  if (size === "hero") {
    return {
      icon: 80,
      title: "text-4xl sm:text-5xl",
      subtitle: "text-base",
      tagline: "text-sm",
      gap: "gap-4",
      stackGap: "gap-3",
    };
  }

  if (size === "compact-sidebar") {
    return {
      icon: 38,
      title: "text-[22px]",
      subtitle: "text-xs",
      tagline: "text-xs",
      gap: "gap-3.5",
      stackGap: "gap-2",
    };
  }

  if (size === "mobile") {
    return {
      icon: 36,
      title: "text-xl",
      subtitle: "text-xs",
      tagline: "text-xs",
      gap: "gap-3",
      stackGap: "gap-2",
    };
  }

  return {
    icon: 44,
    title: "text-2xl",
    subtitle: "text-sm",
    tagline: "text-xs",
    gap: "gap-4",
    stackGap: "gap-2",
  };
}

export function ServiceOSIcon({
  size = 44,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={SERVICEOS_ICON_SRC}
        alt="ServiceOS icon"
        width={size}
        height={size}
        className="h-full w-full object-contain"
        priority={priority}
      />
    </span>
  );
}

export function ServiceOSWordmark({
  surface = "light",
  showTagline = false,
  subtitle,
  size = "default",
  className = "",
}: {
  surface?: Surface;
  showTagline?: boolean;
  subtitle?: string;
  size?: LogoSize;
  className?: string;
}) {
  const tokens = getSizeTokens(size);
  const titleColor = surface === "dark" ? "text-white" : "text-slate-900";
  const subtitleColor =
    surface === "dark" ? "text-slate-300" : "text-slate-600";
  const taglineColor = surface === "dark" ? "text-slate-300" : "text-slate-500";
  const showSecondary = size !== "compact-sidebar";

  return (
    <div className={`min-w-0 ${className}`}>
      <p className={`${tokens.title} font-bold leading-none ${titleColor}`}>
        ServiceOS
      </p>
      {showSecondary && subtitle ? (
        <p className={`${tokens.subtitle} ${subtitleColor}`}>{subtitle}</p>
      ) : null}
      {showSecondary && showTagline ? (
        <p className={`${tokens.tagline} ${taglineColor}`}>
          Operate with Confidence.
        </p>
      ) : null}
    </div>
  );
}

export function ServiceOSLogo({
  variant = "horizontal",
  surface = "light",
  size = "default",
  showTagline = false,
  subtitle,
  className = "",
  priority = false,
}: {
  variant?: LogoVariant;
  surface?: Surface;
  size?: LogoSize;
  showTagline?: boolean;
  subtitle?: string;
  className?: string;
  priority?: boolean;
}) {
  const tokens = getSizeTokens(size);
  const resolvedIcon = tokens.icon;
  const normalizedSubtitle = subtitle?.trim();
  const subtitleText =
    size !== "compact-sidebar" &&
    normalizedSubtitle &&
    normalizedSubtitle !== "Operate with Confidence."
      ? normalizedSubtitle
      : undefined;
  const shouldShowTagline = size !== "compact-sidebar" ? showTagline : false;

  if (variant === "icon-only") {
    return (
      <ServiceOSIcon
        size={resolvedIcon}
        className={className}
        priority={priority}
      />
    );
  }

  if (variant === "stacked") {
    return (
      <div
        className={`inline-flex max-w-full flex-col items-center justify-center text-center ${tokens.stackGap} ${className}`}
      >
        <ServiceOSIcon size={resolvedIcon} priority={priority} />
        <ServiceOSWordmark
          surface={surface}
          size={size}
          subtitle={subtitleText}
          showTagline={shouldShowTagline}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex max-w-full items-center justify-center ${tokens.gap} ${className}`}
    >
      <ServiceOSIcon size={resolvedIcon} priority={priority} />
      <ServiceOSWordmark
        surface={surface}
        size={size}
        subtitle={subtitleText}
        showTagline={shouldShowTagline}
      />
    </div>
  );
}
