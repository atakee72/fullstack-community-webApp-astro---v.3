import { useState, useCallback } from 'react';
import { z } from 'zod';

interface UseZodFormOptions<T> {
  schema: z.ZodSchema<T>;
  initialValues?: Partial<T>;
  onSubmit: (data: T) => void | Promise<void>;
}

interface FieldError {
  [key: string]: string | undefined;
}

export function useZodForm<T extends Record<string, any>>({
  schema,
  initialValues = {},
  onSubmit
}: UseZodFormOptions<T>) {
  const [values, setValues] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<FieldError>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Handle field change
  const handleChange = useCallback((name: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;

    setValues(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle field blur (for touched state)
  const handleBlur = useCallback((name: keyof T) => () => {
    setTouched(prev => new Set(prev).add(name as string));

    // Validate single field on blur
    try {
      const fieldSchema = schema.pick({ [name]: true } as any);
      fieldSchema.parse({ [name]: values[name] });

      // Clear error if validation passes
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => err.path[0] === name);
        if (fieldError) {
          setErrors(prev => ({
            ...prev,
            [name as string]: fieldError.message
          }));
        }
      }
    }
  }, [schema, values]);

  // Validate all fields
  const validate = useCallback((): boolean => {
    try {
      schema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FieldError = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [schema, values]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Mark all fields as touched
    const allFields = Object.keys(values);
    setTouched(new Set(allFields));

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values as T);
      // Reset form on successful submission
      setValues(initialValues);
      setErrors({});
      setTouched(new Set());
    } catch (error) {
      console.error('Form submission error:', error);
      // Handle submission errors if needed
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit, initialValues]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched(new Set());
  }, [initialValues]);

  // Set field value programmatically
  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Set field error programmatically
  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({
      ...prev,
      [name as string]: error
    }));
  }, []);

  // Get field props (for easy input binding)
  const getFieldProps = useCallback((name: keyof T) => ({
    name: name as string,
    value: values[name] || '',
    onChange: handleChange(name),
    onBlur: handleBlur(name),
    'aria-invalid': !!errors[name as string] && touched.has(name as string),
    'aria-describedby': errors[name as string] ? `${name}-error` : undefined
  }), [values, errors, touched, handleChange, handleBlur]);

  // Check if field has error and is touched
  const getFieldError = useCallback((name: keyof T): string | undefined => {
    return touched.has(name as string) ? errors[name as string] : undefined;
  }, [errors, touched]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    getFieldProps,
    getFieldError,
    isValid: Object.keys(errors).length === 0,
    isDirty: Object.keys(values).length > 0
  };
}