import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Filling POS — ร้านอาหาร",
    short_name: "Filling POS",
    description: "ระบบขายหน้าร้าน จัดการโต๊ะ และส่งครัวสำหรับร้านอาหารไทย",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f4f7f4",
    theme_color: "#12382e",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
