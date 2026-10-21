import Image from "next/image";

import logo from "../../assets/brand/logo.png";

type BrandLogoProps = {
  /** Rendered width of the shield in px (height follows the image ratio). */
  size?: number;
  /** Show "Vokamsbulary 13" next to the shield (sidebar). */
  withName?: boolean;
  /** Text size of the name (default `text-xl`, the desktop sidebar). */
  nameClassName?: string;
  priority?: boolean;
};

/** VOKAMS 13 shield from `assets/brand/logo.png` (X-07): sidebar and access screen. */
export function BrandLogo({
  size = 36,
  withName = false,
  nameClassName = "text-xl",
  priority = false,
}: BrandLogoProps) {
  return (
    <span className="inline-flex items-center gap-3">
      <Image
        src={logo}
        alt={withName ? "" : "Vokamsbulary 13"}
        width={size}
        height={Math.round((size * logo.height) / logo.width)}
        priority={priority}
      />
      {withName ? (
        <span className={`${nameClassName} font-extrabold tracking-tight`}>Vokamsbulary 13</span>
      ) : null}
    </span>
  );
}
