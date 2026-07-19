import { ItemCard } from "@/components/item-card";
import type { ChunkItem, EmbedItem, IndexItem, PartResponse } from "@/lib/api";

interface TaskItemListProps {
  downloadLabel: string;
  items: (PartResponse | ChunkItem | EmbedItem | IndexItem)[] | undefined;
  itemTermLower: string;
  taskId: string;
  taskType: "parsing" | "chunking" | "embedding" | "indexing";
  total: number;
}

export function TaskItemList({
  taskId,
  taskType,
  items,
  total,
  itemTermLower,
  downloadLabel,
}: TaskItemListProps) {
  const isParsing = taskType === "parsing";
  const isEmbedding = taskType === "embedding";
  const isIndexing = taskType === "indexing";

  return (
    <div className="flex flex-col gap-3">
      {items?.slice(0, isParsing ? 50 : undefined).map((item, idx: number) => {
        if (isParsing) {
          const parseItem = item as PartResponse;
          return (
            <ItemCard
              item={parseItem}
              key={parseItem.part_index}
              taskId={taskId}
              type="parse"
            />
          );
        }
        if (isEmbedding) {
          const embedItem = item as EmbedItem;
          return (
            <ItemCard
              item={embedItem}
              key={embedItem.chunk_id || idx}
              type="embed"
            />
          );
        }
        if (isIndexing) {
          const indexItem = item as IndexItem;
          return (
            <ItemCard
              item={indexItem}
              key={indexItem.chunk_id || idx}
              type="index"
            />
          );
        }
        const chunkItem = item as ChunkItem;
        return (
          <ItemCard
            item={chunkItem}
            key={chunkItem.chunk_id || idx}
            type="chunk"
          />
        );
      })}
      {!isParsing && items && total > 50 && (
        <div className="mt-2 text-center text-muted-foreground text-sm">
          + {total - (items?.length || 0)} more {itemTermLower} not shown.{" "}
          {downloadLabel} to view all.
        </div>
      )}
    </div>
  );
}
