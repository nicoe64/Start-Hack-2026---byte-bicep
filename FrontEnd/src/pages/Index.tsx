import { motion } from "framer-motion";
import { StudyondSidebar } from "@/components/StudyondSidebar";
import { AIConciergeDrawer } from "@/components/AIConciergeDrawer";
import { TopicCard } from "@/components/TopicCard";
import topicAiUrban from "@/assets/topic-ai-urban.jpg";
import topicQuantum from "@/assets/topic-quantum.jpg";
import topicLogistics from "@/assets/topic-logistics.jpg";
import topicNeural from "@/assets/topic-neural.jpg";

const topics = [
  {
    title: "AI in Urban Planning",
    category: "Doctoral Thesis",
    author: "Dr. Aris Thorne",
    image: topicAiUrban,
  },
  {
    title: "Quantum Cryptography",
    category: "Corporate Research",
    author: "Siemens AG",
    image: topicQuantum,
  },
  {
    title: "Sustainable Logistics",
    category: "Master Thesis",
    author: "Prof. Elena Voss",
    image: topicLogistics,
  },
  {
    title: "Neural Architecture Search",
    category: "PhD Research",
    author: "Dr. Jonas Kramer",
    image: topicNeural,
  },
];

const Index = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      {/* Left Sidebar */}
      <StudyondSidebar />

      {/* Center Content Stage */}
      <main className="relative flex-1 overflow-y-auto px-12 py-16 lg:px-16 lg:py-20">
        {/* Editorial Header */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20 max-w-2xl"
        >
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Discovery
          </span>
          <h1 className="mt-4 font-serif text-5xl leading-editorial tracking-editorial text-foreground lg:text-7xl">
            The future of{" "}
            <br />
            <span className="italic text-foreground/70">Sustainable Logistics.</span>
          </h1>
          <p className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground">
            Explore curated research topics, connect with supervisors, and discover
            opportunities that align with your academic ambitions.
          </p>
        </motion.header>

        {/* Topic Cards Grid - asymmetric layout */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
          <TopicCard {...topics[0]} delay={0.1} />
          <div className="md:mt-20">
            <TopicCard {...topics[1]} delay={0.2} />
          </div>
          <TopicCard {...topics[2]} delay={0.3} />
          <div className="md:mt-20">
            <TopicCard {...topics[3]} delay={0.4} />
          </div>
        </div>
      </main>

      {/* Right AI Drawer */}
      <AIConciergeDrawer />
    </div>
  );
};

export default Index;
