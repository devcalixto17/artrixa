import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ currentPage, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border">
        {currentPage > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {visiblePages.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "ghost"}
            size="icon"
            className={`h-9 w-9 text-sm font-bold ${
              page === currentPage
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-muted"
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        {currentPage < totalPages && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onPageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {currentPage < totalPages - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => onPageChange(totalPages)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
