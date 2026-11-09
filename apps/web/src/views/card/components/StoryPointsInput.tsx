import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface StoryPointsInputProps {
  cardPublicId: string;
  storyPoints?: number | null;
  isLoading: boolean;
  disabled?: boolean;
}

export function StoryPointsInput({
  cardPublicId,
  storyPoints,
  isLoading,
  disabled = false,
}: StoryPointsInputProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const [value, setValue] = useState(
    storyPoints != null ? String(storyPoints) : "",
  );

  useEffect(() => {
    setValue(storyPoints != null ? String(storyPoints) : "");
  }, [storyPoints]);

  const updateCard = api.card.update.useMutation({
    onSuccess: async () => {
      await invalidateCard(utils, cardPublicId);
    },
    onError: () => {
      showPopup({
        header: t`Unable to update story points`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
  });

  const handleSave = () => {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : parseInt(trimmed, 10);
    const newPoints =
      parsed !== null && !isNaN(parsed) && parsed >= 0 ? parsed : null;

    if (newPoints !== (storyPoints ?? null)) {
      updateCard.mutate({
        cardPublicId,
        storyPoints: newPoints,
      });
    }
  };

  return (
    <div className="w-full">
      <input
        type="number"
        min="0"
        max="1000"
        placeholder={t`Points (e.g. 3)`}
        value={value}
        disabled={disabled || isLoading}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
        }}
        onBlur={handleSave}
        className="h-9 w-full rounded-md border border-light-400 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-light-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-1000"
      />
    </div>
  );
}
