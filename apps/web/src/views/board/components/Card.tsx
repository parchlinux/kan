import { format, isBefore, isSameYear, startOfDay } from "date-fns";
import { HiOutlinePaperClip } from "react-icons/hi";
import {
  HiBars3BottomLeft,
  HiChatBubbleLeft,
  HiOutlineClock,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import CircularProgress from "~/components/CircularProgress";
import LabelIcon from "~/components/LabelIcon";
import { useLocalisation } from "~/hooks/useLocalisation";
import { getAvatarUrl } from "~/utils/helpers";

const Card = ({
  title,
  ticketNumber,
  labels,
  members,
  summary,
  checklists,
  description,
  comments,
  attachments,
  dueDate,
  priority,
  storyPoints,
}: {
  title: string;
  ticketNumber?: string | null;
  labels: { name: string; colourCode: string | null }[];
  members: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
  summary?: {
    hasDescription: boolean;
    attachmentCount: number;
    hasComments: boolean;
    checklistItemCount: number;
    completedChecklistItemCount: number;
  };
  checklists: {
    publicId: string;
    name: string;
    items: {
      publicId: string;
      title: string;
      completed: boolean;
      index: number;
    }[];
  }[];
  description: string | null;
  comments: { publicId: string }[];
  attachments: { publicId: string }[];
  dueDate?: Date | null;
  priority?: string | null;
  storyPoints?: number | null;
}) => {
  const { dateLocale } = useLocalisation();
  const showYear = dueDate ? !isSameYear(dueDate, new Date()) : false;
  const isOverdue = dueDate ? isBefore(dueDate, startOfDay(new Date())) : false;
  const cardSummary = summary ?? {
    hasDescription:
      (description?.replace(/<[^>]*>/g, "").trim().length ?? 0) > 0,
    attachmentCount: attachments.length,
    hasComments: comments.length > 0,
    checklistItemCount: checklists.reduce(
      (count, checklist) => count + checklist.items.length,
      0,
    ),
    completedChecklistItemCount: checklists.reduce(
      (count, checklist) =>
        count + checklist.items.filter((item) => item.completed).length,
      0,
    ),
  };
  const progress =
    cardSummary.checklistItemCount > 0
      ? Math.round(
          (cardSummary.completedChecklistItemCount /
            cardSummary.checklistItemCount) *
            100,
        )
      : 0;
  const hasDueDate = !!dueDate;

  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-light-200 bg-light-50 px-3 py-2 text-sm text-neutral-900 dark:border-dark-200 dark:bg-dark-200 dark:text-dark-1000 dark:hover:bg-dark-300">
      <div className="mb-1 flex items-center justify-between">
        {ticketNumber ? (
          <span className="text-xs text-light-700 dark:text-dark-800">
            {ticketNumber}
          </span>
        ) : <span />}
        <div className="flex items-center gap-1.5">
          {storyPoints != null && (
            <span className="rounded bg-light-200 px-1.5 py-0.5 text-[10px] font-semibold text-light-900 dark:bg-dark-400 dark:text-dark-900">
              {storyPoints} pts
            </span>
          )}
          {priority && priority !== "none" && (
            <span
              className={twMerge(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                priority === "urgent" &&
                  "bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300",
                priority === "high" &&
                  "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
                priority === "medium" &&
                  "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300",
                priority === "low" &&
                  "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
              )}
            >
              {priority}
            </span>
          )}
        </div>
      </div>
      <span className="break-words" dir="auto">
        {title}
      </span>
      {labels.length ||
      members.length ||
      cardSummary.checklistItemCount > 0 ||
      cardSummary.hasDescription ||
      cardSummary.hasComments ||
      hasDueDate ||
      cardSummary.attachmentCount > 0 ? (
        <div className="mt-2 flex flex-col justify-end">
          <div className="space-x-0.5">
            {labels.map((label) => (
              <Badge
                value={label.name}
                iconLeft={<LabelIcon colourCode={label.colourCode} />}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              {cardSummary.hasDescription && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiBars3BottomLeft className="h-4 w-4" />
                </div>
              )}
              {hasDueDate && dueDate && (
                <div
                  className={twMerge(
                    "flex items-center gap-1",
                    isOverdue
                      ? "text-red-600 dark:text-red-400"
                      : "text-light-800 dark:text-dark-800",
                  )}
                >
                  <HiOutlineClock className="h-4 w-4" />
                  <span className="text-[11px]">
                    {format(dueDate, showYear ? "do MMM yyyy" : "do MMM", {
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              )}
              {cardSummary.hasComments && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiChatBubbleLeft className="h-4 w-4" />
                </div>
              )}
              {cardSummary.attachmentCount > 0 && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiOutlinePaperClip className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-1">
              {cardSummary.checklistItemCount > 0 && (
                <div className="flex items-center gap-1 rounded-full border-[1px] border-light-300 px-2 py-1 dark:border-dark-600">
                  <CircularProgress
                    progress={progress || 2}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <span className="text-[10px] text-light-900 dark:text-dark-950">
                    {cardSummary.completedChecklistItemCount}/
                    {cardSummary.checklistItemCount}
                  </span>
                </div>
              )}
              {members.length > 0 && (
                <div className="isolate flex justify-end -space-x-1 overflow-hidden">
                  {members.map(({ user, email }) => {
                    const avatarUrl = user?.image
                      ? getAvatarUrl(user.image)
                      : undefined;

                    return (
                      <Avatar
                        name={user?.name ?? ""}
                        email={user?.email ?? email}
                        imageUrl={avatarUrl}
                        size="sm"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Card;
