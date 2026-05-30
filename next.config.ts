import type { NextConfig } from "next";

const repoName = "aserradero-mestre-inventario";
const forGithubPages = process.env.GITHUB_PAGES === "true";

const basePath = forGithubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath,
  assetPrefix: forGithubPages ? `/${repoName}/` : "",
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
