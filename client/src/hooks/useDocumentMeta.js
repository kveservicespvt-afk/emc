import { useEffect } from "react";

// Sets <title> + meta description/OG tags on mount. Enough for Google (which
// executes JS before indexing) and the browser tab; NOT sufficient for OG
// scrapers that don't run JS (Facebook/LinkedIn/WhatsApp link previews) — those
// only ever see index.html's static tags. Real fix for that is SSR/prerendering,
// which is a separate infra decision, not something this hook can paper over.
export function useDocumentMeta({ title, description, image, url }) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;

    const tags = [
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { property: "og:url", content: url },
      { property: "og:type", content: "article" },
    ].filter((t) => t.content);

    const created = [];
    for (const tag of tags) {
      const attr = tag.name ? "name" : "property";
      const key = tag.name ?? tag.property;
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        created.push(el);
      }
      el.setAttribute("content", tag.content);
    }

    return () => {
      document.title = previousTitle;
      created.forEach((el) => el.remove());
    };
  }, [title, description, image, url]);
}
