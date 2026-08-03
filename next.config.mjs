/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Windows + long project paths: FS cache compaction can stall nav for minutes.
    turbopackFileSystemCacheForDev: process.platform !== "win32",
    // Tree-shake barrel packages so each page compiles less code.
    optimizePackageImports: [
      "lucide-react",
      "@base-ui/react",
      "@tanstack/react-table",
      "recharts",
    ],
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            {
              protocol: "https",
              hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/manifest.json",
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400" },
      ],
    },
  ],
};

export default nextConfig;
