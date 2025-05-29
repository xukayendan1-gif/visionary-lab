import { PageHeader } from "@/components/page-header"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { columns } from "./columns"
import { DataTable } from "./data-table"

// Create a mock array of empty video job data for the loading state
const emptyJobs = Array(5).fill({
  id: "",
  status: "",
  prompt: "",
  width: 0,
  height: 0,
  n_seconds: 0,
  created_at: undefined,
  finished_at: undefined,
})

export default function Loading() {
  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title="Video Generation Jobs" />
      
      <div className="flex-1 w-full h-full overflow-y-auto">
        <div className="w-full mx-auto px-10 py-6 pb-16">
          <div className="flex justify-end mb-6">
            <Skeleton className="h-9 w-24" />
          </div>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl">
                    <Skeleton className="h-8 w-16" />
                  </CardTitle>
                  <CardDescription>
                    <Skeleton className="h-4 w-24" />
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Job History</CardTitle>
              <CardDescription>
                View and manage your video generation job history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={emptyJobs}
                isLoading={true} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 