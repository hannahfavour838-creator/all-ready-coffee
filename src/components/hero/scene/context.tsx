"use client";

import { createContext, useContext } from "react";
import type { SceneMaterials } from "./materials";
import type { QualitySettings } from "../quality";

export type SceneCtx = { m: SceneMaterials; q: QualitySettings };
export const SceneContext = createContext<SceneCtx | null>(null);

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene must be used inside <SceneContext.Provider>");
  return ctx;
}
