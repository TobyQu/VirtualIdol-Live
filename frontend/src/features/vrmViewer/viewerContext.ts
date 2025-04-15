import { createContext } from "react";
import { Viewer } from "./viewer";
import { GlobalConfig } from "../config/configApi";

// 创建一个 viewer 实例
const viewer = new Viewer();

export const ViewerContext = createContext<{
  viewer: Viewer;
  updateConfig: (config: GlobalConfig) => void;
}>({
  viewer,
  updateConfig: (config) => {
    const cameraDistance = config?.characterConfig?.cameraDistance ?? 8.0;
    viewer.setCameraDistance(cameraDistance);
  }
});
