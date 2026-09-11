import SiteHeader from "@/components/landing/SiteHeader";
import Hero from "@/components/landing/Hero";
import About from "@/components/landing/About";
import Speakers from "@/components/landing/Speakers";
import Venue from "@/components/landing/Venue";
import Journey from "@/components/landing/Journey";
import Registration from "@/components/landing/Registration";
import Faq from "@/components/landing/Faq";
import SiteFooter from "@/components/landing/SiteFooter";
import { SHOW_SPEAKERS } from "@/lib/event";

/**
 * La landing no consulta la base: todo su contenido vive en src/lib/event.ts,
 * asi que se genera estatica y sigue en pie aunque la base no responda.
 */
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <About />
        {SHOW_SPEAKERS && <Speakers />}
        <Venue />
        <Journey />
        <Registration />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
