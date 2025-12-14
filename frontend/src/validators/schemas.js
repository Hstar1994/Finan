import * as yup from 'yup';

// Customer validation schema
export const customerSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  
  email: yup
    .string()
    .required('Email is required')
    .email('Must be a valid email address')
    .trim()
    .lowercase(),
  
  phone: yup
    .string()
    .matches(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
      'Invalid phone number format'
    )
    .nullable(),
  
  address: yup
    .string()
    .max(200, 'Address must be less than 200 characters')
    .nullable(),
  
  creditLimit: yup
    .number()
    .min(0, 'Credit limit cannot be negative')
    .typeError('Must be a valid number')
    .nullable()
    .transform((value, originalValue) => 
      originalValue === '' ? null : value
    ),
  
  taxId: yup
    .string()
    .max(50, 'Tax ID must be less than 50 characters')
    .nullable(),
  
  isActive: yup
    .boolean()
});

// Invoice validation schema
export const invoiceSchema = yup.object({
  customerId: yup
    .string()
    .required('Customer is required')
    .uuid('Invalid customer ID'),
  
  dueDate: yup
    .date()
    .required('Due date is required')
    .min(new Date(), 'Due date must be in the future')
    .typeError('Must be a valid date'),
  
  items: yup
    .array()
    .of(
      yup.object({
        itemId: yup
          .string()
          .required('Item is required')
          .uuid('Invalid item ID'),
        
        quantity: yup
          .number()
          .required('Quantity is required')
          .min(1, 'Quantity must be at least 1')
          .typeError('Must be a valid number'),
        
        unitPrice: yup
          .number()
          .required('Unit price is required')
          .min(0.01, 'Unit price must be greater than 0')
          .typeError('Must be a valid number'),
        
        taxRate: yup
          .number()
          .min(0, 'Tax rate cannot be negative')
          .max(100, 'Tax rate cannot exceed 100%')
          .typeError('Must be a valid number')
          .nullable()
          .transform((value, originalValue) => 
            originalValue === '' ? null : value
          ),
        
        discount: yup
          .number()
          .min(0, 'Discount cannot be negative')
          .max(100, 'Discount cannot exceed 100%')
          .typeError('Must be a valid number')
          .nullable()
          .transform((value, originalValue) => 
            originalValue === '' ? null : value
          )
      })
    )
    .min(1, 'At least one item is required'),
  
  notes: yup
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .nullable()
});

// User validation schema
export const userSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  
  email: yup
    .string()
    .required('Email is required')
    .email('Must be a valid email address')
    .trim()
    .lowercase(),
  
  password: yup
    .string()
    .when('$isEdit', {
      is: false,
      then: (schema) => schema
        .required('Password is required')
        .min(8, 'Password must be at least 8 characters')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain uppercase, lowercase, and number'
        ),
      otherwise: (schema) => schema.nullable()
    }),
  
  confirmPassword: yup
    .string()
    .when('password', {
      is: (password) => password && password.length > 0,
      then: (schema) => schema
        .required('Confirm password is required')
        .oneOf([yup.ref('password')], 'Passwords must match'),
      otherwise: (schema) => schema.nullable()
    }),
  
  role: yup
    .string()
    .required('Role is required')
    .oneOf(['admin', 'manager', 'staff'], 'Invalid role'),
  
  isActive: yup
    .boolean()
});

// Item validation schema
export const itemSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  
  description: yup
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable(),
  
  sku: yup
    .string()
    .required('SKU is required')
    .matches(/^[A-Z0-9-]+$/i, 'SKU can only contain letters, numbers, and hyphens')
    .max(50, 'SKU must be less than 50 characters')
    .trim()
    .uppercase(),
  
  unitPrice: yup
    .number()
    .required('Unit price is required')
    .min(0.01, 'Unit price must be greater than 0')
    .typeError('Must be a valid number'),
  
  taxRate: yup
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .typeError('Must be a valid number')
    .nullable()
    .transform((value, originalValue) => 
      originalValue === '' ? null : value
    ),
  
  isActive: yup
    .boolean()
});

// Quote validation schema
export const quoteSchema = yup.object({
  customerId: yup
    .string()
    .required('Customer is required')
    .uuid('Invalid customer ID'),
  
  validUntil: yup
    .date()
    .required('Valid until date is required')
    .min(new Date(), 'Valid until date must be in the future')
    .typeError('Must be a valid date'),
  
  items: yup
    .array()
    .of(
      yup.object({
        itemId: yup
          .string()
          .required('Item is required')
          .uuid('Invalid item ID'),
        
        quantity: yup
          .number()
          .required('Quantity is required')
          .min(1, 'Quantity must be at least 1')
          .typeError('Must be a valid number'),
        
        unitPrice: yup
          .number()
          .required('Unit price is required')
          .min(0.01, 'Unit price must be greater than 0')
          .typeError('Must be a valid number'),
        
        discount: yup
          .number()
          .min(0, 'Discount cannot be negative')
          .max(100, 'Discount cannot exceed 100%')
          .typeError('Must be a valid number')
          .nullable()
          .transform((value, originalValue) => 
            originalValue === '' ? null : value
          )
      })
    )
    .min(1, 'At least one item is required'),
  
  notes: yup
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .nullable()
});

// Receipt validation schema
export const receiptSchema = yup.object({
  customerId: yup
    .string()
    .required('Customer is required')
    .uuid('Invalid customer ID'),
  
  invoiceId: yup
    .string()
    .uuid('Invalid invoice ID')
    .nullable(),
  
  amount: yup
    .number()
    .required('Amount is required')
    .min(0.01, 'Amount must be greater than 0')
    .typeError('Must be a valid number'),
  
  paymentMethod: yup
    .string()
    .required('Payment method is required')
    .oneOf(['cash', 'check', 'bank_transfer', 'credit_card', 'other'], 'Invalid payment method'),
  
  paymentDate: yup
    .date()
    .required('Payment date is required')
    .max(new Date(), 'Payment date cannot be in the future')
    .typeError('Must be a valid date'),
  
  reference: yup
    .string()
    .max(100, 'Reference must be less than 100 characters')
    .nullable(),
  
  notes: yup
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .nullable()
});

// Helper function to validate and get errors
export const validateForm = async (schema, data, context = {}) => {
  try {
    await schema.validate(data, { 
      abortEarly: false,
      context 
    });
    return { valid: true, errors: {} };
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = {};
      error.inner.forEach((err) => {
        errors[err.path] = err.message;
      });
      return { valid: false, errors };
    }
    throw error;
  }
};
