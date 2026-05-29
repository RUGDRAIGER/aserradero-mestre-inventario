import type { NextConfig } from "next";

const repoName = "aserradero-mestre-inventario";
const forGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: forGithubPages ? `/${repoName}` : "",
  assetPrefix: forGithubPages ? `/${repoName}/` : "",
  trailingSlash: true,
};

export default nextConfig;
