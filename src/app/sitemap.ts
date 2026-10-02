import type { MetadataRoute } from "next";
import { PRIVACY_PATH } from "@/lib/event";
import { CANONICAL_ORIGIN } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${CANONICAL_ORIGIN}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${CANONICAL_ORIGIN}${PRIVACY_PATH}`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
