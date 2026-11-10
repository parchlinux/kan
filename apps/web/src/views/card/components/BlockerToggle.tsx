import { t } from "@lingui/core/macro";
import { HiExclamationTriangle, HiCheck } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface BlockerToggleProps {
  cardPublicId: string;
  isBlocked?: boolean | null;
  isLoading: boolean;
  disabled?: boolean;
}

export function BlockerToggle({
  cardPublicId,
  isBlocked = false,
  isLoading,
  disabled = false,
}: BlockerToggleProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const updateCard = api.card.update.useMutation({
    onSuccess: async () => {
      await invalidateCard(utils, cardPublicId);
    },
    onError: () => {
      showPopup({
        header: t`Unable to update blocker status`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
  });

  const toggle = () => {
    if (disabled || isLoading) return;
    updateCard.mutate({
      cardPublicId,
      isBlocked: !isBlocked,
    });
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || isLoading}
        className={twMerge(
          "flex h-9 w-full items-center justify-between rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          isBlocked
            ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
            : "border-light-400 bg-white text-neutral-700 hover:bg-light-100 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-900 dark:hover:bg-dark-300",
        )}
      >
        <div className="flex items-center gap-2">
          {isBlocked ? (
            <HiExclamationTriangle className="h-4 w-4 text-red-500 animate-pulse" />
          ) : (
            <HiCheck className="h-4 w-4 text-light-600 dark:text-dark-600" />
          )}
          <span>{isBlocked ? t`Blocked Issue` : t`Not Blocked`}</span>
        </div>
        <span
          className={twMerge(
            "rounded px-1.5 py-0.5 text-[10px] uppercase font-semibold",
            isBlocked
              ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200"
              : "bg-light-200 text-light-700 dark:bg-dark-300 dark:text-dark-700",
          )}
        >
          {isBlocked ? t`Active Blocker` : t`Clear`}
        </span>
      </button>
    </div>
  );
}
