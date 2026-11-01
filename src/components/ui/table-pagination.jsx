"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PAGE_SIZE_OPTIONS = [25, 50, 70, 100];
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Client-side pagination for dense registrar/teacher tables.
 * Pass the already-filtered row array so page counts match what users see.
 */
export function usePagedRows(rows, defaultPageSize = DEFAULT_PAGE_SIZE) {
  const list = Array.isArray(rows) ? rows : [];
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), totalPages));
  }, [totalPages, total]);

  function changePageSize(next) {
    const size = Number(next);
    setPageSize(PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE);
    setPage(1);
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = useMemo(
    () => list.slice(start, end),
    [list, start, end]
  );

  return {
    pageRows,
    page,
    setPage,
    pageSize,
    changePageSize,
    total,
    totalPages,
    start,
    end,
  };
}

export function TablePaginationBar({
  page,
  setPage,
  pageSize,
  changePageSize,
  total,
  totalPages,
  start,
  end,
  className = "",
}) {
  if (total === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-[#800000]/10 bg-[#faf7f5]/70 px-4 py-3 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <label className="inline-flex items-center gap-2">
          <span>Rows per page</span>
          <select
            className="h-8 rounded-md border border-input bg-white px-2 text-sm text-foreground"
            value={pageSize}
            onChange={(e) => changePageSize(e.target.value)}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="tabular-nums">
          Showing {start + 1}–{end} of {total}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
          Prev
        </Button>
        <span className="min-w-[5.5rem] text-center text-xs tabular-nums text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
