import Link from "next/link";

interface ButtonProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

export function Button({ href, children, className = "", type = "button", onClick }: ButtonProps) {
  const styles = `inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${className}`;

  if (href) {
    return <Link href={href} className={styles}>{children}</Link>;
  }

  return (
    <button type={type} className={styles} onClick={onClick}>
      {children}
    </button>
  );
}
