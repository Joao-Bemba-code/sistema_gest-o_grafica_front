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

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const backendOrigin = new URL(apiUrl).origin;
const desenvolvimento = process.env.NODE_ENV !== "production";

// CSP compatível com o Next (scripts inline). Não é a política mais
// restritiva possível, mas bloqueia scripts externos não previstos, iframes
// de terceiros e uploads a executar como página.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${backendOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

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
    const cabecalhosSeguranca = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (!desenvolvimento) {
      cabecalhosSeguranca.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [
      { source: "/:path*", headers: cabecalhosSeguranca },
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
