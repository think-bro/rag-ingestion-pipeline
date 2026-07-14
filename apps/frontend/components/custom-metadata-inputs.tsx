import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PresetsResponse } from "@/lib/api";

export function CustomMetadataInputs({
  taskType,
  preset,
  CHUNK_PRESETS,
  isFormPending,
  setCustomMetadata,
}: {
  taskType: "unselected" | "parse" | "chunk";
  preset: string;
  CHUNK_PRESETS?: PresetsResponse;
  isFormPending: boolean;
  setCustomMetadata: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}) {
  if (
    taskType !== "chunk" ||
    preset === "unselected" ||
    !CHUNK_PRESETS?.[preset]
  ) {
    return null;
  }

  const metadata = CHUNK_PRESETS[preset].config_overrides.custom_metadata || {};
  const unspecified = Object.entries(metadata).filter(
    ([_, val]) => val === "Unspecified"
  );

  if (unspecified.length === 0) {
    return null;
  }

  return (
    <div className="col-span-full mt-2 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
      <div className="col-span-full mb-2">
        <h4 className="font-medium text-foreground text-sm">Custom Metadata</h4>
        <p className="text-muted-foreground text-xs">
          Please provide the required metadata for the{" "}
          {CHUNK_PRESETS[preset].name} preset.
        </p>
      </div>
      {unspecified.map(([key]) => (
        <div className="space-y-2" key={key}>
          <Label className="font-medium capitalize" htmlFor={`meta-${key}`}>
            {key.replace(/_/g, " ")}
          </Label>
          <Input
            disabled={isFormPending}
            id={`meta-${key}`}
            onChange={(e) =>
              setCustomMetadata((prev) => ({
                ...prev,
                [key]: e.target.value,
              }))
            }
            placeholder={`Enter ${key.replace(/_/g, " ")}`}
            required
            type="text"
          />
        </div>
      ))}
    </div>
  );
}
