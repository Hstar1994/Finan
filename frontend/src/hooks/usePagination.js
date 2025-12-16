import { useState } from 'react';

/**
 * Custom hook for managing pagination state
 * @param {number} initialPage - Initial page number (default: 1)
 * @param {number} initialLimit - Initial items per page (default: 10)
 * @returns {Object} Pagination state and methods
 */
export const usePagination = (initialPage = 1, initialLimit = 10) => {
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 1
  });

  const setPage = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const setLimit = (limit) => {
    setPagination(prev => ({ ...prev, limit, page: 1 })); // Reset to page 1 when changing limit
  };

  const setPaginationData = (data) => {
    setPagination(prev => ({
      ...prev,
      total: data.total || 0,
      totalPages: data.totalPages || 1
    }));
  };

  const nextPage = () => {
    setPagination(prev => ({
      ...prev,
      page: Math.min(prev.page + 1, prev.totalPages)
    }));
  };

  const prevPage = () => {
    setPagination(prev => ({
      ...prev,
      page: Math.max(prev.page - 1, 1)
    }));
  };

  const goToPage = (page) => {
    setPagination(prev => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages))
    }));
  };

  const resetPagination = () => {
    setPagination({
      page: initialPage,
      limit: initialLimit,
      total: 0,
      totalPages: 1
    });
  };

  return {
    pagination,
    setPage,
    setLimit,
    setPaginationData,
    nextPage,
    prevPage,
    goToPage,
    resetPagination,
    hasNextPage: pagination.page < pagination.totalPages,
    hasPrevPage: pagination.page > 1
  };
};
