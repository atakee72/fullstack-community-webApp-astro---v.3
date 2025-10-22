#!/bin/bash

# Fix imports in components
sed -i "s|from '@/stores/authStore'|from '../stores/authStore'|g" src/components/*.tsx
sed -i "s|from '@/stores/forumStore'|from '../stores/forumStore'|g" src/components/*.tsx
sed -i "s|from '@/types'|from '../types'|g" src/components/*.tsx

# Fix imports in stores
sed -i "s|from '@/types'|from '../types'|g" src/stores/*.ts

# Fix imports in lib
sed -i "s|from '@/types'|from '../types'|g" src/lib/*.ts
sed -i "s|from '@/stores/authStore'|from '../stores/authStore'|g" src/lib/*.ts
sed -i "s|from '@/stores/forumStore'|from '../stores/forumStore'|g" src/lib/*.ts

# Fix imports in API routes
sed -i "s|from '@/lib/mongodb'|from '../../../lib/mongodb'|g" src/pages/api/auth/*.ts
sed -i "s|from '@/types'|from '../../../types'|g" src/pages/api/auth/*.ts
sed -i "s|from '@/lib/auth'|from '../../../lib/auth'|g" src/pages/api/auth/*.ts

sed -i "s|from '@/lib/mongodb'|from '../../../lib/mongodb'|g" src/pages/api/topics/*.ts
sed -i "s|from '@/types'|from '../../../types'|g" src/pages/api/topics/*.ts
sed -i "s|from '@/lib/auth'|from '../../../lib/auth'|g" src/pages/api/topics/*.ts

echo "Import paths fixed!"