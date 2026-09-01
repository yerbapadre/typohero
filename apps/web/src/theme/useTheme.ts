import { useEffect, useState } from "react";
import { getStoredTheme, subscribeTheme, type ThemeId } from "./themes";

export function useTheme(): ThemeId {
  const [id, setId] = useState<ThemeId>(getStoredTheme);
  useEffect(() => {
    const unsub = subscribeTheme(setId);
    return () => {
      unsub();
    };
  }, []);
  return id;
}
