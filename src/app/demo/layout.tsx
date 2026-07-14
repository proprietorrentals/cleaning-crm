import { DemoConversionSection } from "@/components/demo/demo-conversion-section";
import { DemoModeBanner } from "@/components/demo/demo-mode-banner";
import { DemoSessionProvider } from "@/components/demo/demo-session-provider";
import { DemoTrustStrip } from "@/components/demo/demo-trust-strip";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicSiteNav } from "@/components/public-site-nav";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoSessionProvider>
      <div className="demo-experience min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#edf5ff_0%,#f8fbff_48%,#f2f6fb_100%)] text-slate-900">
        <PublicSiteNav active="home" />
        <DemoModeBanner />

        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <DemoTrustStrip />
          {children}
          <DemoConversionSection />
        </main>

        <PublicSiteFooter />
      </div>
    </DemoSessionProvider>
  );
}
