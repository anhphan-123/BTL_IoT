export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 100;

export function normalizePageSize(value, fallback = DEFAULT_PAGE_SIZE) {
  const pageSize = Number(value);

  return Number.isInteger(pageSize) &&
    pageSize >= MIN_PAGE_SIZE &&
    pageSize <= MAX_PAGE_SIZE
    ? pageSize
    : fallback;
}

export function getPageNumbers(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const ordered = [...pages]
    .filter((value) => value > 0 && value <= totalPages)
    .sort((a, b) => a - b);
  const result = [];

  ordered.forEach((value, index) => {
    if (index > 0 && value - ordered[index - 1] > 1) {
      result.push(`ellipsis-${value}`);
    }
    result.push(value);
  });

  return result;
}

export function formatTableTime(value) {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})$/
  );

  if (!match) {
    return value || "-";
  }

  const [, year, month, day, time] = match;
  return `${time} ${day}/${month}/${year}`;
}
