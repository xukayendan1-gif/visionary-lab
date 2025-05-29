"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";

// Content component
function ImageUploadPageContent() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Upload Images" 
      />
      
      <div className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ... existing code ... */}
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function ImageUploadPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-full">
        <PageHeader title="Upload Images" />
        <div className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    }>
      <ImageUploadPageContent />
    </Suspense>
  );
} 