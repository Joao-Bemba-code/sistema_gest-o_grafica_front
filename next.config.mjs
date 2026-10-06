import withPWA from "next-pwa";
import defaultCache from "next-pwa/cache.js";

// As respostas da API (perfil, permissões, utilizadores, ...) nunca podem ser
// servidas pelo cache do service worker. Com NetworkFirst, se o backend demorar
// (cold start), o SW devolvia dados antigos: depois de gravar permissões a app
// continuava a mostrar "0 módulos" e o utilizador atualizado ficava sem acesso.
const SEM_CACHE_API = {
  urlPattern: /^https?:\/\/[^/]+\/api\//i,
  handler: "NetworkOnly",
};

/** @type {import('next').NextConfig} */

const nextConfig = {
  turbopack: {},
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "localhost", port: "3000" },
      { protocol: "https", hostname: "sistema-gest-o-grafica-back-m6px.onrender.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const backendHost = new URL(apiUrl).origin;
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendHost}/uploads/:path*`,
      },
    ];
  },
};

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DISABLE_PWA === "true",
  scope: "/",
  runtimeCaching: [SEM_CACHE_API, ...defaultCache],
});

const config = withPWAConfig(nextConfig);

export default process.env.NODE_ENV === "development" ? nextConfig : config;
