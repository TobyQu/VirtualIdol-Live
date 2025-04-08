import { useLayoutEffect, useEffect } from 'react';

// 在客户端使用 useLayoutEffect，在服务器端使用 useEffect
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect; 