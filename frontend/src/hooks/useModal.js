import { useState, useCallback } from 'react';

/**
 * Custom hook for managing modal state
 * @returns {Object} Modal state and methods
 */
export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);

  const openModal = useCallback((modalData = null) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Delay clearing data until after close animation
    setTimeout(() => {
      setData(null);
    }, 200);
  }, []);

  const toggleModal = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    data,
    openModal,
    closeModal,
    toggleModal
  };
};
