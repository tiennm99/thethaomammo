import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Thể Thao Mầm Mơ",
    short_name: "Mầm Mơ",
    description:
      "Hoạt động thể thao gây quỹ thiện nguyện — đăng ký giải đấu, xem lịch thi đấu trực tiếp.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    lang: "vi",
  };
}
