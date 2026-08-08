// Natural size of client/public/logo.png — used to compute an aspect-correct
// width so we can pass explicit width/height attributes (avoids layout shift
// and is a properly-sized <img>, not just a CSS-stretched one).
const NATURAL_WIDTH = 242;
const NATURAL_HEIGHT = 147;

export function Logo({ className = "", height = 46 }) {
  const width = Math.round((NATURAL_WIDTH / NATURAL_HEIGHT) * height);
  return (
    <img
      src="/logo.png"
      alt="EaseMyClean"
      width={width}
      height={height}
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
