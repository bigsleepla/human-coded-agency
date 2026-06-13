import { Link } from "@tanstack/react-router";

type Variant = "light" | "dark";

export function SiteNav({ variant = "light" }: { variant?: Variant }) {
  const linkClass =
    variant === "dark"
      ? "text-foreground/75 hover:text-foreground text-sm md:text-base tracking-wide uppercase transition-colors"
      : "text-white/85 hover:text-white text-sm md:text-base tracking-wide uppercase transition-colors";

  return (
    <nav
      aria-label="Primary"
      className="absolute z-20 left-10 top-[150px] md:top-10 md:right-10 md:left-auto flex flex-wrap items-center gap-x-6 gap-y-2"
      style={{
        fontFamily:
          'Garet, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
      }}
    >
      <Link to="/about" className={linkClass}>
        About
      </Link>
      <a
        href="https://www.reddit.com/r/human_coded_dev/"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Reddit
      </a>
      <Link to="/auth" className={linkClass}>
        Portal
      </Link>
      <Link to="/contact" className={linkClass}>
        Contact
      </Link>
    </nav>
  );
}
