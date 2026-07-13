"use client";

import { useEffect, useMemo, useRef } from "react";
import { getDemoVideoConfig } from "@/lib/demo-video";

type DemoVideoEmbedProps = {
  videoUrl?: string;
  title: string;
  className?: string;
  onCompleted?: () => void;
};

export function DemoVideoEmbed({ videoUrl, title, className = "", onCompleted }: DemoVideoEmbedProps) {
  const completedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const config = useMemo(() => getDemoVideoConfig(videoUrl), [videoUrl]);

  useEffect(() => {
    if (!config || !onCompleted) return;

    const onMessage = (event: MessageEvent) => {
      if (completedRef.current) return;
      const rawData = typeof event.data === "string" ? event.data : JSON.stringify(event.data);
      const parsedData = (() => {
        if (typeof event.data === "object" && event.data !== null) return event.data as Record<string, unknown>;
        if (typeof event.data === "string") {
          try {
            return JSON.parse(event.data) as Record<string, unknown>;
          } catch {
            return null;
          }
        }
        return null;
      })();

      if (config.provider === "youtube" && event.origin.includes("youtube.com")) {
        const finished =
          (typeof parsedData?.event === "string" && parsedData.event === "onStateChange" && parsedData.info === 0) ||
          rawData.includes('"event":"onStateChange"') && rawData.includes('"info":0');

        if (finished) {
          completedRef.current = true;
          onCompleted();
        }
      }

      if (config.provider === "vimeo" && event.origin.includes("vimeo.com")) {
        const finished =
          (typeof parsedData?.event === "string" && parsedData.event === "ended") ||
          rawData.includes('"event":"ended"');

        if (finished) {
          completedRef.current = true;
          onCompleted();
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [config, onCompleted]);

  useEffect(() => {
    if (!config || config.provider !== "youtube") return;

    const frame = iframeRef.current;
    if (!frame) return;

    const init = () => {
      frame.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: "serviceos-demo" }),
        "*",
      );
    };

    frame.addEventListener("load", init);
    return () => frame.removeEventListener("load", init);
  }, [config]);

  if (!config || config.provider === "unsupported") {
    return (
      <div className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white ${className}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1d4ed8_0%,#020617_60%)]" />
        <div className="relative space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">ServiceOS Demo</p>
          <h3 className="text-2xl font-semibold">Video Coming Soon</h3>
          <p className="max-w-2xl text-sm text-slate-200">
            Set NEXT_PUBLIC_DEMO_VIDEO_URL in your environment to display the public demo video here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-xl ${className}`}>
      <div className="relative w-full pt-[56.25%]">
        <iframe
          ref={iframeRef}
          title={title}
          src={config.embedUrl}
          className="absolute left-0 top-0 h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}
