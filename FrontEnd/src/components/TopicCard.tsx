import { motion } from "framer-motion";

interface TopicCardProps {
  title: string;
  category: string;
  author: string;
  image: string;
  delay?: number;
}

export function TopicCard({ title, category, author, image, delay = 0 }: TopicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="group cursor-pointer"
    >
      <div className="mb-6 aspect-[4/5] w-full overflow-hidden rounded-2xl transition-all duration-700 group-hover:scale-[1.02] group-hover:shadow-editorial">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
        {category}
      </span>
      <h2 className="mt-2 font-serif text-2xl leading-tight tracking-editorial text-foreground lg:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">Curated by {author}</p>
    </motion.div>
  );
}
