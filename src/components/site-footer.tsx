import { Link } from "@tanstack/react-router";

type Variant = "light" | "dark";

export function SiteFooter({ variant = "dark" }: { variant?: Variant }) {
  const textClass =
    variant === "dark"
      ? "text-foreground/50 text-sm"
      : "text-white/50 text-sm";

  const linkClass =
    variant === "dark"
      ? "text-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors"
      : "text-white/70 hover:text-white underline underline-offset-2 transition-colors";

  return (
    <footer className="w-full py-6 text-center">
      <p className={textClass}>
        &copy; 2026 Human-Coded.{" "}
        <Link to="/privacy" className={linkClass}>
          Privacy Policy
        </Link>
      </p>
    </footer>
  );
}
