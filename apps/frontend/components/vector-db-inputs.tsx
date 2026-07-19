import { Input } from "@/components/ui/input";

export function VectorDbInputs({
  taskType,
  vectorDb,
  isFormPending,
  vectorDbUrl,
  setVectorDbUrl,
  vectorDbCollection,
  setVectorDbCollection,
}: {
  taskType: "unselected" | "parse" | "chunk" | "embed" | "index";
  vectorDb: string;
  isFormPending: boolean;
  vectorDbUrl: string;
  setVectorDbUrl: (v: string) => void;
  vectorDbCollection: string;
  setVectorDbCollection: (v: string) => void;
}) {
  if (taskType !== "index" || vectorDb === "unselected") {
    return null;
  }

  return (
    <div className="col-span-full mt-4 grid grid-cols-1 gap-4 sm:mt-0 sm:grid-cols-2">
      <Input
        disabled={isFormPending}
        id="vector-db-url"
        onChange={(e) => setVectorDbUrl(e.target.value)}
        placeholder="Enter a Database URL"
        required
        value={vectorDbUrl}
      />
      <Input
        disabled={isFormPending}
        id="vector-db-collection"
        onChange={(e) => setVectorDbCollection(e.target.value)}
        placeholder="Enter a Collection Name"
        required
        value={vectorDbCollection}
      />
    </div>
  );
}
