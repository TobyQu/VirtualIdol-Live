import { buildUrl } from "@/utils/buildUrl";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh">
      <Head>
        <script dangerouslySetInnerHTML={{
          __html: `
            // 在客户端执行此脚本，防止 useLayoutEffect 警告
            window.__REACT_SSR_SUPPRESS_LAYOUT_EFFECT_WARNING__ = true;
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
