import { Montserrat, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { SCHOOL_NAME, SCHOOL_SHORT } from "@/lib/constants";
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
    default: `${SCHOOL_SHORT} Portal`,
    template: `%s · ${SCHOOL_SHORT}`,
  },
  description: `${SCHOOL_NAME} digital school portal for learners, parents, teachers, and registrar.`,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SCHOOL_SHORT,
  },
  icons: {
    icon: [
      { url: "/images/logo-school.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
    ],
    apple: [{ url: "/images/logo-school.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/images/logo-school.png",
  },
};

export const viewport = {
  themeColor: "#800000",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${poppins.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
        <link rel="icon" href="/images/logo-school.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/images/logo-school.png" />
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
