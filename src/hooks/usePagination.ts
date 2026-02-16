import { useState, useMemo } from "react";

const ITEMS_PER_PAGE = 9;

export function usePagination<T>(items: T[] | undefined | null, perPage = ITEMS_PER_PAGE) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => {
    if (!items || items.length === 0) return 1;
    return Math.ceil(items.length / perPage);
  }, [items, perPage]);

  const paginatedItems = useMemo(() => {
    if (!items) return [];
    const start = (currentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, currentPage, perPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const resetPage = () => setCurrentPage(1);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    resetPage,
    totalItems: items?.length ?? 0,
  };
}
