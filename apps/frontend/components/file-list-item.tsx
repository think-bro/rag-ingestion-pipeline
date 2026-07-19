import { FileText, Loader2, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UploadItem } from "@/hooks/use-upload-items";
import { formatBytes } from "@/lib/utils";

interface FileListItemProps {
  isFormPending: boolean;
  item: UploadItem;
  removeFile: (id: string) => void;
}

export function FileListItem({
  item,
  isFormPending,
  removeFile,
}: FileListItemProps) {
  return (
    <li className="relative">
      <div className="relative rounded-xl border border-border p-4 shadow-none">
        <div className="absolute top-1/2 right-4 -translate-y-1/2">
          <Button
            aria-label="Remove file"
            disabled={isFormPending}
            onClick={() => removeFile(item.id)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash aria-hidden={true} className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center space-x-3 p-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText aria-hidden={true} className="h-5 w-5 text-foreground" />
          </span>
          <div>
            <p className="text-pretty font-medium text-foreground">
              {item.file.name}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-pretty text-muted-foreground text-sm">
              <span>{formatBytes(item.file.size)}</span>
              {item.status === "uploading" && (
                <>
                  <span>&bull;</span>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Uploading...</span>
                </>
              )}
              {item.status === "success" &&
                item.uploadResponse?.page_count !== null &&
                item.uploadResponse?.page_count !== undefined && (
                  <>
                    <span>&bull;</span>
                    <span>{item.uploadResponse.page_count} pages</span>
                  </>
                )}
              {item.status === "error" && (
                <>
                  <span>&bull;</span>
                  <span className="text-destructive">Upload failed</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}
