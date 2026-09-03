import SiteHeader from "@/components/landing/SiteHeader";
import Hero from "@/components/landing/Hero";
import About from "@/components/landing/About";
import Agenda from "@/components/landing/Agenda";
import Speakers from "@/components/landing/Speakers";
import Venue from "@/components/landing/Venue";
import Registration from "@/components/landing/Registration";
import Faq from "@/components/landing/Faq";
import SiteFooter from "@/components/landing/SiteFooter";

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
        <Agenda />
        <Speakers />
        <Venue />
        <Registration />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
