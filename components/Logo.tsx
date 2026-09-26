// The Yoël The G crayon logo. The art has a transparent background and a
// white sticker outline, so it reads on all four themes without a backdrop.
// AVIF first (about 1/3 the size of WebP for this texture), WebP as fallback.

const WIDTHS = [240, 480, 960];
const srcSet = (ext: string) =>
  WIDTHS.map((w) => `/brand/logo-${w}.${ext} ${w}w`).join(", ");

export default function Logo({
  sizes,
  className,
}: {
  /** Rendered CSS width(s) of the logo, used to pick the right file. */
  sizes: string;
  className?: string;
}) {
  return (
    <picture className="block shrink-0">
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized static art; no optimizer in the standalone build */}
      <img
        src="/brand/logo-480.webp"
        srcSet={srcSet("webp")}
        sizes={sizes}
        width={1112}
        height={991}
        alt="Yoël The G"
        draggable={false}
        className={className}
      />
    </picture>
  );
}
