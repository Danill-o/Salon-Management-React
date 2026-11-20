import { useCallback, useEffect, useState } from "react";
import { LOCAL_CHANGE, readList, saveJson } from "./lib/storage.js";

// Live view of a stored value: updates on same-tab saves and on changes from other tabs.
export function useStored(key, read = readList) {
  const [value, setValue] = useState(() => read(key));
  useEffect(() => {
    const refresh = () => setValue(read(key));
    const onStorage = event => (!event.key || event.key === key) && refresh();
    const onLocal = event => event.detail === key && refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_CHANGE, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_CHANGE, onLocal);
    };
  }, [key]);
  const save = useCallback(next => saveJson(key, next), [key]);
  return [value, save];
}

const parseHash = () => {
  const [path, query = ""] = window.location.hash.replace(/^#/, "").split("?");
  return { path: path.replace(/^\/+/, "").replace(/\/+$/, ""), params: new URLSearchParams(query) };
};

export function useHashRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const navigate = path => {
  window.location.hash = `/${path}`;
};

export function scrollToSection(id) {
  window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

// Re-renders when another tab (admin, stylist) changes shared salon data.
export function useStorageVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onStorage = () => setVersion(value => value + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return version;
}
