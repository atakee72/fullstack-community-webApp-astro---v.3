# Better Auth Migration Guide

## ✅ What's Been Completed

1. **Core Better Auth Setup**
   - Created `/src/auth.ts` - Central Better Auth configuration with MongoDB adapter
   - Created `/src/pages/api/auth/[...all].ts` - API catch-all route
   - Created `/src/middleware.ts` - Session management middleware
   - Updated `/src/env.d.ts` - TypeScript type definitions

2. **Client-Side Integration**
   - Created `/src/lib/auth-client.ts` - Better Auth React client
   - Created `/src/stores/authStore.better-auth.ts` - Updated auth store
   - Created `/src/components/LoginForm.better-auth.tsx` - Updated login form
   - Created `/src/components/RegisterForm.better-auth.tsx` - Updated register form

3. **Migration Tools**
   - Created `/scripts/migrate-users.ts` - User migration script
   - Updated `.env.example` with Better Auth configuration

## 📦 Next Steps

### 1. Install Required Packages
```bash
# Install Better Auth (includes all adapters and client libraries)
pnpm add better-auth@latest

# Install CLI tool as dev dependency
pnpm add -D @better-auth/cli@latest

# Install dependencies for migration script
pnpm add -D dotenv tsx
```

### 2. Configure Environment Variables
Create or update your `.env` file:
```env
# Generate a secure secret: openssl rand -base64 32
BETTER_AUTH_SECRET=your-32-character-secret-here

# Keep your existing MongoDB and JWT configs
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-existing-jwt-secret

# Optional: Social OAuth (when ready)
# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 3. Run Database Migration
```bash
# Option 1: Use Better Auth CLI to create tables
npx @better-auth/cli migrate

# Option 2: Run the user migration script
npx tsx scripts/migrate-users.ts
```

### 4. Update Your Components

Replace the old auth imports in your components:

```typescript
// Old import
import { useAuthStore } from '../stores/authStore';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

// New import
import { useAuthStore } from '../stores/authStore.better-auth';
import LoginForm from '../components/LoginForm.better-auth';
import RegisterForm from '../components/RegisterForm.better-auth';
```

### 5. Test Authentication Flows

1. **Test Registration**:
   - Navigate to `/register`
   - Create a new account
   - Verify session is created
   - Check MongoDB for new user in `user` and `account` collections

2. **Test Login**:
   - Navigate to `/login`
   - Login with existing credentials
   - Verify session persistence
   - Check protected routes work

3. **Test Existing Users**:
   - Run migration script: `npx tsx scripts/migrate-users.ts`
   - Login with an existing user account
   - Verify bcrypt passwords still work

## 🔄 Migration Checklist

- [ ] Install all required packages
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Update component imports to use `.better-auth` versions
- [ ] Test new user registration
- [ ] Test existing user login
- [ ] Test logout functionality
- [ ] Test protected routes
- [ ] Verify session persistence
- [ ] Test password reset flow (if enabled)

## 🚀 Advanced Features (Future)

Once basic auth is working, you can enable:

1. **Social Login**: Uncomment providers in `/src/auth.ts`
2. **Email Verification**: Set `requireEmailVerification: true`
3. **Two-Factor Auth**: Add the 2FA plugin
4. **Rate Limiting**: Add rate limiting plugin
5. **Admin Roles**: Add organization/roles plugin

## 🔍 Troubleshooting

### Registration JSON Error Fixed
Better Auth handles response formatting automatically, fixing the previous JSON parsing error.

### Sessions Not Persisting
- Check `BETTER_AUTH_SECRET` is set correctly
- Verify MongoDB connection is working
- Check browser cookies for `mahalle-session`

### Migration Script Errors
- Ensure MongoDB URI is correct
- Check that Better Auth tables exist (run `npx @better-auth/cli migrate` first)
- Verify existing users have valid email addresses

## 🗑️ Cleanup (After Successful Migration)

Once everything is working:

1. Remove old auth files:
   - `/src/pages/api/auth/login.ts`
   - `/src/pages/api/auth/register.ts`
   - `/src/pages/api/auth/me.ts`
   - `/src/pages/api/auth/profile.ts`

2. Remove old components:
   - `/src/components/LoginForm.tsx` (replaced by `.better-auth.tsx`)
   - `/src/components/RegisterForm.tsx` (replaced by `.better-auth.tsx`)
   - `/src/stores/authStore.ts` (replaced by `.better-auth.ts`)

3. Remove old dependencies:
   ```bash
   pnpm remove jsonwebtoken @types/jsonwebtoken
   ```

4. Update all imports to use the new auth system

## 📚 Resources

- [Better Auth Documentation](https://better-auth.com)
- [Better Auth MongoDB Adapter](https://better-auth.com/docs/adapters/mongodb)
- [Better Auth Astro Integration](https://better-auth.com/docs/integrations/astro)