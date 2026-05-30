/** Rutas con basePath (GitHub Pages). Evita useRouter en export estático. */
export function appPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function navigateTo(path: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(appPath(path));
}
