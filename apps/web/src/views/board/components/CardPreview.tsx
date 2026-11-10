import type { BoardCard } from "../types";
import Card from "./Card";

interface CardPreviewProps {
  card: BoardCard;
  cardPrefix: string;
  density?: "detailed" | "compact";
  isFocused?: boolean;
}

export default function CardPreview({
  card,
  cardPrefix,
  density = "detailed",
  isFocused = false,
}: CardPreviewProps) {
  return (
    <Card
      title={card.title}
      ticketNumber={
        card.cardNumber != null ? `${cardPrefix}-${card.cardNumber}` : null
      }
      labels={card.labels}
      members={card.members}
      summary={card.summary}
      checklists={card.checklists ?? []}
      description={card.description ?? null}
      comments={card.comments ?? []}
      attachments={card.attachments}
      dueDate={card.dueDate ?? null}
      priority={card.priority ?? null}
      storyPoints={card.storyPoints ?? null}
      architecture={card.architecture ?? null}
      desktopEnv={card.desktopEnv ?? null}
      isBlocked={card.isBlocked ?? null}
      density={density}
      isFocused={isFocused}
    />
  );
}
