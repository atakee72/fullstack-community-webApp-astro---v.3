import { z } from 'zod';

// Environment Variables Schema
export const EnvSchema = z.object({
  // Required environment variables
  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),

  MONGODB_URI: z.string()
    .url('Invalid MongoDB URI')
    .refine(
      (uri) => uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'),
      'MongoDB URI must start with mongodb:// or mongodb+srv://'
    ),

  // Optional with defaults
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Cloudinary configuration (optional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // CORS configuration
  CORS_ORIGIN: z.string().url().optional().default('http://localhost:3000'),

  // Session configuration
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_MAX_AGE: z.coerce.number().default(86400000), // 24 hours in milliseconds

  // Email configuration (optional, for future features)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // Public URLs
  PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:3000/api')
});

// Parse and validate environment variables
export const parseEnv = () => {
  try {
    // For Astro, we need to access import.meta.env
    const env = {
      JWT_SECRET: import.meta.env.JWT_SECRET,
      MONGODB_URI: import.meta.env.MONGODB_URI || import.meta.env.PUBLIC_MONGODB_URI,
      PORT: import.meta.env.PORT,
      NODE_ENV: import.meta.env.MODE || import.meta.env.NODE_ENV,
      CLOUDINARY_CLOUD_NAME: import.meta.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: import.meta.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: import.meta.env.CLOUDINARY_API_SECRET,
      CORS_ORIGIN: import.meta.env.CORS_ORIGIN,
      SESSION_SECRET: import.meta.env.SESSION_SECRET,
      SESSION_MAX_AGE: import.meta.env.SESSION_MAX_AGE,
      SMTP_HOST: import.meta.env.SMTP_HOST,
      SMTP_PORT: import.meta.env.SMTP_PORT,
      SMTP_USER: import.meta.env.SMTP_USER,
      SMTP_PASS: import.meta.env.SMTP_PASS,
      EMAIL_FROM: import.meta.env.EMAIL_FROM,
      PUBLIC_APP_URL: import.meta.env.PUBLIC_APP_URL,
      PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL
    };

    return EnvSchema.parse(env);
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
};

// Export validated environment variables
export type Env = z.infer<typeof EnvSchema>;

// Helper to check if all Cloudinary vars are present
export const hasCloudinaryConfig = (env: Env): boolean => {
  return !!(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
};

// Helper to check if email/SMTP is configured
export const hasEmailConfig = (env: Env): boolean => {
  return !!(
    env.SMTP_HOST &&
    env.SMTP_PORT &&
    env.SMTP_USER &&
    env.SMTP_PASS &&
    env.EMAIL_FROM
  );
};