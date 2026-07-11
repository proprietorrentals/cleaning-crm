import Link from "next/link";

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>ServiceOS | Operate with Confidence.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="hover:text-blue-700">
            Home
          </Link>
          <Link href="/pricing" className="hover:text-blue-700">
            Pricing
          </Link>
          <Link href="/explore" className="hover:text-blue-700">
            Explore Demo
          </Link>
          <Link href="/contact" className="hover:text-blue-700">
            Contact
          </Link>
          <Link href="/login" className="hover:text-blue-700">
            Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
