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
  // 不再需要重写规则，因为使用标准的public目录
};

module.exports = nextConfig;
