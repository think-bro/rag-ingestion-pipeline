"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { NewIngestionForm } from "@/components/new-ingestion-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTaskStore } from "@/store/task-store";

export function NewIngestionModal() {
  const { isNewIngestionModalOpen, setNewIngestionModalOpen } = useTaskStore();
  const isMobile = useIsMobile();
  const [formState, setFormState] = useState({
    hasFiles: false,
    isUploading: false,
    isSubmitting: false,
    taskType: "unselected" as "unselected" | "parse" | "chunk" | "embed",
    preset: "unselected" as string,
  });

  const handleClose = () => setNewIngestionModalOpen(false);

  const renderButtonContent = () => {
    if (formState.isUploading) {
      return (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Uploading...
        </>
      );
    }
    if (formState.isSubmitting) {
      return (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Starting...
        </>
      );
    }
    return "Start Ingestion";
  };

  if (isMobile) {
    return (
      <Drawer
        onOpenChange={setNewIngestionModalOpen}
        open={isNewIngestionModalOpen}
      >
        <DrawerContent onInteractOutside={(e) => e.preventDefault()}>
          <DrawerHeader>
            <DrawerTitle>Start a New Ingestion Job</DrawerTitle>
            <DrawerDescription>
              Upload documents to parse, chunk, and embed them into your
              knowledge base.
            </DrawerDescription>
          </DrawerHeader>
          <div className="no-scrollbar overflow-y-auto p-4">
            <NewIngestionForm
              id="ingestion-form-mobile"
              onStateChange={setFormState}
              onSuccess={handleClose}
            />
          </div>
          <DrawerFooter className="flex-col sm:flex-row-reverse sm:gap-4">
            <Button
              className="w-full sm:flex-1"
              disabled={
                !formState.hasFiles ||
                formState.isUploading ||
                formState.isSubmitting ||
                formState.taskType === "unselected" ||
                (formState.taskType === "chunk" &&
                  formState.preset === "unselected")
              }
              form="ingestion-form-mobile"
              size="lg"
              type="submit"
            >
              {renderButtonContent()}
            </Button>
            <DrawerClose asChild>
              <Button className="w-full sm:flex-1" size="lg" variant="outline">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      onOpenChange={setNewIngestionModalOpen}
      open={isNewIngestionModalOpen}
    >
      <DialogContent
        className="sm:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Start a New Ingestion Job</DialogTitle>
          <DialogDescription>
            Upload documents to parse, chunk, and embed them into your knowledge
            base.
          </DialogDescription>
        </DialogHeader>
        <div className="no-scrollbar -mx-6 max-h-[50vh] overflow-y-auto px-6">
          <NewIngestionForm
            id="ingestion-form-desktop"
            onStateChange={setFormState}
            onSuccess={handleClose}
          />
        </div>
        <DialogFooter className="gap-4 sm:justify-center">
          <Button
            className="flex-1"
            onClick={handleClose}
            size="lg"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={
              !formState.hasFiles ||
              formState.isUploading ||
              formState.isSubmitting ||
              formState.taskType === "unselected" ||
              (formState.taskType === "chunk" &&
                formState.preset === "unselected")
            }
            form="ingestion-form-desktop"
            size="lg"
            type="submit"
          >
            {renderButtonContent()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
