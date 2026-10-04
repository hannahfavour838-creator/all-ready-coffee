import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "All Ready Coffee",
    short_name: "All Ready",
    description: "Specialty coffee, crafted to order and delivered across Portland.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0907",
    theme_color: "#0b0907",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
