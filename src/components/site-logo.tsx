import { Link } from "@tanstack/react-router";

type Variant = "light" | "dark";

export function SiteLogo({ variant = "light" }: { variant?: Variant }) {
  const colorClass = variant === "dark" ? "text-foreground" : "text-white";
  return (
    <Link
      to="/home"
      aria-label="Human-Coded — Home"
      className={`absolute top-10 left-10 z-10 select-none font-normal leading-[0.95] tracking-tight no-underline ${colorClass}`}
      style={{
        fontFamily:
          'Garet, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
      }}
    >
      <div className="text-[32px] md:text-[48px] lg:text-[72px] italic">
        <span style={{ marginRight: "6px" }}>|</span>HUMAN
      </div>
      <div className="text-[32px] md:text-[48px] lg:text-[72px] lg:ml-[32px] ml-[14px]">
        -CODED
      </div>
    </Link>
  );
}
