import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, resolveMediaUrl } from "../../api/client.js";

// Generated solar-panel imagery (not a stock-photo fallback) — see
// server/prisma/seed-assets/README and seed.js. Used only if no admin has
// marked a real Service Report photo pair as "feature on homepage" yet.
const PLACEHOLDER_BEFORE = "/uploads/seed/solar-before.png";
const PLACEHOLDER_AFTER = "/uploads/seed/solar-after.png";

export function BeforeAfterSlider() {
  const [pos, setPos] = useState(50);

  const query = useQuery({
    queryKey: ["gallery-featured"],
    queryFn: () => api.get("/gallery/featured").then((r) => r.data.photos),
    staleTime: 5 * 60 * 1000,
  });

  const featured = query.data?.[0];
  const beforeImg = resolveMediaUrl(featured ? featured.beforePhotoUrl : PLACEHOLDER_BEFORE);
  const afterImg = resolveMediaUrl(featured ? featured.afterPhotoUrl : PLACEHOLDER_AFTER);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl2 shadow-soft select-none">
        <img src={afterImg} alt="Solar panels after professional cleaning" className="absolute inset-0 h-full w-full object-cover object-center" draggable={false} />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img
            src={beforeImg}
            alt="Solar panels before cleaning, covered in dust"
            className="h-full w-full max-w-none object-cover object-center"
            style={{ width: `${10000 / pos}%` }}
            draggable={false}
          />
        </div>
        <div className="pointer-events-none absolute top-4 left-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
          Before
        </div>
        <div className="pointer-events-none absolute top-4 right-4 rounded-full bg-forest/90 px-3 py-1 text-xs font-semibold text-white">
          After
        </div>
        <div
          className="absolute inset-y-0 w-1 bg-white shadow"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="mt-4 w-full accent-forest"
        aria-label="Drag to compare before and after cleaning"
      />
    </div>
  );
}
