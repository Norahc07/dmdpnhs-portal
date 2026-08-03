import { Montserrat, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { APP_NAME, SCHOOL_NAME } from "@/lib/constants";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: `${SCHOOL_NAME} digital school portal for learners, parents, teachers, and registrar.`,
  applicationName: APP_NAME,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: "/icons/icon-512.png?v=2", type: "image/png", sizes: "512x512" },
      { url: "/icons/icon-192.png?v=2", type: "image/png", sizes: "192x192" },
      { url: "/favicon.png?v=2", type: "image/png", sizes: "48x48" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png?v=2", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.png?v=2",
  },
};

export const viewport = {
  themeColor: "#800000",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${montserrat.variable} ${poppins.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.png?v=2" type="image/png" sizes="48x48" />
        <link rel="icon" href="/icon.png?v=2" type="image/png" sizes="32x32" />
        <link rel="icon" href="/icons/icon-192.png?v=2" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icons/icon-512.png?v=2" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=2" />
        <link
          rel="preload"
          as="image"
          href="/images/hero-opt.jpg"
          fetchPriority="high"
        />
      </head>
      <body className="flex min-h-full flex-col font-(family-name:--font-poppins)">
        {children}
        <PWAInstallBanner />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
