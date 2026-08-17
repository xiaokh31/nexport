import type { MetadataRoute } from "next";
import { siteInfo } from "@/config/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteInfo.displayName,
    short_name: siteInfo.shortName,
    description: "海外仓储、订单履约与运输衔接服务网站",
    start_url: "/",
    display: "standalone",
    background_color: "#fafbf8",
    theme_color: "#102632",
    orientation: "portrait-primary",
    categories: ["business", "logistics", "shipping"],
    lang: "zh-CN",
    dir: "ltr",
  };
}
