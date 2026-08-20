import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */

const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "localhost", port: "3000" },
      { protocol: "https", hostname: "sistema-gest-o-grafica-back-m6px.onrender.com" },
    ],
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

export default withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NEXT_PUBLIC_DISABLE_PWA === "true",
    scope: "/",
  });
