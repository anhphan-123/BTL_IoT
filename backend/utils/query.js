function normalizeTimeSearch(value) {
  const search = String(value || "").trim();
  const match = search.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/);

  if (!match) {
    return search;
  }

  const [, day, month, year, rest] = match;
  return `${year}-${month}-${day}${rest}`;
}

function parseSortOrder(value) {
  return String(value || "DESC").toUpperCase() === "ASC"
    ? "ASC"
    : "DESC";
}

module.exports = {
  normalizeTimeSearch,
  parseSortOrder,
};
