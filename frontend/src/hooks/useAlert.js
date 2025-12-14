import { useState, useCallback } from 'react';

/**
 * Custom hook for managing alert/notification state
 * @returns {Object} Alert state and methods
 */
export const useAlert = () => {
  const [alert, setAlert] = useState({
    show: false,
    type: '', // 'success', 'error', 'warning', 'info'
    message: ''
  });

  const showAlert = useCallback((type, message, duration = 5000) => {
    setAlert({ show: true, type, message });

    if (duration > 0) {
      setTimeout(() => {
        hideAlert();
      }, duration);
    }
  }, []);

  const hideAlert = useCallback(() => {
    setAlert({ show: false, type: '', message: '' });
  }, []);

  const showSuccess = useCallback((message, duration) => {
    showAlert('success', message, duration);
  }, [showAlert]);

  const showError = useCallback((message, duration) => {
    showAlert('error', message, duration);
  }, [showAlert]);

  const showWarning = useCallback((message, duration) => {
    showAlert('warning', message, duration);
  }, [showAlert]);

  const showInfo = useCallback((message, duration) => {
    showAlert('info', message, duration);
  }, [showAlert]);

  return {
    alert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};
