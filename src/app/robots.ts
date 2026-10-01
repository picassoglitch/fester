import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/staff", "/admin", "/api", "/pase", "/s", "/mi-cuenta"],
    },
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
  };
}
