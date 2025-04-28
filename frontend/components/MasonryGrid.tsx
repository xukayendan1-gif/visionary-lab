import React, { ReactNode } from "react";
import { cn } from "@/utils/utils";

interface MasonryGridProps {
  children: ReactNode[];
  columns?: number;
  gap?: number;
  className?: string;
}

/**
 * A masonry grid layout component
 * Distributes children into columns to create a balanced layout
 */
export function MasonryGrid({
  children,
  columns = 3,
  gap = 6,
  className,
}: MasonryGridProps) {
  // If no children, return null
  if (!children.length) return null;

  // Create an array of columns
  const columnWrappers = Array(columns)
    .fill(0)
    .map((_, index) => index);

  // Distribute children into columns in a balanced way
  const distributeChildrenIntoColumns = () => {
    const result = columnWrappers.map(() => [] as ReactNode[]);
    
    // Large items (that would have been col-span-2 in the old layout) 
    // need special handling - assign them to the first column in sequence
    // Other items are distributed to keep columns balanced
    React.Children.toArray(children).forEach((child, index) => {
      // Every 5th item is considered "large" (feature)
      const isFeature = index % 5 === 0;
      
      if (isFeature) {
        // For features, pick the column with the least children
        const shortestColumnIndex = result
          .map((column, i) => ({ length: column.length, index: i }))
          .sort((a, b) => a.length - b.length)[0].index;
        
        result[shortestColumnIndex].push(child);
      } else {
        // For regular items, distribute evenly
        const columnIndex = index % columns;
        result[columnIndex].push(child);
      }
    });
    
    return result;
  };

  const columnsContent = distributeChildrenIntoColumns();

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
      style={{ gap: `${gap * 0.25}rem` }}
    >
      {columnWrappers.map((_, columnIndex) => (
        <div
          key={`column-${columnIndex}`}
          className="flex flex-col"
          style={{ gap: `${gap * 0.25}rem` }}
        >
          {columnsContent[columnIndex]}
        </div>
      ))}
    </div>
  );
} 