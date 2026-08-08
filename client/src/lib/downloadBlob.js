// CSV exports go through adminApi (Bearer-token auth) with responseType: "blob",
// so a plain <a href> won't work — the browser wouldn't attach the auth header.
// This triggers a save-as from the already-authenticated response instead.
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
