import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });

export const metadata = {
  title: "SIGRAF - Gestão de Gráfica",
  description: "Sistema de Gestão para Indústria Gráfica",
  applicationName: "SIGRAF",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SIGRAF",
  },
};

export const viewport = {
  themeColor: "#4338ca",
  colorScheme: "light dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br" className={`${inter.variable} ${jetBrainsMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/fonts/material-symbols-outlined.css" />
        {/* Aplica o tema guardado antes do primeiro paint para evitar flash
            e manter o <html> coerente com o estado do ThemeContext. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("sigraf-theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-surface-container-lowest text-on-surface min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}