import { useState, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@lingui/core/macro";
import { useForm } from "react-hook-form";
import {
  HiEllipsisHorizontal,
  HiOutlineAdjustmentsHorizontal,
  HiOutlinePlusSmall,
  HiOutlineSquaresPlus,
  HiOutlineTrash,
} from "react-icons/hi2";

import { authClient } from "@kan/auth/client";

import type { ListDragData } from "../dnd/types";
import Dropdown from "~/components/Dropdown";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import { isPlaceholderPublicId } from "~/utils/helpers";

interface ListProps {
  children: ReactNode;
  list: List;
  cardsCount?: number;
  setSelectedPublicListId: (publicListId: PublicListId) => void;
}

interface List {
  publicId: string;
  name: string;
  createdBy?: string | null;
  maxCards?: number | null;
}

interface FormValues {
  listPublicId: string;
  name: string;
}

type PublicListId = string;

export default function List({
  children,
  list,
  cardsCount,
  setSelectedPublicListId,
}: ListProps) {
  const { openModal } = useModal();
  const utils = api.useUtils();
  const { canCreateCard, canEditList, canDeleteList } = usePermissions();
  const { data: session } = authClient.useSession();
  const isCreator = list.createdBy && session?.user.id === list.createdBy;
  const isOptimistic = isPlaceholderPublicId(list.publicId);
  const canEdit = canEditList || isCreator;
  const canDrag = !isOptimistic && (canEditList || isCreator);

  const [isEditingWip, setIsEditingWip] = useState(false);
  const [wipValue, setWipValue] = useState(
    list.maxCards ? String(list.maxCards) : "",
  );

  const isWipExceeded =
    !!list.maxCards && cardsCount !== undefined && cardsCount > list.maxCards;

  const openNewCardForm = (publicListId: PublicListId) => {
    if (!canCreateCard || isOptimistic) return;
    openModal("NEW_CARD");
    setSelectedPublicListId(publicListId);
  };

  const updateList = api.list.update.useMutation({
    onSuccess: () => {
      utils.board.byId.invalidate();
      utils.board.bySlug.invalidate();
    },
  });

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      listPublicId: list.publicId,
      name: list.name,
    },
    values: {
      listPublicId: list.publicId,
      name: list.name,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!canEdit || isOptimistic) return;
    updateList.mutate({
      listPublicId: values.listPublicId,
      name: values.name,
    });
  };

  const handleSaveWip = () => {
    setIsEditingWip(false);
    const parsed = parseInt(wipValue.trim(), 10);
    const maxCards = isNaN(parsed) || parsed <= 0 ? null : parsed;
    if (maxCards !== (list.maxCards ?? null)) {
      updateList.mutate({
        listPublicId: list.publicId,
        maxCards,
      });
    }
  };

  const handleOpenDeleteListConfirmation = () => {
    setSelectedPublicListId(list.publicId);
    openModal("DELETE_LIST");
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.publicId,
    data: { type: "LIST" } satisfies ListDragData,
    disabled: { draggable: !canDrag, droppable: false },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      data-board-draggable
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`dark-text-dark-1000 mr-5 h-fit min-w-[18rem] max-w-[18rem] snap-start rounded-md border py-2 pl-2 pr-1 text-neutral-900 md:snap-align-none ${
        isWipExceeded
          ? "border-red-400 bg-red-50/30 dark:border-red-500/50 dark:bg-red-950/15"
          : "border-light-400 bg-light-300 dark:border-dark-300 dark:bg-dark-100"
      } ${canDrag ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
    >
      <div className="mb-2 flex justify-between">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full focus-visible:outline-none"
        >
          <div className="flex items-center">
            <input
              id="name"
              type="text"
              dir="auto"
              aria-label={t`List name`}
              {...register("name")}
              onBlur={handleSubmit(onSubmit)}
              readOnly={!canEdit || isOptimistic}
              className="w-full border-0 bg-transparent px-4 pt-1 text-sm font-medium text-neutral-900 focus:ring-0 focus-visible:outline-none dark:text-dark-1000"
            />
            <span
              className={`mr-2 whitespace-nowrap text-xs font-semibold ${
                isWipExceeded
                  ? "text-red-600 dark:text-red-400"
                  : "text-light-700 dark:text-dark-700"
              }`}
            >
              {cardsCount ?? 0}
              {list.maxCards ? `/${list.maxCards}` : ""}
            </span>
          </div>
        </form>
        <div className="flex items-center">
          <Tooltip
            content={!canCreateCard ? t`You don't have permission` : undefined}
          >
            <button
              className="mx-1 inline-flex h-fit items-center rounded-md p-1 px-1 text-sm font-semibold text-dark-50 hover:bg-light-400 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-dark-200"
              onClick={() => openNewCardForm(list.publicId)}
              disabled={!canCreateCard || isOptimistic}
              aria-label={t`Add card`}
            >
              <HiOutlinePlusSmall
                className="h-5 w-5 text-dark-900"
                aria-hidden="true"
              />
            </button>
          </Tooltip>
          {(() => {
            const dropdownItems = [
              ...(canCreateCard && !isOptimistic
                ? [
                    {
                      label: t`Add a card`,
                      action: () => openNewCardForm(list.publicId),
                      icon: (
                        <HiOutlineSquaresPlus className="h-[18px] w-[18px] text-dark-900" />
                      ),
                    },
                  ]
                : []),
              ...(canEdit && !isOptimistic
                ? [
                    {
                      label: t`Set WIP limit`,
                      action: () => setIsEditingWip(true),
                      icon: (
                        <HiOutlineAdjustmentsHorizontal className="h-[18px] w-[18px] text-dark-900" />
                      ),
                    },
                  ]
                : []),
              ...(!isOptimistic && (canDeleteList || isCreator)
                ? [
                    {
                      label: t`Delete list`,
                      action: handleOpenDeleteListConfirmation,
                      icon: (
                        <HiOutlineTrash className="h-[18px] w-[18px] text-dark-900" />
                      ),
                    },
                  ]
                : []),
            ];

            if (dropdownItems.length === 0) {
              return null;
            }

            return (
              <div className="relative mr-1 inline-block">
                <Dropdown items={dropdownItems} ariaLabel={t`List options`}>
                  <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
                </Dropdown>
              </div>
            );
          })()}
        </div>
      </div>
      {isEditingWip && (
        <div className="mb-2 px-3">
          <input
            type="number"
            min="0"
            placeholder={t`WIP Limit (0 to clear)`}
            value={wipValue}
            onChange={(e) => setWipValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveWip();
              if (e.key === "Escape") setIsEditingWip(false);
            }}
            onBlur={handleSaveWip}
            autoFocus
            className="w-full rounded border border-light-400 bg-white px-2 py-1 text-xs text-neutral-900 focus:outline-none dark:border-dark-400 dark:bg-dark-200 dark:text-dark-1000"
          />
        </div>
      )}
      {children}
    </div>
  );
}
