import "@/styles/globals.css";
import type { AppProps } from "next/app";
import "@charcoal-ui/icons";
import { useEffect } from "react";

// 在服务器端渲染时抑制 useLayoutEffect 警告
function suppressLayoutEffectWarning() {
  if (typeof window === 'undefined') {
    // 在服务器端渲染时，重写 React 的 useLayoutEffect
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // 过滤掉关于 useLayoutEffect 的警告
      if (args[0] && typeof args[0] === 'string' && args[0].includes('useLayoutEffect')) {
        return;
      }
      originalConsoleError(...args);
    };
  }
}

export default function App({ Component, pageProps }: AppProps) {
  // 在应用初始化时调用
  useEffect(() => {
    suppressLayoutEffectWarning();
  }, []);

  return <Component {...pageProps} />;
}
