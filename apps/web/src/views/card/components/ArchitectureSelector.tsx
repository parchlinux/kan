import { t } from "@lingui/core/macro";
import { twMerge } from "tailwind-merge";
import { HiOutlineCpuChip } from "react-icons/hi2";

import CheckboxDropdown from "~/components/CheckboxDropdown";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface ArchitectureSelectorProps {
  cardPublicId: string;
  architecture?: string | null;
  isLoading: boolean;
  disabled?: boolean;
}

const architectures = [
  { key: "all", label: "All Architectures" },
  { key: "x86_64", label: "x86_64" },
  { key: "aarch64", label: "aarch64" },
];

export function ArchitectureSelector({
  cardPublicId,
  architecture = "all",
  isLoading,
  disabled = false,
}: ArchitectureSelectorProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const updateCard = api.card.update.useMutation({
    onSuccess: async () => {
      await invalidateCard(utils, cardPublicId);
    },
    onError: () => {
      showPopup({
        header: t`Unable to update architecture`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
  });

  const currentArch = architecture || "all";
  const currentItem =
    architectures.find((a) => a.key === currentArch) ?? architectures[0]!;

  const items = architectures.map((a) => ({
    key: a.key,
    value: a.label,
    selected: a.key === currentArch,
    leftIcon: <HiOutlineCpuChip className="mr-2 h-4 w-4 text-emerald-500" />,
  }));

  const handleSelect = (_groupKey: string | null, item: { key: string }) => {
    if (disabled || isLoading) return;
    updateCard.mutate({
      cardPublicId,
      architecture: (item.key === "all" ? null : item.key) as
        | "x86_64"
        | "aarch64"
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
            <HiOutlineCpuChip className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-mono text-xs">{currentItem.label}</span>
          </div>
        </button>
      </CheckboxDropdown>
    </div>
  );
}
