import React from 'react';
import { api } from '@/lib/api';
import type { ServiceCategory } from '@/lib/types';

// Module-level cache — categories rarely change, no need to re-fetch per mount
let cached: ServiceCategory[] | null = null;

// GET /catalog/categories
export function useCatalog(): {
  categories: ServiceCategory[];
  isLoading: boolean;
} {
  const [categories, setCategories] = React.useState<ServiceCategory[]>(cached ?? []);
  const [isLoading, setIsLoading] = React.useState(cached === null);

  React.useEffect(() => {
    if (cached !== null) return;
    api.get<ServiceCategory[]>('/catalog/categories')
      .then((data) => {
        cached = data;
        setCategories(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { categories, isLoading };
}
