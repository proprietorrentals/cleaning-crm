import { toJsonLd } from "@/lib/seo/structured-data";

type SeoJsonLdProps = {
  payload: unknown;
};

export function SeoJsonLd({ payload }: SeoJsonLdProps) {
  return <script type="application/ld+json">{toJsonLd(payload)}</script>;
}
