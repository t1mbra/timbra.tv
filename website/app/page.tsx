import { AboutPreview } from "@/components/sections/AboutPreview";
import { BotPreview } from "@/components/sections/BotPreview";
import { CalendarPreview } from "@/components/sections/CalendarPreview";
import { HeroHome } from "@/components/sections/HeroHome";
import { NewsPreview } from "@/components/sections/NewsPreview";
import { SocialsPreview } from "@/components/sections/SocialsPreview";
import { StreamsPreview } from "@/components/sections/StreamsPreview";
import { HomeQuickNav } from "@/components/home/HomeQuickNav";
import { HomeUtilityStrip } from "@/components/home/HomeUtilityStrip";

export default function Home() {
  return (
    <main id="main-content">
      <HeroHome />
      <HomeUtilityStrip />
      <HomeQuickNav />
      <StreamsPreview />
      <CalendarPreview />
      <NewsPreview />
      <SocialsPreview />
      <AboutPreview />
      <BotPreview />
    </main>
  );
}
