import { cn } from "../../lib/cn";

type TabsProps = {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
};

export const Tabs = ({ tabs, activeTab, onChange, className }: TabsProps) => (
  <div
    aria-label="Workspace sections"
    className={cn("flex flex-wrap gap-2", className)}
    role="tablist"
  >
    {tabs.map((tab) => {
      const isActive = tab.id === activeTab;

      return (
        <button
          key={tab.id}
          aria-selected={isActive}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
            isActive
              ? "bg-primary-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100",
          )}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);
