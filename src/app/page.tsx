import { prisma } from "@/lib/db";
import SiteHeader from "@/components/landing/SiteHeader";
import Hero from "@/components/landing/Hero";
import EventDescription from "@/components/landing/EventDescription";
import Speakers from "@/components/landing/Speakers";
import Venue from "@/components/landing/Venue";
import Registration from "@/components/landing/Registration";
import Sponsors from "@/components/landing/Sponsors";
import SiteFooter from "@/components/landing/SiteFooter";

export const dynamic = "force-dynamic";

/**
 * Las estaciones son un extra del recorrido: si la base no responde,
 * la landing del evento debe seguir en pie.
 */
async function activeStations() {
  try {
    return await prisma.station.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, emoji: true },
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const stations = await activeStations();

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <EventDescription />
        <Speakers />
        <Venue />
        <Registration stations={stations} />
        <Sponsors />
      </main>
      <SiteFooter />
    </>
  );
}
