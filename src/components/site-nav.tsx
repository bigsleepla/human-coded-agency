import { Link } from "@tanstack/react-router";

const linkClass =
  "text-white/85 hover:text-white text-sm md:text-base tracking-wide uppercase transition-colors";

export function SiteNav() {
  return (
    <nav
      aria-label="Primary"
      className="absolute z-20 top-10 right-10 flex flex-wrap items-center gap-x-6 gap-y-2"
      style={{
        fontFamily:
          'Garet, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
      }}
    >
      <Link to="/auth" className={linkClass}>
        Portal
      </Link>
      <a
        href="https://developers.reddit.com/apps/human-coded"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Reddit
      </a>
      <Link to="/about" className={linkClass}>
        About
      </Link>
      <Link to="/contact" className={linkClass}>
        Contact
      </Link>
    </nav>
  );
}
