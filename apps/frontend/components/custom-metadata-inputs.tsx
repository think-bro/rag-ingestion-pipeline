import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PresetsResponse } from "@/lib/api";

export function CustomMetadataInputs({
  taskType,
  preset,
  CHUNK_PRESETS,
  isFormPending,
  setCustomMetadata,
}: {
  taskType: "unselected" | "parse" | "chunk" | "embed";
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
  const metadataOptions = CHUNK_PRESETS[preset].metadata_options || {};
  const unspecified = Object.entries(metadata).filter(
    ([_, val]) => val === "Unspecified"
  );

  if (unspecified.length === 0) {
    return null;
  }

  return (
    <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2">
      {unspecified.map(([key]) => {
        const options = metadataOptions[key] || [];
        const labelText = key.replace(/_/g, " ");
        const capitalizedLabel =
          labelText.charAt(0).toUpperCase() + labelText.slice(1);

        return (
          <Select
            disabled={isFormPending}
            key={key}
            onValueChange={(v) =>
              setCustomMetadata((prev) => ({ ...prev, [key]: v }))
            }
            required
          >
            <SelectTrigger className="w-full" id={`meta-${key}`}>
              <SelectValue placeholder={`Select a ${capitalizedLabel}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="capitalize">{labelText}s</SelectLabel>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        );
      })}
    </div>
  );
}
