import type { Metadata } from "next";
import { ContactPageContent } from "@/components/contact-page-content";

export const metadata: Metadata = {
  title: "Contact ServiceOS | Request a Demo",
  description:
    "Request a ServiceOS demo for your service business. Share your workflow details and team size so we can tailor the walkthrough.",
  openGraph: {
    title: "Contact ServiceOS | Request a Demo",
    description: "Book a ServiceOS demo and see how to run service operations with confidence.",
    images: [{ url: "/serviceos-mark.svg", type: "image/svg+xml" }],
  },
};

export default function ContactPage() {
  return <ContactPageContent />;
}
