import { t } from "@lingui/core/macro";
import { HiOutlineComputerDesktop } from "react-icons/hi2";

import CheckboxDropdown from "~/components/CheckboxDropdown";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface DesktopEnvSelectorProps {
  cardPublicId: string;
  desktopEnv?: string | null;
  isLoading: boolean;
  disabled?: boolean;
}

const desktopEnvironments = [
  { key: "all", label: "All Desktop Environments" },
  { key: "kde", label: "KDE Plasma" },
  { key: "gnome", label: "GNOME" },
  { key: "hyprland", label: "Hyprland" },
  { key: "xfce", label: "XFCE" },
  { key: "cli", label: "CLI / Minimal" },
];

export function DesktopEnvSelector({
  cardPublicId,
  desktopEnv = "all",
  isLoading,
  disabled = false,
}: DesktopEnvSelectorProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const updateCard = api.card.update.useMutation({
    onSuccess: async () => {
      await invalidateCard(utils, cardPublicId);
    },
    onError: () => {
      showPopup({
        header: t`Unable to update desktop environment`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
  });

  const currentDE = desktopEnv || "all";
  const currentItem =
    desktopEnvironments.find((d) => d.key === currentDE) ??
    desktopEnvironments[0]!;

  const items = desktopEnvironments.map((d) => ({
    key: d.key,
    value: d.label,
    selected: d.key === currentDE,
    leftIcon: (
      <HiOutlineComputerDesktop className="mr-2 h-4 w-4 text-emerald-500" />
    ),
  }));

  const handleSelect = (_groupKey: string | null, item: { key: string }) => {
    if (disabled || isLoading) return;
    updateCard.mutate({
      cardPublicId,
      desktopEnv: (item.key === "all" ? null : item.key) as
        | "gnome"
        | "kde"
        | "hyprland"
        | "xfce"
        | "cli"
        | "all"
        | null,
    });
  };

  return (
    <div className="w-full">
      <CheckboxDropdown
        items={items}
        handleSelect={handleSelect}
        disabled={disabled || isLoading}
      >
        <button
          type="button"
          disabled={disabled || isLoading}
          className="flex h-9 w-full items-center justify-between rounded-md border border-light-400 bg-white px-3 py-1.5 text-xs text-neutral-900 hover:bg-light-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-1000 dark:hover:bg-dark-300"
        >
          <div className="flex items-center gap-2">
            <HiOutlineComputerDesktop className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs">{currentItem.label}</span>
          </div>
        </button>
      </CheckboxDropdown>
    </div>
  );
}
