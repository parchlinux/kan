import { t } from "@lingui/core/macro";
import { twMerge } from "tailwind-merge";

import CheckboxDropdown from "~/components/CheckboxDropdown";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface PrioritySelectorProps {
  cardPublicId: string;
  priority?: string | null;
  isLoading: boolean;
  disabled?: boolean;
}

const priorities = [
  { key: "none", label: "None", color: "bg-neutral-300 dark:bg-neutral-600" },
  { key: "low", label: "Low", color: "bg-slate-400 dark:bg-slate-500" },
  { key: "medium", label: "Medium", color: "bg-blue-500 dark:bg-blue-400" },
  { key: "high", label: "High", color: "bg-amber-500 dark:bg-amber-400" },
  { key: "urgent", label: "Urgent", color: "bg-red-500 dark:bg-red-400" },
];

export function PrioritySelector({
  cardPublicId,
  priority = "none",
  isLoading,
  disabled = false,
}: PrioritySelectorProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const updatePriority = api.card.update.useMutation({
    onSuccess: async () => {
      await invalidateCard(utils, cardPublicId);
    },
    onError: () => {
      showPopup({
        header: t`Unable to update priority`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
  });

  const currentPriority = priority ?? "none";
  const currentItem =
    priorities.find((p) => p.key === currentPriority) ?? priorities[0]!;

  const items = priorities.map((p) => ({
    key: p.key,
    value: p.label,
    selected: p.key === currentPriority,
    leftIcon: (
      <span className={twMerge("mr-2 h-2.5 w-2.5 rounded-full", p.color)} />
    ),
  }));

  const handleSelect = (_groupKey: string | null, item: { key: string }) => {
    if (disabled || isLoading) return;
    updatePriority.mutate({
      cardPublicId,
      priority: item.key as "urgent" | "high" | "medium" | "low" | "none",
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
            <span
              className={twMerge("h-2.5 w-2.5 rounded-full", currentItem.color)}
            />
            <span className="capitalize">{currentItem.label}</span>
          </div>
        </button>
      </CheckboxDropdown>
    </div>
  );
}
