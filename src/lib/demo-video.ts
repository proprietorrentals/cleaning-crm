export type DemoVideoProvider = "youtube" | "vimeo" | "loom" | "unsupported";

export type DemoVideoConfig = {
  provider: DemoVideoProvider;
  embedUrl: string;
  sourceUrl: string;
};

function safeUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function createYouTubeEmbed(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  let videoId: string | null = null;

  if (host === "youtube.com" || host === "m.youtube.com") {
    videoId = url.searchParams.get("v");
  }

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (!videoId) return null;

  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    autoplay: "0",
    controls: "1",
    enablejsapi: "1",
    origin: typeof window !== "undefined" ? window.location.origin : "",
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function createVimeoEmbed(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const videoId = parts[parts.length - 1];
  if (!videoId) return null;

  const params = new URLSearchParams({
    autoplay: "0",
    title: "0",
    byline: "0",
    portrait: "0",
    dnt: "1",
    api: "1",
  });

  return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
}

function createLoomEmbed(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (!host.includes("loom.com")) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const shareIndex = parts.findIndex((part) => part === "share");
  const videoId = shareIndex >= 0 ? parts[shareIndex + 1] : parts[parts.length - 1];
  if (!videoId) return null;

  return `https://www.loom.com/embed/${videoId}`;
}

export function getDemoVideoConfig(rawVideoUrl?: string | null): DemoVideoConfig | null {
  if (!rawVideoUrl) return null;

  const parsed = safeUrl(rawVideoUrl.trim());
  if (!parsed) return null;

  const youtubeEmbed = createYouTubeEmbed(parsed);
  if (youtubeEmbed) {
    return {
      provider: "youtube",
      embedUrl: youtubeEmbed,
      sourceUrl: rawVideoUrl,
    };
  }

  const vimeoEmbed = createVimeoEmbed(parsed);
  if (vimeoEmbed) {
    return {
      provider: "vimeo",
      embedUrl: vimeoEmbed,
      sourceUrl: rawVideoUrl,
    };
  }

  const loomEmbed = createLoomEmbed(parsed);
  if (loomEmbed) {
    return {
      provider: "loom",
      embedUrl: loomEmbed,
      sourceUrl: rawVideoUrl,
    };
  }

  return {
    provider: "unsupported",
    embedUrl: rawVideoUrl,
    sourceUrl: rawVideoUrl,
  };
}
