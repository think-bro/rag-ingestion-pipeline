import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmbedOptions } from "@/hooks/use-embedding-tasks";

export function EmbedOptionSelects({
  taskType,
  isFormPending,
  denseModel,
  setDenseModel,
  sparseModel,
  setSparseModel,
  sparseLanguage,
  setSparseLanguage,
}: {
  taskType: "unselected" | "parse" | "chunk" | "embed" | "index";
  isFormPending: boolean;
  denseModel: string;
  setDenseModel: (v: string) => void;
  sparseModel: string;
  setSparseModel: (v: string) => void;
  sparseLanguage: string;
  setSparseLanguage: (v: string) => void;
}) {
  const { data: embedOptions, isLoading: isLoadingEmbedOptions } =
    useEmbedOptions();

  if (taskType !== "embed") {
    return null;
  }

  return (
    <>
      <div className="col-span-full sm:col-span-3">
        <Select
          disabled={isFormPending}
          onValueChange={(v: string) => setDenseModel(v)}
          value={denseModel}
        >
          <SelectTrigger className="w-full" id="dense-model">
            <SelectValue placeholder="Select a Dense Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Dense Models</SelectLabel>
              <SelectItem value="unselected">Select a Dense Model</SelectItem>
              {isLoadingEmbedOptions ? (
                <SelectItem disabled value="loading">
                  Loading...
                </SelectItem>
              ) : (
                (embedOptions?.dense_models || []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-full sm:col-span-3">
        <Select
          disabled={isFormPending}
          onValueChange={(v: string) => setSparseModel(v)}
          value={sparseModel}
        >
          <SelectTrigger className="w-full" id="sparse-model">
            <SelectValue placeholder="Select a Sparse Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sparse Models</SelectLabel>
              <SelectItem value="unselected">Select a Sparse Model</SelectItem>
              {isLoadingEmbedOptions ? (
                <SelectItem disabled value="loading">
                  Loading...
                </SelectItem>
              ) : (
                (embedOptions?.sparse_models || []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-full sm:col-span-3">
        <Select
          disabled={isFormPending}
          onValueChange={(v: string) => setSparseLanguage(v)}
          value={sparseLanguage}
        >
          <SelectTrigger className="w-full" id="sparse-language">
            <SelectValue placeholder="Select a Sparse Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sparse Languages</SelectLabel>
              <SelectItem value="unselected">
                Select a Sparse Language
              </SelectItem>
              {isLoadingEmbedOptions ? (
                <SelectItem disabled value="loading">
                  Loading...
                </SelectItem>
              ) : (
                (embedOptions?.sparse_languages || []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
