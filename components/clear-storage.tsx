"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function ClearStorage() {
  const queryClient = useQueryClient();

  const clearStorage = () => {
    if (confirm("This will clear all cached Kandel positions. Continue?")) {
      // Clear React Query cache
      queryClient.invalidateQueries({ queryKey: ["kandel-addresses"] });
      queryClient.invalidateQueries({ queryKey: ["kandel-positions"] });
      queryClient.clear();

      // Also try to clear localStorage if possible
      try {
        localStorage.removeItem("kandelPositions");
        localStorage.removeItem("kandels");
      } catch {
        // Ignore localStorage errors
      }
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={clearStorage}
      className="text-muted-foreground"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Clear Cache
    </Button>
  );
}