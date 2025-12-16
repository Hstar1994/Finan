import { useState } from 'react';

/**
 * Custom hook for form validation using yup schemas
 * @param {Object} schema - Yup validation schema
 * @param {Object} initialValues - Initial form values
 * @returns {Object} Form state and validation methods
 */
export const useFormValidation = (schema, initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Handle input blur
  const handleBlur = async (e) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate single field
    try {
      await schema.validateAt(name, values);
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [name]: error.message
      }));
    }
  };

  // Validate entire form
  const validate = async (context = {}) => {
    try {
      await schema.validate(values, { 
        abortEarly: false,
        context 
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const newErrors = {};
        error.inner.forEach((err) => {
          newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
        return false;
      }
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = (onSubmit, context = {}) => async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Mark all fields as touched
    const allTouched = {};
    Object.keys(values).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    // Validate form
    const isValid = await validate(context);

    if (isValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }

    setIsSubmitting(false);
  };

  // Reset form
  const resetForm = (newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  };

  // Set form values
  const setFormValues = (newValues) => {
    setValues(prev => ({
      ...prev,
      ...newValues
    }));
  };

  // Set single field value
  const setFieldValue = (name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Set field error
  const setFieldError = (name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    resetForm,
    setFormValues,
    setFieldValue,
    setFieldError
  };
};
