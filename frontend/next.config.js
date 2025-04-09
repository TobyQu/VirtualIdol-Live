/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  assetPrefix: process.env.BASE_PATH || "",
  basePath: process.env.BASE_PATH || "",
  trailingSlash: false,
  publicRuntimeConfig: {
    root: process.env.NODE_ENV === "production" ? "/chat-vrm" : "",
  },
  webpack: (config, { isServer, dev }) => {
    // 解决 useLayoutEffect SSR 警告问题
    if (isServer) {
      config.resolve.alias['react-resizable-panels'] = 'react-resizable-panels/dist/react-resizable-panels.node.cjs.js';
    }
    
    return config;
  },
  // 配置重写规则，将 /assets/* 路径重定向到实际的assets目录
  async rewrites() {
    return [
      {
        source: '/assets/:path*',
        destination: '/api/assets/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
