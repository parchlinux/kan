import { t } from "@lingui/core/macro";
import {
  HiOutlineUser,
  HiExclamationTriangle,
  HiOutlineBars3,
  HiOutlineSquares2X2,
  HiOutlineXMark,
  HiOutlineDocumentText,
  HiOutlineCpuChip,
  HiOutlineComputerDesktop,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import LabelIcon from "~/components/LabelIcon";

interface QuickFilterBarProps {
  labels: { publicId: string; name: string; colourCode: string | null }[];
  myCardsOnly: boolean;
  onToggleMyCards: () => void;
  selectedPriority: string | null;
  onSelectPriority: (priority: string | null) => void;
  selectedLabelId: string | null;
  onSelectLabel: (labelId: string | null) => void;
  selectedArch: string | null;
  onSelectArch: (arch: string | null) => void;
  selectedDE: string | null;
  onSelectDE: (de: string | null) => void;
  blockedOnly: boolean;
  onToggleBlocked: () => void;
  density: "detailed" | "compact";
  onToggleDensity: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  onOpenReleaseNotes: () => void;
}

const priorities = [
  { key: "urgent", label: "Urgent", color: "text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40" },
  { key: "high", label: "High", color: "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40" },
  { key: "medium", label: "Medium", color: "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40" },
  { key: "low", label: "Low", color: "text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40" },
];

const archs = ["x86_64", "aarch64"];
const desktopEnvs = ["kde", "gnome", "hyprland", "xfce"];

export function QuickFilterBar({
  labels,
  myCardsOnly,
  onToggleMyCards,
  selectedPriority,
  onSelectPriority,
  selectedLabelId,
  onSelectLabel,
  selectedArch,
  onSelectArch,
  selectedDE,
  onSelectDE,
  blockedOnly,
  onToggleBlocked,
  density,
  onToggleDensity,
  onClearFilters,
  hasActiveFilters,
  onOpenReleaseNotes,
}: QuickFilterBarProps) {
  return (
    <div className="z-10 flex flex-wrap items-center justify-between gap-2 border-b border-light-200/80 bg-light-50/60 px-6 py-2.5 backdrop-blur-sm dark:border-dark-300 dark:bg-dark-100/50 md:px-8">
      {/* Left side: Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
        {/* My Cards Toggle */}
        <button
          type="button"
          onClick={onToggleMyCards}
          className={twMerge(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            myCardsOnly
              ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "border-light-300 bg-white text-light-800 hover:bg-light-100 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-800 dark:hover:bg-dark-300",
          )}
        >
          <HiOutlineUser className="h-3.5 w-3.5" />
          <span>{t`My Cards`}</span>
        </button>

        {/* Blocker Only Toggle */}
        <button
          type="button"
          onClick={onToggleBlocked}
          className={twMerge(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            blockedOnly
              ? "border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/70 dark:text-red-300"
              : "border-light-300 bg-white text-light-800 hover:bg-light-100 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-800 dark:hover:bg-dark-300",
          )}
        >
          <HiExclamationTriangle
            className={twMerge(
              "h-3.5 w-3.5",
              blockedOnly ? "text-red-500" : "text-light-700 dark:text-dark-700",
            )}
          />
          <span>{t`Blockers`}</span>
        </button>

        <span className="mx-1 h-4 w-px bg-light-300 dark:bg-dark-300" />

        {/* Priority Filters */}
        {priorities.map((p) => {
          const isActive = selectedPriority === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelectPriority(isActive ? null : p.key)}
              className={twMerge(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                isActive
                  ? `${p.color} ring-1 ring-emerald-500 font-bold`
                  : "border-light-300 bg-white text-light-700 hover:bg-light-100 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-800 dark:hover:bg-dark-300",
              )}
            >
              {p.label}
            </button>
          );
        })}

        <span className="mx-1 h-4 w-px bg-light-300 dark:bg-dark-300" />

        {/* Architecture Chips */}
        {archs.map((arch) => {
          const isActive = selectedArch === arch;
          return (
            <button
              key={arch}
              type="button"
              onClick={() => onSelectArch(isActive ? null : arch)}
              className={twMerge(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors",
                isActive
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold dark:border-emerald-500 dark:bg-emerald-950/70 dark:text-emerald-300"
                  : "border-light-300 bg-white text-light-700 hover:bg-light-100 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-800 dark:hover:bg-dark-300",
              )}
            >
              <HiOutlineCpuChip className="h-3 w-3" />
              {arch}
            </button>
          );
        })}

        {/* Desktop Environment Chips */}
        {desktopEnvs.map((de) => {
          const isActive = selectedDE === de;
          return (
            <button
              key={de}
              type="button"
              onClick={() => onSelectDE(isActive ? null : de)}
              className={twMerge(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] uppercase transition-colors",
                isActive
                  ? "border-cyan-500 bg-cyan-50 text-cyan-800 font-bold dark:border-cyan-500 dark:bg-cyan-950/70 dark:text-cyan-300"
                  : "border-light-300 bg-white text-light-700 hover:bg-light-100 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-800 dark:hover:bg-dark-300",
              )}
            >
              <HiOutlineComputerDesktop className="h-3 w-3" />
              {de}
            </button>
          );
        })}

        {/* Top Labels */}
        {labels.slice(0, 5).map((l) => {
          const isActive = selectedLabelId === l.publicId;
          return (
            <button
              key={l.publicId}
              type="button"
              onClick={() => onSelectLabel(isActive ? null : l.publicId)}
              className={twMerge(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                isActive
                  ? "border-emerald-500 bg-light-200 text-neutral-900 font-bold dark:border-emerald-500 dark:bg-dark-300 dark:text-dark-1000"
                  : "border-light-300 bg-white text-light-700 hover:bg-light-100 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-800 dark:hover:bg-dark-300",
              )}
            >
              <LabelIcon colourCode={l.colourCode} />
              <span>{l.name}</span>
            </button>
          );
        })}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-red-300 px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <HiOutlineXMark className="h-3.5 w-3.5" />
            <span>{t`Reset`}</span>
          </button>
        )}
      </div>

      {/* Right side: Density & Release Notes */}
      <div className="flex items-center gap-2">
        {/* Release Notes Button */}
        <button
          type="button"
          onClick={onOpenReleaseNotes}
          className="inline-flex items-center gap-1.5 rounded-md border border-light-300 bg-white px-2.5 py-1 text-xs font-semibold text-light-900 shadow-sm transition-colors hover:bg-light-100 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-900 dark:hover:bg-dark-300"
          title="Generate Changelog and Release Notes"
        >
          <HiOutlineDocumentText className="h-3.5 w-3.5 text-emerald-500" />
          <span className="hidden sm:inline">{t`Release Notes`}</span>
        </button>

        {/* Density Toggle Button */}
        <button
          type="button"
          onClick={onToggleDensity}
          className="inline-flex items-center gap-1.5 rounded-md border border-light-300 bg-white px-2.5 py-1 text-xs font-medium text-light-900 shadow-sm transition-colors hover:bg-light-100 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-900 dark:hover:bg-dark-300"
          title={`Switch to ${density === "compact" ? "detailed" : "compact"} view`}
        >
          {density === "compact" ? (
            <>
              <HiOutlineBars3 className="h-4 w-4 text-emerald-500" />
              <span className="capitalize">{t`Compact`}</span>
            </>
          ) : (
            <>
              <HiOutlineSquares2X2 className="h-4 w-4 text-emerald-500" />
              <span className="capitalize">{t`Detailed`}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
