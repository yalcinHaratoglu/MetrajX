const PUBLIC_PATHS = ["/login", "/register", "/activate", "/accept-invite"];

export function clearAuthSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function redirectToLogin() {
  const { pathname, search } = window.location;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return;
  const next = encodeURIComponent(pathname + search);
  window.location.replace(`/login?next=${next}`);
}
