import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Partners from "@/components/landing/Partners";
import BentoFeatures from "@/components/landing/BentoFeatures";
import ExtensionShowcase from "@/components/landing/ExtensionShowcase";
import TerminalDemo from "@/components/landing/TerminalDemo";
import FallbackChain from "@/components/landing/FallbackChain";
import CTA from "@/components/landing/CTA";
import WatchDemo from "@/components/landing/WatchDemo";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main>
      <Header />
      <Hero />
      <Partners />
      <BentoFeatures />
      <ExtensionShowcase />
      <TerminalDemo />
      <FallbackChain />
      <CTA />
      <WatchDemo />
      <Footer />
    </main>
  );
}
