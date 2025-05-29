"use client"

import { Check, X, RefreshCw, Clock, ArrowUpDown } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VideoJob } from "@/types/jobs"

// Helper function to format timestamps from the API (which are in seconds)
function formatApiTimestamp(timestamp?: number): string {
  if (!timestamp) return "N/A"
  
  // Convert seconds to milliseconds for JavaScript Date
  const date = new Date(timestamp * 1000)
  
  // Format date: YYYY-MM-DD HH:MM
  return date.toLocaleString()
}

export const columns: ColumnDef<VideoJob>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div className="max-w-[100px] truncate">{row.getValue("id")}</div>,
    enableSorting: false,
  },
  {
    accessorKey: "prompt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Prompt
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="max-w-[500px] truncate font-medium">
          {row.getValue("prompt")}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string

      return (
        <div className="flex items-center">
          {(status === "pending" || status === "queued") && <Clock className="mr-2 h-4 w-4 text-muted-foreground" />}
          {(status === "in_progress" || status === "processing" || status === "preprocessing") && <RefreshCw className="mr-2 h-4 w-4 text-blue-500 animate-spin" />}
          {(status === "succeeded" || status === "completed") && <Check className="mr-2 h-4 w-4 text-green-500" />}
          {status === "failed" && <X className="mr-2 h-4 w-4 text-red-500" />}
          <Badge
            variant={
              (status === "pending" || status === "queued")
                ? "outline"
                : (status === "in_progress" || status === "processing" || status === "preprocessing")
                ? "secondary"
                : (status === "succeeded" || status === "completed")
                ? "success"
                : "destructive"
            }
          >
            {(status === "pending" || status === "queued") && "Pending"}
            {(status === "in_progress" || status === "processing" || status === "preprocessing") && "In Progress"}
            {(status === "succeeded" || status === "completed") && "Completed"}
            {status === "failed" && "Failed"}
            {!["pending", "queued", "in_progress", "processing", "preprocessing", "succeeded", "completed", "failed"].includes(status) && status}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const timestamp = row.getValue("createdAt") as number
      return <div>{formatApiTimestamp(timestamp)}</div>
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const timestamp = row.getValue("updatedAt") as number
      return <div>{formatApiTimestamp(timestamp)}</div>
    },
  },
] 