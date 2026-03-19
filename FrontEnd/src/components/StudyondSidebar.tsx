// src/components/StudyondSidebar.tsx
import { useState } from "react";
import {
  Home, MessageSquare, FolderOpen, Compass, Briefcase,
  Users, Building2, Settings, ChevronRight, Sun, Moon, UserCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { useNavigate, useLocation } from "react-router-dom";

interface NavItem {
  label: string;
  icon: React.ElementType;
  hasSubmenu?: boolean;
  route?: string;
}

const personalItems: NavItem[] = [
  { label: "Home", icon: Home, route: "/" },
  { label: "Profile", icon: UserCircle2, route: "/profile" },
  { label: "Messages", icon: MessageSquare },
  { label: "My Projects", icon: FolderOpen },
];

const discoverItems: NavItem[] = [
  { label: "Topics", icon: Compass },
  { label: "Jobs", icon: Briefcase },
  { label: "People", icon: Users, hasSubmenu: true },
  { label: "Organizations", icon: Building2, hasSubmenu: true },
];

interface StudyondSidebarProps {
  activePage?: string;
}

export function StudyondSidebar({ activePage }: StudyondSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentRoute = location.pathname;

  const handleItemClick = (item: NavItem) => {
    if (item.route) navigate(item.route);
  };

  const isActive = (item: NavItem) => {
    if (item.route) return currentRoute === item.route;
    if (activePage) return activePage === item.label;
    return false;
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border/50 py-10 pl-8 pr-4">
      {/* Logo */}
      <div className="mb-14">
        <img src="/studyond.svg" alt="Studyond" className="h-8" />
      </div>

      {/* Personal section */}
      <div className="mb-8">
        <span className="mb-4 block text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
          Personal
        </span>
        <nav className="flex flex-col gap-1">
          {personalItems.map((item) => (
            <SidebarItem
              key={item.label}
              item={item}
              isActive={isActive(item)}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </nav>
      </div>

      {/* Discover section */}
      <div className="mb-8">
        <span className="mb-4 block text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
          Discover
        </span>
        <nav className="flex flex-col gap-1">
          {discoverItems.map((item) => (
            <SidebarItem
              key={item.label}
              item={item}
              isActive={isActive(item)}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </nav>
      </div>

      <div className="flex-1" />

      {/* Settings + Theme */}
      <div className="border-t border-border/40 pt-4">
        <div className="flex items-center gap-1">
          <div className="flex-1">
            <SidebarItem
              item={{ label: "Settings", icon: Settings }}
              isActive={isActive({ label: "Settings", icon: Settings })}
              onClick={() => {}}
            />
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            NE
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Nico Ehle</p>
            <p className="truncate text-xs text-muted-foreground">nicolas.ehle@st.oth...</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
        isActive
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      }`}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.hasSubmenu && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      )}
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center"
        >
          {theme === "light"
            ? <Moon className="h-4 w-4" strokeWidth={1.5} />
            : <Sun className="h-4 w-4" strokeWidth={1.5} />
          }
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
