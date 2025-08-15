"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, FolderUp, X, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { MediaType, fetchFolders } from "@/services/api";

interface MultiSelectActionBarProps {
  selectedItems: string[];
  mediaType: MediaType;
  onClearSelection: () => void;
  onDeleteSelected: () => Promise<void>;
  onMoveSelected: (folderPath: string) => Promise<void>;
}

export function MultiSelectActionBar({
  selectedItems,
  mediaType,
  onClearSelection,
  onDeleteSelected,
  onMoveSelected,
}: MultiSelectActionBarProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // Handle dropdown open to fetch folders
  const handleDropdownOpen = async (open: boolean) => {
    if (open && folders.length === 0 && !loadingFolders) {
      try {
        setLoadingFolders(true);
        const result = await fetchFolders(mediaType);
        setFolders(result.folders);
      } catch (error) {
        console.error("Failed to fetch folders:", error);
        toast.error("Failed to load folders", {
          description: "Could not retrieve folder list"
        });
      } finally {
        setLoadingFolders(false);
      }
    }
  };

  // Get unique selected items
  const uniqueSelectedItems = Array.from(new Set(selectedItems));

  // Handle delete selected items
  const handleDeleteSelected = async () => {
    if (uniqueSelectedItems.length === 0) return;

    // Confirm deletion
    if (window.confirm(`Are you sure you want to delete ${uniqueSelectedItems.length} selected ${uniqueSelectedItems.length > 1 ? 'items' : 'item'}?`)) {
      try {
        setIsDeleting(true);
        await onDeleteSelected();
        toast.success(`Deleted ${uniqueSelectedItems.length} ${uniqueSelectedItems.length > 1 ? 'items' : 'item'}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error("Error deleting items", {
          description: errorMessage
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Handle move selected items
  const handleMoveSelected = async (folderPath: string) => {
    if (uniqueSelectedItems.length === 0) return;

    try {
      setIsMoving(true);
      await onMoveSelected(folderPath);
      toast.success(`Moved ${uniqueSelectedItems.length} ${uniqueSelectedItems.length > 1 ? 'items' : 'item'} to "${folderPath || 'root'}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Error moving items", {
        description: errorMessage
      });
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-2 flex items-center space-x-2 z-50">
      <div className="px-3 py-1 bg-muted rounded-md text-sm font-medium">
        {Array.from(new Set(selectedItems)).length} selected
      </div>

      <DropdownMenu onOpenChange={handleDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            disabled={isMoving || loadingFolders || selectedItems.length === 0}
          >
            {isMoving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <FolderUp className="h-4 w-4 mr-2" />
                Move To
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {loadingFolders ? (
            <DropdownMenuItem disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading folders...
            </DropdownMenuItem>
          ) : folders.length > 0 ? (
            folders.map((folder) => (
              <DropdownMenuItem
                key={folder}
                onClick={() => handleMoveSelected(folder)}
              >
                {folder || "Root"}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>
              No folders available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button 
        variant="destructive" 
        size="sm"
        onClick={handleDeleteSelected}
        disabled={isDeleting || selectedItems.length === 0}
      >
        {isDeleting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </>
        )}
      </Button>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClearSelection}
      >
        <X className="h-4 w-4 mr-2" />
        Cancel
      </Button>
    </div>
  );
}
