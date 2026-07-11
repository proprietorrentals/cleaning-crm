import Link from "next/link";
import { ServiceOSBrand } from "@/components/serviceos-brand";

type PublicSiteNavProps = {
  active?: "home" | "pricing" | "contact";
};

function linkClass(isActive: boolean) {
  return isActive
    ? "text-blue-700"
    : "text-slate-700 hover:text-blue-700";
}

export function PublicSiteNav({ active }: PublicSiteNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-blue-100/70 bg-white/85 backdrop-blur">
      <nav aria-label="Primary" className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <ServiceOSBrand showTagline />
          </Link>
          <Link
            href="/login"
            className="inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-700 lg:hidden"
          >
            Login
          </Link>
        </div>

        <ul className="mt-3 flex items-center gap-4 overflow-x-auto whitespace-nowrap pb-1 text-sm font-medium text-slate-700 lg:hidden">
          <li>
            <Link href="/" className={linkClass(active === "home")}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/#features" className="hover:text-blue-700">
              Features
            </Link>
          </li>
          <li>
            <Link href="/#ai-supervisor" className="hover:text-blue-700">
              AI Supervisor
            </Link>
          </li>
          <li>
            <Link href="/pricing" className={linkClass(active === "pricing")}>
              Pricing
            </Link>
          </li>
          <li>
            <Link href="/explore" className="hover:text-blue-700">
              Explore Demo
            </Link>
          </li>
          <li>
            <Link href="/contact" className={linkClass(active === "contact")}>
              Contact
            </Link>
          </li>
        </ul>

        <ul className="hidden items-center gap-6 text-sm font-medium lg:flex">
          <li>
            <Link href="/" className={linkClass(active === "home")}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/#features" className="text-slate-700 hover:text-blue-700">
              Features
            </Link>
          </li>
          <li>
            <Link href="/#ai-supervisor" className="text-slate-700 hover:text-blue-700">
              AI Supervisor
            </Link>
          </li>
          <li>
            <Link href="/pricing" className={linkClass(active === "pricing")}>
              Pricing
            </Link>
          </li>
          <li>
            <Link href="/explore" className="text-slate-700 hover:text-blue-700">
              Explore Demo
            </Link>
          </li>
          <li>
            <Link href="/contact" className={linkClass(active === "contact")}>
              Contact
            </Link>
          </li>
          <li>
            <Link href="/login" className="text-slate-700 hover:text-blue-700">
              Login
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
