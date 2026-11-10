import { useState, useMemo } from "react";
import { t } from "@lingui/core/macro";
import { format } from "date-fns";
import {
  HiOutlineDocumentText,
  HiOutlineClipboardDocument,
  HiOutlineArrowDownTray,
  HiCheck,
  HiXMark,
} from "react-icons/hi2";

import type { BoardList, BoardCard } from "../types";
import Button from "~/components/Button";

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: BoardList[];
  boardName: string;
  cardPrefix?: string;
}

export function ReleaseNotesModal({
  isOpen,
  onClose,
  lists,
  boardName,
  cardPrefix = "PARCH",
}: ReleaseNotesModalProps) {
  const defaultList = useMemo(() => {
    if (!lists.length) return null;
    const found = lists.find((l) =>
      /done|release|complete|تمام/i.test(l.name),
    );
    return found ?? lists[lists.length - 1];
  }, [lists]);

  const [selectedListId, setSelectedListId] = useState<string>(
    defaultList?.publicId ?? lists[0]?.publicId ?? "",
  );
  const [copied, setCopied] = useState(false);

  const activeList = useMemo(
    () => lists.find((l) => l.publicId === selectedListId) ?? defaultList,
    [lists, selectedListId, defaultList],
  );

  const markdownContent = useMemo(() => {
    if (!activeList) return "";
    const today = format(new Date(), "yyyy-MM-dd");
    const cards = activeList.cards ?? [];

    const grouped: Record<string, BoardCard[]> = {};
    const unlabelled: BoardCard[] = [];

    for (const card of cards) {
      if (card.labels && card.labels.length > 0) {
        const primaryLabel = card.labels[0]?.name ?? "General";
        if (!grouped[primaryLabel]) grouped[primaryLabel] = [];
        grouped[primaryLabel].push(card);
      } else {
        unlabelled.push(card);
      }
    }

    const lines: string[] = [];
    lines.push(`# ${boardName} - Release Notes`);
    lines.push(`Release Date: ${today}`);
    lines.push(`Target List: ${activeList.name}`);
    lines.push("");

    const formatCardLine = (c: BoardCard) => {
      const ticket = c.cardNumber != null ? `[${cardPrefix}-${c.cardNumber}]` : "";
      const extras: string[] = [];
      if (c.architecture && c.architecture !== "all") extras.push(c.architecture);
      if (c.desktopEnv && c.desktopEnv !== "all") extras.push(c.desktopEnv);
      const extraStr = extras.length > 0 ? ` (${extras.join(", ")})` : "";
      return `- ${ticket} ${c.title}${extraStr}`.trim();
    };

    for (const [groupName, groupCards] of Object.entries(grouped)) {
      lines.push(`## ${groupName}`);
      for (const card of groupCards) {
        lines.push(formatCardLine(card));
      }
      lines.push("");
    }

    if (unlabelled.length > 0) {
      lines.push(`## Other Changes`);
      for (const card of unlabelled) {
        lines.push(formatCardLine(card));
      }
      lines.push("");
    }

    lines.push("---");
    lines.push("*Generated via Parch Kanban*");
    return lines.join("\n");
  }, [activeList, boardName, cardPrefix]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy release notes:", e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CHANGELOG-${format(new Date(), "yyyyMMdd")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-light-300 bg-white shadow-2xl dark:border-dark-400 dark:bg-dark-100">
        <div className="flex items-center justify-between border-b border-light-200 px-6 py-4 dark:border-dark-300">
          <div className="flex items-center gap-2">
            <HiOutlineDocumentText className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000">
              {t`Generate Release Notes`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-light-700 hover:bg-light-100 dark:text-dark-800 dark:hover:bg-dark-200"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-light-800 dark:text-dark-800">
              {t`Select list to generate changelog from:`}
            </label>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="rounded-lg border border-light-300 bg-light-50 px-3 py-2 text-xs font-medium text-neutral-900 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-1000"
            >
              {lists.map((l) => (
                <option key={l.publicId} value={l.publicId}>
                  {l.name} ({l.cards?.length ?? 0} cards)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-light-800 dark:text-dark-800">
              {t`Generated Markdown Preview:`}
            </label>
            <pre className="max-h-80 overflow-y-auto rounded-lg border border-light-300 bg-light-100 p-4 font-mono text-xs text-neutral-800 dark:border-dark-400 dark:bg-dark-50 dark:text-dark-900 whitespace-pre-wrap">
              {markdownContent}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-light-200 px-6 py-4 dark:border-dark-300">
          <Button variant="secondary" onClick={onClose}>
            {t`Close`}
          </Button>
          <Button variant="secondary" onClick={handleCopy}>
            <span className="flex items-center gap-1.5">
              {copied ? (
                <>
                  <HiCheck className="h-4 w-4 text-emerald-500" />
                  <span>{t`Copied!`}</span>
                </>
              ) : (
                <>
                  <HiOutlineClipboardDocument className="h-4 w-4" />
                  <span>{t`Copy Markdown`}</span>
                </>
              )}
            </span>
          </Button>
          <Button onClick={handleDownload}>
            <span className="flex items-center gap-1.5">
              <HiOutlineArrowDownTray className="h-4 w-4" />
              <span>{t`Download CHANGELOG.md`}</span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
