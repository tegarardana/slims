export function getPaginationParams(searchParams: URLSearchParams, maxPageSize = 100) {
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit') || searchParams.get('pageSize');
  
  let page = parseInt(pageParam || '1', 10);
  let limit = parseInt(limitParam || '10', 10);
  
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;
  if (limit > maxPageSize) limit = maxPageSize;
  
  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}

export function validateSortBy(
  sortBy: string | null,
  allowedFields: string[],
  defaultField = 'createdAt'
): string {
  if (!sortBy) return defaultField;
  return allowedFields.includes(sortBy) ? sortBy : defaultField;
}
