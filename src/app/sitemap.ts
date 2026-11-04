import type { MetadataRoute } from "next";
import { PRIVACY_PATH } from "@/lib/event";
import { CANONICAL_ORIGIN } from "@/lib/site";
import { TERMS_PATH } from "@/lib/terms";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${CANONICAL_ORIGIN}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${CANONICAL_ORIGIN}${PRIVACY_PATH}`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${CANONICAL_ORIGIN}${TERMS_PATH}`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
