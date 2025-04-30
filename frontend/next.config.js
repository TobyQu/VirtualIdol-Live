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
  // 添加重写规则，确保特定API路径不会被重定向
  async rewrites() {
    return [
      { 
        source: '/api/v1/chat/stream',
        destination: '/api/v1/chat/stream',
        has: [{ type: 'header', key: 'Content-Type', value: 'application/json' }]
      },
      { 
        source: '/api/v1/speech/tts/stream',
        destination: '/api/v1/speech/tts/stream',
        has: [{ type: 'header', key: 'Content-Type', value: 'application/json' }]
      }
    ];
  }
};

module.exports = nextConfig;
