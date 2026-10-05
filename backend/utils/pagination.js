const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function parsePage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseLimit(value, fallback = DEFAULT_PAGE_SIZE) {
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_PAGE_SIZE
    ? limit
    : fallback;
}

function getPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

module.exports = {
  parsePage,
  parseLimit,
  getPagination,
};
