import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ServiceFlow Employee Portal",
    short_name: "ServiceFlow",
    description: "Mobile-first employee portal for jobs, clock in/out, photos, mileage, and customer verification.",
    start_url: "/employee-portal",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f6ef6",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
