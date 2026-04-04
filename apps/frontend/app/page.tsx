import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
import BentoFeatures from "@/components/landing/BentoFeatures";
import FallbackChain from "@/components/landing/FallbackChain";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main style={{ background: "#07070e", minHeight: "100vh" }}>
      <Header />
      <Hero />
      <Stats />
      <BentoFeatures />
      <FallbackChain />
      <CTA />
      <Footer />
    </main>
  );
}
