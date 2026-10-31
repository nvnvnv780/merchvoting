export function sortMerch(items, order = 'default') {
  return [...items].sort((a, b) => {
    if (order === 'desc') return b.count - a.count || a.id - b.id;
    if (order === 'asc') return a.count - b.count || a.id - b.id;
    return a.id - b.id;
  });
}
