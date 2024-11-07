export type SortDirection = 'asc' | 'desc';

export const sortResources = <T extends { fileName: string; size?: number; dateAdded?: number; duration?: number }>(
  resources: T[],
  sortBy: string,
  direction: SortDirection
): T[] => {
  return [...resources].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "fileName":
        comparison = a.fileName.localeCompare(b.fileName);
        break;
      case "duration":
        comparison = ((a.duration || 0) - (b.duration || 0));
        break;
      case "size":
        comparison = ((a.size || 0) - (b.size || 0));
        break;
      case "dateAdded":
        comparison = ((a.dateAdded || 0) - (b.dateAdded || 0));
        break;
    }
    return direction === 'asc' ? comparison : -comparison;
  });
}; 