# 🎓 ResolveIt Complete Learning Guide

## Table of Contents
- [Part 1: Authentication & Authorization Fundamentals](#part-1-authentication--authorization-fundamentals)
- [Part 2: Next.js Architecture & React Integration](#part-2-nextjs-architecture--react-integration) 
- [Part 3: Backend-Frontend Communication](#part-3-backend-frontend-communication)
- [Part 4: Docker & Database Management](#part-4-docker--database-management)
- [Part 5: Prisma ORM Deep Dive](#part-5-prisma-orm-deep-dive)
- [Part 6: Complete Workflows & Case Registration](#part-6-complete-workflows--case-registration)
- [Part 7: GitHub Actions & Missing Features](#part-7-github-actions--missing-features)

---

# Part 1: Authentication & Authorization Fundamentals

## 🔐 What is Authentication vs Authorization?

### Authentication (Who are you?)
Authentication is the process of verifying the identity of a user. Think of it like showing your ID card at a security checkpoint.

```typescript
// Example: User tries to log in
const loginAttempt = {
  email: "john@example.com",
  password: "mySecretPassword"
}

// System checks: "Is this really John?"
```

### Authorization (What can you do?)
Authorization determines what an authenticated user is allowed to do. Think of it like having different access levels in a building after you've shown your ID.

```typescript
// Example: After John logs in successfully
const userPermissions = {
  canViewCases: true,
  canCreateCases: true,
  canDeleteCases: false,  // Only admins can delete
  canViewAdminPanel: false
}
```

## 🎯 Authentication Flow in ResolveIt

### Step 1: User Registration/Login Process

```mermaid
graph TD
    A[User enters credentials] --> B[Frontend validates input]
    B --> C[Send to /api/auth/login]
    C --> D[Backend verifies credentials]
    D --> E{Valid credentials?}
    E -->|Yes| F[Generate JWT Token]
    E -->|No| G[Return error]
    F --> H[Send token to frontend]
    H --> I[Store token in localStorage]
    I --> J[Redirect to dashboard]
```

### Step 2: JWT Token Structure

A JWT (JSON Web Token) has 3 parts separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJpYXQiOjE2NDE4OTUyMDB9.signature
        HEADER                    .                PAYLOAD                 .SIGNATURE
```

**Header**: Algorithm and token type
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**: User data and claims
```json
{
  "userId": "123",
  "email": "john@example.com",
  "iat": 1641895200,
  "exp": 1641981600
}
```

**Signature**: Ensures token wasn't tampered with

## 🛡️ Setting Up Authentication in ResolveIt

### Creating the Authentication System

Let's examine our current authentication middleware in `/server/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../services/database.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Access token is required" });
      return;
    }

    // 2. Get the actual token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // 3. Verify the token using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    // 4. Check if user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // 5. Attach user to request object for next middleware
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
```

### 🔑 How Authentication Works Step by Step

#### Step 1: User Sends Credentials
```typescript
// Frontend sends POST request to /api/auth/login
const loginData = {
  email: "user@example.com",
  password: "userPassword123"
}

fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(loginData)
})
```

#### Step 2: Backend Validates Credentials
```typescript
// In auth route handler
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // Find user in database
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  // Check if user exists and password is correct
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}
```

#### Step 3: Frontend Stores Token
```typescript
// Frontend receives response and stores token
const response = await fetch('/api/auth/login', { ... });
const data = await response.json();

if (response.ok) {
  // Store token in localStorage
  localStorage.setItem('token', data.token);
  
  // Redirect to dashboard
  window.location.href = '/dashboard';
}
```

#### Step 4: Frontend Sends Token with Requests
```typescript
// For all subsequent requests, include token in header
const token = localStorage.getItem('token');

fetch('/api/cases', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

## 🛡️ Authorization & Protected Routes

### Role-Based Access Control (RBAC)

Our system has different user roles with different permissions:

```typescript
enum UserRole {
  USER = "USER",           // Regular users (complainants/respondents)
  LAWYER = "LAWYER",       // Legal professionals
  RELIGIOUS_SCHOLAR = "RELIGIOUS_SCHOLAR",  // Religious arbitrators
  SOCIETY_MEMBER = "SOCIETY_MEMBER",        // Community representatives  
  ADMIN = "ADMIN"          // System administrators
}
```

### Admin Authorization Middleware

```typescript
/**
 * Middleware to check if user is admin
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Check if user has admin role
    if (req.user.role !== "ADMIN") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    next(); // User is admin, continue to next middleware
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

### Using Middleware in Routes

```typescript
import { authenticate, requireAdmin } from "../middleware/auth.js";

// Public route - no authentication needed
router.post("/register", registerUser);

// Protected route - authentication required
router.get("/profile", authenticate, getUserProfile);

// Admin-only route - authentication + admin role required
router.get("/admin/users", authenticate, requireAdmin, getAllUsers);

// Multiple middleware can be chained
router.delete("/admin/case/:id", authenticate, requireAdmin, deleteCase);
```

## 🔄 Complete Authentication Flow Example

Let's trace through a complete authentication scenario:

### Scenario: User wants to view their cases

```typescript
// 1. Frontend makes request to get cases
const getCases = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/cases', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 401) {
    // Token expired or invalid - redirect to login
    localStorage.removeItem('token');
    window.location.href = '/auth/login';
    return;
  }
  
  const cases = await response.json();
  return cases;
}
```

```typescript
// 2. Backend route handler
router.get('/cases', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // authenticate middleware has already:
    // - Verified token
    // - Attached user to req.user
    
    // Get cases for this specific user
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          { complainantId: req.user!.id },
          { respondentId: req.user!.id }
        ]
      },
      include: {
        complainant: { select: { name: true, email: true } },
        respondent: { select: { name: true, email: true } }
      }
    });
    
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});
```

## 🔐 Security Best Practices Implemented

### 1. JWT Token Security
```typescript
// Token includes expiration
const token = jwt.sign(payload, secret, { expiresIn: '24h' });

// Always verify token on each request
jwt.verify(token, process.env.JWT_SECRET);
```

### 2. Password Hashing
```typescript
import bcrypt from 'bcryptjs';

// Hash password before storing
const hashedPassword = await bcrypt.hash(password, 12);

// Verify password during login
const isValid = await bcrypt.compare(password, user.hashedPassword);
```

### 3. Environment Variables
```bash
# .env file - never commit this!
JWT_SECRET=your-super-secret-key-here-make-it-long-and-random
DATABASE_URL=postgresql://username:password@localhost:5432/resolvelt_db
```

### 4. Input Validation
```typescript
// Always validate input data
const { error, value } = loginSchema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}
```

## 🎯 Key Takeaways for Part 1

1. **Authentication = Identity Verification**: "Who are you?"
2. **Authorization = Permission Checking**: "What can you do?"
3. **JWT Tokens**: Stateless way to maintain user sessions
4. **Middleware Pattern**: Reusable functions that run before route handlers
5. **Role-Based Access**: Different user types have different permissions
6. **Security Layers**: Multiple checks to ensure system security

### Commands You Need to Know for Authentication:

```bash
# Install authentication dependencies
npm install jsonwebtoken bcryptjs
npm install @types/jsonwebtoken @types/bcryptjs --save-dev

# Environment variable setup
echo "JWT_SECRET=your-secret-key" >> .env

# Test authentication endpoints
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

---

## 🚀 Ready for Part 2?

In Part 2, we'll dive deep into:
- Next.js App Router vs Pages Router
- React components integration
- Frontend-backend communication
- State management
- Protected routes on the frontend

**Type "continue" when you're ready for Part 2!**

---

# Part 2: Next.js Architecture & React Integration

## 🏗️ Understanding Next.js: The Modern React Framework

### What is Next.js?
Next.js is a **React-based framework** that adds powerful features on top of React. Think of React as the engine and Next.js as the complete car with all the bells and whistles.

```typescript
// Pure React Component (works in Next.js too!)
function MyComponent() {
  return <div>Hello React!</div>
}

// Next.js adds features like:
// - File-based routing
// - Server-side rendering
// - API routes
// - Built-in CSS support
// - Image optimization
// - And much more!
```

### React + Next.js Relationship

```mermaid
graph TD
    A[React Library] --> B[Component System]
    A --> C[JSX Syntax]
    A --> D[State Management]
    
    E[Next.js Framework] --> A
    E --> F[File-based Routing]
    E --> G[SSR/SSG]
    E --> H[API Routes]
    E --> I[Built-in Optimizations]
    
    B --> J[Your ResolveIt App]
    C --> J
    D --> J
    F --> J
    G --> J
    H --> J
    I --> J
```

## 📁 App Router vs Pages Router: The Evolution

### Pages Router (Legacy - Next.js 12 and earlier)
```
pages/
├── index.js          // Route: /
├── about.js           // Route: /about
├── dashboard.js       // Route: /dashboard
├── api/
│   └── users.js      // API: /api/users
└── case/
    └── [id].js       // Route: /case/123
```

### App Router (Modern - Next.js 13+) ✨ **We're using this!**
```
app/
├── page.tsx           // Route: /
├── layout.tsx         // Root layout
├── dashboard/
│   └── page.tsx      // Route: /dashboard
├── case/
│   └── [id]/
│       └── page.tsx  // Route: /case/123
└── api/
    └── users/
        └── route.ts  // API: /api/users
```

Let's look at our actual ResolveIt App Router structure:

```
src/app/
├── page.tsx                    // Home page (/)
├── layout.tsx                  // Root layout for all pages
├── globals.css                 // Global styles
├── favicon.ico                 // Site icon
├── auth/
│   ├── login/
│   │   └── page.tsx           // Login page (/auth/login)
│   └── register/
│       └── page.tsx           // Register page (/auth/register)
├── dashboard/
│   ├── page.tsx               // User dashboard (/dashboard)
│   └── register-case/
│       └── page.tsx           // Case registration (/dashboard/register-case)
├── case/
│   └── [id]/
│       └── page.tsx           // Dynamic case view (/case/123)
└── admin/
    └── dashboard/
        └── page.tsx           // Admin dashboard (/admin/dashboard)
```

## 🔄 Why App Router is Better (and Why We Use It)

### 1. **Better Performance** - Server Components by Default
```tsx
// In App Router, components are Server Components by default
// This means they render on the server, reducing JavaScript bundle size

// src/app/dashboard/page.tsx
export default async function Dashboard() {
  // This runs on the server!
  const cases = await fetch('http://localhost:3001/api/cases');
  
  return (
    <div>
      <h1>Your Cases</h1>
      {/* Rendered on server, sent as HTML */}
    </div>
  );
}
```

### 2. **Improved Layouts** - Nested Layouts
```tsx
// src/app/layout.tsx - Root layout for ALL pages
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Navigation />  {/* Shows on every page */}
        {children}      {/* Page content goes here */}
        <Footer />      {/* Shows on every page */}
      </body>
    </html>
  );
}

// src/app/dashboard/layout.tsx - Only for dashboard pages
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />     {/* Only shows on dashboard pages */}
      <main className="flex-1">
        {children}    {/* Dashboard page content */}
      </main>
    </div>
  );
}
```

### 3. **Simpler Data Fetching**
```tsx
// Pages Router (Old way) - Complex
export async function getServerSideProps() {
  const res = await fetch('api/cases');
  const cases = await res.json();
  return { props: { cases } };
}

// App Router (New way) - Simple
export default async function Dashboard() {
  const cases = await fetch('api/cases').then(res => res.json());
  return <div>{/* Use cases directly */}</div>;
}
```

## 🧩 How React Components Work in Next.js

### Server Components vs Client Components

```tsx
// SERVER COMPONENT (default in App Router)
// Runs on server, no JavaScript sent to browser
export default function CasesList() {
  // This runs on the server during build/request
  return (
    <div>
      <h2>Cases List</h2>
      {/* Static content, no interactivity */}
    </div>
  );
}

// CLIENT COMPONENT (when you need interactivity)
'use client'; // This directive makes it a Client Component

import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState(''); // State only works in Client Components
  
  const handleSubmit = (e) => {
    // Event handlers only work in Client Components
    e.preventDefault();
    // Handle login logic
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />
    </form>
  );
}
```

## 🗂️ File-Based Routing Explained

### How URLs Map to Files

```
URL Request          →    File Location                →    What Renders
/                    →    src/app/page.tsx            →    Home page
/auth/login          →    src/app/auth/login/page.tsx →    Login page
/dashboard           →    src/app/dashboard/page.tsx   →    Dashboard
/case/123            →    src/app/case/[id]/page.tsx  →    Case #123
/case/456            →    src/app/case/[id]/page.tsx  →    Case #456
```

### Dynamic Routes with Parameters

```tsx
// src/app/case/[id]/page.tsx
interface Props {
  params: { id: string }; // Next.js automatically provides this
}

export default function CasePage({ params }: Props) {
  const caseId = params.id; // "123" if URL is /case/123
  
  return (
    <div>
      <h1>Case #{caseId}</h1>
      {/* Fetch and display case data */}
    </div>
  );
}
```

## 🎨 Component Architecture in ResolveIt

### Our Component Structure Philosophy

```
Components Hierarchy:
├── Layout Components (Structure)
│   ├── RootLayout (app/layout.tsx)
│   ├── Navigation
│   └── Footer
├── Page Components (Routes)
│   ├── HomePage (app/page.tsx)
│   ├── LoginPage (app/auth/login/page.tsx)
│   └── DashboardPage (app/dashboard/page.tsx)
├── Feature Components (Functionality)
│   ├── CaseForm
│   ├── CasesList
│   └── UserProfile
└── UI Components (Reusable)
    ├── Button
    ├── Input
    └── Modal
```

### Example: Login Page Component

Let's examine our actual login page:

```tsx
// src/app/auth/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  // Client Component because we need state and event handlers
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Make API call to backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        router.push('/dashboard'); // Navigate to dashboard
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Login to ResolveIt</h1>
        
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full p-3 mb-4 border rounded"
          required
        />
        
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full p-3 mb-6 border rounded"
          required
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-3 rounded hover:bg-indigo-700"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        <p className="mt-4 text-center">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-indigo-600 hover:underline">
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
}
```

## 🔗 Navigation in Next.js

### The `Link` Component
```tsx
import Link from 'next/link';

// Client-side navigation (no page reload)
<Link href="/dashboard">Go to Dashboard</Link>

// With styling
<Link 
  href="/dashboard" 
  className="bg-blue-500 text-white px-4 py-2 rounded"
>
  Dashboard
</Link>

// Programmatic navigation
import { useRouter } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  
  const handleLogin = async () => {
    // After successful login
    router.push('/dashboard');
  };
}
```

## 📱 Understanding React State in Next.js

### Local Component State
```tsx
'use client';

import { useState } from 'react';

export default function CaseForm() {
  // Local state - only exists in this component
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM'
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form>
      <input 
        value={formData.title}
        onChange={(e) => updateField('title', e.target.value)}
      />
      {/* More form fields */}
    </form>
  );
}
```

### Global State Management
```tsx
// For app-wide state, we could use React Context

// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    // Decode token and set user
    setUser(/* decoded user data */);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// Use in components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## 🛡️ Protected Routes: Frontend + Backend Connection

### How Frontend Protected Routes Connect to Backend Authentication

This is where **Part 1 (Backend Authentication)** and **Part 2 (Frontend Protection)** work together:

```mermaid
graph TD
    A[User visits /dashboard] --> B[ProtectedRoute component runs]
    B --> C[Get token from localStorage]
    C --> D[Send token to backend /api/auth/verify]
    D --> E[Backend authenticate middleware runs]
    E --> F{Token valid?}
    F -->|Yes| G[Return user data]
    F -->|No| H[Return 401 error]
    G --> I[Show dashboard content]
    H --> J[Redirect to login]
```

### Creating a Protected Route Wrapper
```tsx
// components/ProtectedRoute.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/auth/login');
        return;
      }

      try {
        // This calls the backend authenticate middleware from Part 1!
        const response = await fetch('http://localhost:3001/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Check role if required (uses backend role check)
          if (requiredRole && userData.role !== requiredRole) {
            router.push('/dashboard'); // Redirect to dashboard if wrong role
            return;
          }
          
          setIsAuthenticated(true);
        } else {
          // Backend returned 401 - token invalid/expired
          localStorage.removeItem('token');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}
```

### Backend Verification Endpoint
```typescript
// server/src/routes/auth.ts - The endpoint our ProtectedRoute calls
router.get('/verify', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // The authenticate middleware from Part 1 already verified the token
    // and attached user data to req.user
    
    res.json({
      success: true,
      user: {
        id: req.user!.id,
        email: req.user!.email,
        name: req.user!.name,
        role: req.user!.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});
```

### Complete Protection Flow Example
```typescript
// 1. Frontend: User visits protected page
// 2. ProtectedRoute component intercepts
// 3. Sends request to backend with token
// 4. Backend authenticate middleware (from Part 1) verifies token
// 5. Backend returns user data or error
// 6. Frontend shows content or redirects to login

// The same authenticate middleware protects both:
// - API endpoints (Part 1)
// - Route verification (Part 2)
```
```

### Using Protected Routes
```tsx
// src/app/dashboard/page.tsx
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Dashboard</h1>
        {/* Dashboard content only shown to authenticated users */}
      </div>
    </ProtectedRoute>
  );
}

// src/app/admin/dashboard/page.tsx
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div>
        <h1>Admin Dashboard</h1>
        {/* Only admins can see this */}
      </div>
    </ProtectedRoute>
  );
}
```

## 🎯 Key Takeaways for Part 2

1. **Next.js = React + Superpowers**: Next.js builds on React, adding routing, SSR, and more
2. **App Router is Modern**: We use App Router (Next.js 13+) for better performance and DX
3. **File-based Routing**: URL structure matches folder structure
4. **Server vs Client Components**: Server components run on server, client components in browser
5. **React State Management**: Use useState for local state, Context for global state
6. **Protected Routes**: Frontend guards that check authentication before showing content

### Commands You Need to Know for Next.js:

```bash
# Create Next.js app
npx create-next-app@latest resolvelt --typescript --tailwind --app

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check
```

### File naming conventions:
- `page.tsx` - Creates a route
- `layout.tsx` - Shared layout for nested routes
- `loading.tsx` - Loading UI for async components
- `error.tsx` - Error boundaries
- `not-found.tsx` - 404 pages

---

## 🚀 Ready for Part 3?

In Part 3, we'll explore:
- Frontend-Backend Communication Patterns
- API Integration with fetch and error handling
- Real-time updates with WebSockets
- State synchronization between frontend and backend
- Loading states and optimistic updates

**Type "continue" when you're ready for Part 3!**

---

# Part 3: Backend-Frontend Communication

## 🌐 How Frontend and Backend Talk to Each Other

In ResolveIt, we have two separate servers running:
- **Frontend (Next.js)**: Runs on `http://localhost:3000`
- **Backend (Express.js)**: Runs on `http://localhost:3001`

They communicate through HTTP requests (API calls).

### The Communication Architecture

```mermaid
graph LR
    A[Browser] --> B[Next.js Frontend :3000]
    B --> C[Express Backend :3001]
    C --> D[PostgreSQL Database]
    C --> B
    B --> A
    
    E[User clicks button] --> F[Frontend function]
    F --> G[fetch() API call]
    G --> H[Backend route handler]
    H --> I[Database query]
    I --> H
    H --> G
    G --> F
    F --> E
```

## 🔄 API Communication Patterns

### 1. Basic API Call Structure

```typescript
// Frontend makes request to backend
const response = await fetch('http://localhost:3001/api/cases', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Backend handles request
router.get('/cases', authenticate, async (req, res) => {
  const cases = await prisma.case.findMany();
  res.json(cases);
});
```

### 2. Complete Frontend-Backend Flow Example

Let's trace how creating a new case works:

#### Frontend: Case Creation Form
```tsx
// src/app/dashboard/register-case/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterCase() {
  const [formData, setFormData] = useState({
    caseType: '',
    issueDescription: '',
    priority: 'MEDIUM',
    oppositePartyName: '',
    oppositePartyEmail: '',
    oppositePartyPhone: ''
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // 1. Frontend sends data to backend
      const response = await fetch('http://localhost:3001/api/cases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newCase = await response.json();
        router.push(`/case/${newCase.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Case creation failed:', error);
      alert('Failed to create case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Register New Case</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Case Type</label>
        <select
          value={formData.caseType}
          onChange={(e) => setFormData({...formData, caseType: e.target.value})}
          className="w-full p-3 border rounded"
          required
        >
          <option value="">Select case type</option>
          <option value="FAMILY">Family</option>
          <option value="BUSINESS">Business</option>
          <option value="PROPERTY">Property</option>
          <option value="CONTRACT">Contract</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Issue Description</label>
        <textarea
          value={formData.issueDescription}
          onChange={(e) => setFormData({...formData, issueDescription: e.target.value})}
          className="w-full p-3 border rounded"
          rows={4}
          required
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Opposite Party Name</label>
        <input
          type="text"
          value={formData.oppositePartyName}
          onChange={(e) => setFormData({...formData, oppositePartyName: e.target.value})}
          className="w-full p-3 border rounded"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white p-3 rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Creating Case...' : 'Create Case'}
      </button>
    </form>
  );
}
```

#### Backend: Case Creation Handler
```typescript
// server/src/routes/cases.ts
import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../services/database.js';

const router = Router();

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 2. Backend receives data and validates
    const {
      caseType,
      issueDescription,
      priority,
      oppositePartyName,
      oppositePartyEmail,
      oppositePartyPhone
    } = req.body;

    // Validate required fields
    if (!caseType || !issueDescription) {
      return res.status(400).json({ 
        error: 'Case type and issue description are required' 
      });
    }

    // 3. Generate unique case number
    const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 4. Create case in database
    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        caseType: caseType as any,
        issueDescription,
        priority: priority as any || 'MEDIUM',
        status: 'PENDING',
        complainantId: req.user!.id, // From authenticate middleware
        
        // Opposite party details
        oppositePartyName,
        oppositePartyEmail,
        oppositePartyPhone
      },
      include: {
        complainant: {
          select: { name: true, email: true }
        }
      }
    });

    // 5. Create case history entry
    await prisma.caseHistory.create({
      data: {
        caseId: newCase.id,
        action: 'CASE_CREATED',
        description: 'Case was created',
        userId: req.user!.id
      }
    });

    // 6. Send response back to frontend
    res.status(201).json({
      success: true,
      case: newCase,
      message: 'Case created successfully'
    });

  } catch (error) {
    console.error('Case creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error. Please try again.' 
    });
  }
});

export default router;
```

## 📡 Different Types of API Calls in ResolveIt

### 1. GET Requests - Fetching Data
```typescript
// Frontend: Get user's cases
const fetchCases = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3001/api/cases', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const cases = await response.json();
  return cases;
};

// Backend: Return user's cases
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const cases = await prisma.case.findMany({
    where: {
      OR: [
        { complainantId: req.user!.id },
        { respondentId: req.user!.id }
      ]
    },
    include: {
      complainant: { select: { name: true, email: true } },
      respondent: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  res.json(cases);
});
```

### 2. POST Requests - Creating Data
```typescript
// Frontend: Create new user
const registerUser = async (userData) => {
  const response = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  return response.json();
};

// Backend: Handle user registration
router.post('/register', async (req: Request, res: Response) => {
  const { email, phone, name, age, gender, address } = req.body;
  
  const user = await prisma.user.create({
    data: { email, phone, name, age, gender, address }
  });
  
  res.status(201).json({ user, message: 'User created successfully' });
});
```

### 3. PUT/PATCH Requests - Updating Data
```typescript
// Frontend: Update case status
const updateCaseStatus = async (caseId, newStatus) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`http://localhost:3001/api/cases/${caseId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: newStatus })
  });
  
  return response.json();
};

// Backend: Handle case update
router.patch('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const updatedCase = await prisma.case.update({
    where: { id },
    data: { status }
  });
  
  res.json(updatedCase);
});
```

### 4. DELETE Requests - Removing Data
```typescript
// Frontend: Delete case (admin only)
const deleteCase = async (caseId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`http://localhost:3001/api/admin/cases/${caseId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.json();
};

// Backend: Handle case deletion (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  await prisma.case.delete({
    where: { id }
  });
  
  res.json({ message: 'Case deleted successfully' });
});
```

## 🔄 Error Handling & Loading States

### Frontend Error Handling Pattern
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch('http://localhost:3001/api/cases');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    setData(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// In component render
if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
return <div>{/* Render data */}</div>;
```

### Backend Error Handling Pattern
```typescript
router.get('/cases', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      where: { complainantId: req.user!.id }
    });
    
    res.json({
      success: true,
      data: cases,
      count: cases.length
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cases',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});
```

## 🚀 Real-time Communication with WebSockets

For real-time features like notifications, we use WebSockets:

### Backend WebSocket Setup
```typescript
// server/src/services/websocket.ts
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

export function initializeWebSocket(app: any) {
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);
    
    // Join user to their personal notification room
    socket.join(`user:${socket.userId}`);
    
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return { server, io };
}

// Send notification to specific user
export function sendNotification(io: any, userId: string, notification: any) {
  io.to(`user:${userId}`).emit('notification', notification);
}
```

### Frontend WebSocket Usage
```typescript
// hooks/useWebSocket.ts
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:3001', {
      auth: { token }
    });

    newSocket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return { socket, notifications };
}

// In a component
function Dashboard() {
  const { notifications } = useWebSocket();
  
  return (
    <div>
      <h1>Dashboard</h1>
      {notifications.length > 0 && (
        <div className="notifications">
          {notifications.map(notification => (
            <div key={notification.id}>{notification.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 🔄 State Synchronization Patterns

### Optimistic Updates
```typescript
// Update UI immediately, then sync with server
const updateCaseStatus = async (caseId, newStatus) => {
  // 1. Update UI immediately (optimistic)
  setCases(prev => prev.map(c => 
    c.id === caseId ? {...c, status: newStatus} : c
  ));
  
  try {
    // 2. Send request to server
    const response = await fetch(`/api/cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      throw new Error('Update failed');
    }
    
    // 3. Server confirms - UI already updated
  } catch (error) {
    // 4. Revert UI if server update failed
    setCases(prev => prev.map(c => 
      c.id === caseId ? {...c, status: originalStatus} : c
    ));
    alert('Update failed');
  }
};
```

## 🎯 Key Takeaways for Part 3

1. **Separate Servers**: Frontend (3000) and Backend (3001) communicate via HTTP
2. **API Patterns**: GET, POST, PATCH, DELETE for different operations
3. **Authentication Flow**: Token sent with each request, verified by backend
4. **Error Handling**: Both frontend and backend handle errors gracefully
5. **Real-time Features**: WebSockets for instant notifications
6. **State Management**: Keep frontend and backend data synchronized

### Commands for Backend-Frontend Communication:

```bash
# Start both servers
npm run dev          # Frontend on :3000
cd server && npm run dev    # Backend on :3001

# Test API endpoints
curl -X GET http://localhost:3001/api/cases \
  -H "Authorization: Bearer your-token"

# Check WebSocket connection
# Use browser dev tools Network tab > WS
```

---

## 🚀 Ready for Part 4?

In Part 4, we'll dive deep into:
- Docker & Database Management
- PostgreSQL setup and configuration
- pgAdmin interface and usage
- Container orchestration with docker-compose
- Database backup and migration strategies

## 🔍 Deep Dive: Protected Routes Implementation in ResolveIt

Let me show you exactly how protected routes are used in our current project:

### How We Currently Use Protected Routes

Looking at our actual file structure, let's see how protection is implemented:

```tsx
// src/app/dashboard/page.tsx - Our actual dashboard
export default function Dashboard() {
  // ❌ Currently NOT protected!
  // Anyone can access this by typing localhost:3000/dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {/* Dashboard content */}
    </div>
  );
}

// ❌ This is what we SHOULD have:
'use client';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        {/* Dashboard content */}
      </div>
    </ProtectedRoute>
  );
}
```

### Creating the Missing ProtectedRoute Component

Right now, we DON'T have this component. Let's create it:

```tsx
// components/ProtectedRoute.tsx (WE NEED TO CREATE THIS)
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'USER' | 'ADMIN' | 'LAWYER';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      // No token = not logged in
      if (!token) {
        router.push('/auth/login');
        return;
      }

      try {
        // Call our backend to verify the token
        const response = await fetch('http://localhost:3001/api/auth/verify', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.user.role);
          
          // Check if user has required role
          if (requiredRole && userData.user.role !== requiredRole) {
            // Redirect based on role
            if (userData.user.role === 'ADMIN') {
              router.push('/admin/dashboard');
            } else {
              router.push('/dashboard');
            }
            return;
          }
          
          setIsAuthenticated(true);
        } else {
          // Token invalid - remove and redirect
          localStorage.removeItem('token');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('token');
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  // Show loading spinner while checking
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
        <p className="ml-4 text-gray-600">Verifying access...</p>
      </div>
    );
  }

  // Show content only if authenticated
  return isAuthenticated ? <>{children}</> : null;
}
```

### Backend Verification Endpoint (MISSING!)

We also need to create the verification endpoint that our ProtectedRoute calls:

```typescript
// server/src/routes/auth.ts - Add this route
router.get('/verify', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // The authenticate middleware already verified the token
    // and attached user data to req.user
    
    res.json({
      success: true,
      user: {
        id: req.user!.id,
        email: req.user!.email,
        name: req.user!.name,
        role: req.user!.role
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Verification failed' 
    });
  }
});
```

### How to Implement Protected Routes in Each Page

```tsx
// src/app/dashboard/page.tsx
'use client';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

// src/app/admin/dashboard/page.tsx  
'use client';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}

// src/app/case/[id]/page.tsx
'use client';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function CasePage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <CaseDetails caseId={params.id} />
    </ProtectedRoute>
  );
}
```

## 🔌 WebSockets vs Alternatives: The Real-Time Notification Dilemma

### Current State: Do We Have WebSockets? 

**Answer: NO, we don't have WebSockets implemented yet.**

Let me check our current WebSocket implementation:

```typescript
// server/src/services/websocket.ts - Let's see what's actually there
```

### Why We Need Real-Time Notifications

In a dispute resolution system, users need to know immediately when:
- Someone responds to their case
- A mediation session is scheduled
- Case status changes
- New evidence is uploaded
- Messages are received

### Option 1: WebSockets (Real-Time) ✨

```typescript
// What WebSockets give us:
User A uploads evidence → Server processes → Immediately notify User B
                     ↓
              User B sees notification instantly (no page refresh needed)
```

**WebSocket Implementation:**

```typescript
// server/src/services/websocket.ts
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

export function initializeWebSocket(expressApp: any) {
  const server = createServer(expressApp);
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.userId} connected via WebSocket`);
    
    // Join user to their personal room
    socket.join(`user:${socket.userId}`);
    
    // Join case-specific rooms for case participants
    socket.on('joinCase', (caseId) => {
      socket.join(`case:${caseId}`);
      console.log(`User ${socket.userId} joined case ${caseId} room`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User ${socket.userId} disconnected`);
    });
  });

  return { server, io };
}

// Utility functions for sending notifications
export function notifyUser(io: any, userId: string, notification: any) {
  io.to(`user:${userId}`).emit('notification', {
    id: Date.now(),
    message: notification.message,
    type: notification.type,
    timestamp: new Date().toISOString()
  });
}

export function notifyCase(io: any, caseId: string, notification: any) {
  io.to(`case:${caseId}`).emit('caseUpdate', notification);
}
```

**Frontend WebSocket Usage:**

```typescript
// hooks/useWebSocket.ts
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(caseId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to WebSocket server
    const newSocket = io('http://localhost:3001', {
      auth: { token }
    });

    // Handle connection events
    newSocket.on('connect', () => {
      console.log('🔌 Connected to WebSocket');
      setIsConnected(true);
      
      // Join case room if viewing a specific case
      if (caseId) {
        newSocket.emit('joinCase', caseId);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket');
      setIsConnected(false);
    });

    // Handle notifications
    newSocket.on('notification', (notification) => {
      console.log('📢 New notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.message);
      }
    });

    // Handle case updates
    newSocket.on('caseUpdate', (update) => {
      console.log('📋 Case update:', update);
      // Could trigger a refetch of case data
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [caseId]);

  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  return { 
    socket, 
    notifications, 
    isConnected, 
    sendMessage,
    clearNotifications: () => setNotifications([])
  };
}
```

### Option 2: Cron Jobs + Polling (Traditional) 📧

```typescript
// What Cron Jobs + Email give us:
User A uploads evidence → Server processes → Email sent to User B
                     ↓
              User B checks email (not immediate, depends on email checking)
```

**Cron Job Implementation:**

```typescript
// server/src/services/notificationService.ts
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { prisma } from './database.js';

// Email transporter setup
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Check for pending notifications every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('📬 Checking for pending notifications...');
  
  try {
    // Get unprocessed notifications
    const pendingNotifications = await prisma.notification.findMany({
      where: { 
        sent: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        user: { select: { email: true, name: true } }
      }
    });

    for (const notification of pendingNotifications) {
      await sendEmailNotification(notification);
      
      // Mark as sent
      await prisma.notification.update({
        where: { id: notification.id },
        data: { sent: true }
      });
    }
  } catch (error) {
    console.error('❌ Cron job error:', error);
  }
});

async function sendEmailNotification(notification: any) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: notification.user.email,
    subject: `ResolveIt: ${notification.title}`,
    html: `
      <h2>Hello ${notification.user.name},</h2>
      <p>${notification.message}</p>
      <p><a href="${process.env.APP_URL}/dashboard">View in ResolveIt</a></p>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${notification.user.email}`);
}

// Frontend polling for new notifications
export function usePollingNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setNotifications(data);
    };

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    fetchNotifications(); // Initial fetch

    return () => clearInterval(interval);
  }, []);

  return notifications;
}
```

### Comparison: WebSockets vs Cron Jobs + Email

| Feature | WebSockets | Cron Jobs + Email |
|---------|------------|-------------------|
| **Speed** | ⚡ Instant (milliseconds) | 📧 Delayed (5+ minutes) |
| **User Experience** | ✨ Real-time updates | 📱 Requires email checking |
| **Server Resources** | 🔄 Persistent connections | 💾 Lower memory usage |
| **Reliability** | 🌐 Requires stable connection | 📮 Works offline |
| **Implementation** | 🔧 More complex | 🎯 Simpler setup |
| **Scalability** | 📈 Harder to scale | 📊 Easier to scale |

### When to Use What?

**Use WebSockets for:**
- ✅ Instant messaging between parties
- ✅ Real-time case status updates
- ✅ Live mediation sessions
- ✅ Immediate evidence upload notifications

**Use Cron Jobs + Email for:**
- ✅ Daily/weekly case summaries
- ✅ Deadline reminders
- ✅ System maintenance notifications
- ✅ Backup notifications for important events

### Hybrid Approach (Best of Both Worlds) 🚀

```typescript
// When a case update happens:
export async function handleCaseUpdate(caseId: string, update: any) {
  // 1. Immediate WebSocket notification (for online users)
  if (io) {
    notifyCase(io, caseId, {
      type: 'CASE_UPDATE',
      message: 'Your case has been updated',
      data: update
    });
  }

  // 2. Create email notification record (for offline users)
  await prisma.notification.create({
    data: {
      userId: update.userId,
      title: 'Case Update',
      message: `Case ${caseId} has been updated`,
      type: 'CASE_UPDATE',
      sent: false // Will be sent by cron job
    }
  });

  // 3. SMS for urgent notifications (optional)
  if (update.priority === 'URGENT') {
    await sendSMSNotification(update.userId, 'Urgent case update');
  }
}
```

### Implementation Commands

```bash
# For WebSockets
npm install socket.io socket.io-client
npm install @types/socket.io

# For Email notifications  
npm install nodemailer node-cron
npm install @types/nodemailer @types/node-cron

# For SMS (optional)
npm install twilio
```

## 🎯 Summary: What We Actually Have vs What We Need

### Current Status:
- ❌ No WebSocket implementation
- ❌ No ProtectedRoute component
- ❌ No real-time notifications
- ❌ No email notification system
- ✅ Basic authentication middleware
- ✅ JWT token system

### What We Need to Implement:
1. **ProtectedRoute component** - For route protection
2. **WebSocket server** - For real-time features
3. **Email notification service** - For reliable delivery
4. **Notification management system** - To handle both

---

## 🎥 Quick Clarification: WebSockets vs Video Calls

**Great question!** WebSockets and video calls work together but serve different purposes:

### WebSockets for Video Calls - The Signaling Layer 📞

```typescript
// WebSockets handle the "phone call setup" part:
User A wants to video call User B
    ↓
WebSocket: "Hey User B, User A wants to video call you"
    ↓  
WebSocket: "User B accepted the call"
    ↓
WebSocket: "Here are the connection details"
    ↓
WebRTC takes over for actual video/audio transmission
```

**What WebSockets DO in video calls:**
- ✅ **Signaling**: "I want to start a call"
- ✅ **Coordination**: "Accept/Reject call"
- ✅ **Connection Setup**: Exchange network details
- ✅ **Call Control**: "Mute/Unmute", "End call"

**What WebSockets DON'T do:**
- ❌ **Actual Video/Audio Streaming** (too much data!)
- ❌ **Real-time Media** (WebRTC handles this)

### The Complete Video Call Stack:

```typescript
// 1. WebSocket Signaling Server
io.on('connection', (socket) => {
  // Handle call requests
  socket.on('initiateCall', (data) => {
    socket.to(data.targetUserId).emit('incomingCall', {
      from: socket.userId,
      callType: 'video'
    });
  });

  // Handle call responses
  socket.on('acceptCall', (data) => {
    socket.to(data.callerId).emit('callAccepted');
  });

  // Exchange WebRTC connection details
  socket.on('offer', (data) => {
    socket.to(data.targetUserId).emit('offer', data.offer);
  });
});

// 2. WebRTC for actual video/audio
const peerConnection = new RTCPeerConnection();

// Get user's camera/microphone
const stream = await navigator.mediaDevices.getUserMedia({ 
  video: true, 
  audio: true 
});

// Add to peer connection
stream.getTracks().forEach(track => {
  peerConnection.addTrack(track, stream);
});
```

### Why This Matters for ResolveIt:

In our dispute resolution system, we'd use:

**WebSockets for:**
- 📞 "Lawyer wants to start mediation session"
- 📞 "All parties join the session"
- 📞 "Session recording started"
- 📞 "Someone left the session"

**WebRTC for:**
- 🎥 Actual video streaming between participants
- 🎤 Audio transmission
- 📺 Screen sharing (for evidence presentation)

---

# Part 4: Docker & Database Management

## 🐳 What is Docker and Why Do We Use It?

### The Problem Docker Solves

Imagine you're cooking a complex recipe, but:
- Your kitchen is different from the chef's kitchen
- Your ingredients are slightly different versions
- Your oven temperature varies

**Docker is like having a portable kitchen that works exactly the same everywhere.**

### Without Docker (The Old Way) 😰
```bash
Developer A: "It works on my machine!"
Developer B: "I can't get PostgreSQL to install..."
Server Admin: "Which version of Node.js do you need again?"
You: "Why is the database connection failing?"
```

### With Docker (The Modern Way) ✨
```bash
Developer A: "docker-compose up"
Developer B: "docker-compose up" 
Server Admin: "docker-compose up"
You: "docker-compose up"
Everyone: "It works!" 🎉
```

## 🏗️ Docker Architecture in ResolveIt

Let's examine our current Docker setup by looking at our `docker-compose.yml`:

```dockercompose
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    container_name: resolveit-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: resolveit
      POSTGRES_USER: resolveit_user
      POSTGRES_PASSWORD: resolveit_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U resolveit_user -d resolveit"]
      interval: 30s
      timeout: 10s
      retries: 3

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: resolveit-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@resolveit.com
      PGADMIN_DEFAULT_PASSWORD: admin123
      PGADMIN_CONFIG_SERVER_MODE: "False"
    ports:
      - "8080:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      - postgres

volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local

networks:
  default:
    name: resolveit-network
```

### Breaking Down Our Docker Setup

```mermaid
graph TB
    A[docker-compose.yml] --> B[PostgreSQL Container]
    A --> C[pgAdmin Container]
    
    B --> D[Port 5432]
    B --> E[Volume: postgres_data]
    B --> F[Database: resolveit]
    
    C --> G[Port 8080]
    C --> H[Volume: pgadmin_data]
    C --> I[Web Interface]
    
    J[Your Computer] --> D
    J --> G
    
    K[ResolveIt App] --> D
    L[You via Browser] --> G
```

## 🗄️ Understanding PostgreSQL in Our Setup

### What is PostgreSQL?

PostgreSQL is like a super-smart filing cabinet that:
- **Stores** all our data (users, cases, evidence, etc.)
- **Organizes** data in tables with relationships
- **Protects** data with transactions and backups
- **Scales** to handle millions of records

### Our PostgreSQL Configuration Explained

```dockerfile
postgres:
  image: postgres:15-alpine          # ← Uses PostgreSQL version 15 (lightweight Alpine Linux)
  container_name: resolveit-postgres # ← Container name for easy reference
  restart: unless-stopped            # ← Auto-restart if container crashes
  environment:                       # ← Environment variables for setup
    POSTGRES_DB: resolveit          # ← Database name
    POSTGRES_USER: resolveit_user   # ← Database username
    POSTGRES_PASSWORD: resolveit_password # ← Database password
  ports:
    - "5432:5432"                   # ← Map container port 5432 to host port 5432
  volumes:
    - postgres_data:/var/lib/postgresql/data # ← Persistent data storage
    - ./init.sql:/docker-entrypoint-initdb.d/init.sql # ← Initialization script
```

### How Our App Connects to PostgreSQL

```typescript
// This is how our Prisma connects to the database:
// DATABASE_URL=postgresql://resolveit_user:resolveit_password@localhost:5432/resolveit

// Breakdown:
// postgresql://     ← Database type
// resolveit_user    ← Username (from docker-compose.yml)
// resolveit_password ← Password (from docker-compose.yml)  
// localhost:5432    ← Host and port (mapped from container)
// resolveit         ← Database name (from docker-compose.yml)
```

## 🔧 What is pgAdmin and Why Do We Need It?

### pgAdmin: Your Database GUI

Think of pgAdmin as the "Visual Studio Code" for databases. It gives you a graphical interface to:

```mermaid
graph LR
    A[pgAdmin Web Interface] --> B[View Tables]
    A --> C[Run SQL Queries] 
    A --> D[Manage Users]
    A --> E[Backup/Restore]
    A --> F[Monitor Performance]
    A --> G[Import/Export Data]
```

### Our pgAdmin Configuration

```dockerfile
pgadmin:
  image: dpage/pgadmin4:latest       # ← Latest pgAdmin version
  container_name: resolveit-pgadmin  # ← Container name
  restart: unless-stopped            # ← Auto-restart
  environment:
    PGADMIN_DEFAULT_EMAIL: admin@resolveit.com    # ← Login email
    PGADMIN_DEFAULT_PASSWORD: admin123            # ← Login password
    PGADMIN_CONFIG_SERVER_MODE: "False"           # ← Desktop mode (easier for dev)
  ports:
    - "8080:80"                      # ← Access via http://localhost:8080
  volumes:
    - pgadmin_data:/var/lib/pgadmin  # ← Persistent pgAdmin settings
  depends_on:
    - postgres                       # ← Wait for PostgreSQL to start first
```

### How to Use pgAdmin

1. **Access pgAdmin**: Open http://localhost:8080 in your browser
2. **Login**: Use `admin@resolveit.com` / `admin123`
3. **Connect to Database**: Add our PostgreSQL server
4. **Explore Data**: View tables, run queries, manage data

## 🚀 Docker Commands You Need to Know

### Essential Docker Commands

```bash
# Start all services (PostgreSQL + pgAdmin)
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ This deletes all data!)
docker-compose down -v

# View running containers
docker ps

# View logs for specific service
docker-compose logs postgres
docker-compose logs pgadmin

# Restart a specific service
docker-compose restart postgres

# Build and start (if you change docker-compose.yml)
docker-compose up --build

# Remove everything and start fresh
docker-compose down -v && docker-compose up -d
```

### Useful Docker Debugging Commands

```bash
# Enter PostgreSQL container shell
docker exec -it resolveit-postgres bash

# Connect to PostgreSQL directly
docker exec -it resolveit-postgres psql -U resolveit_user -d resolveit

# View container resource usage
docker stats

# Check container health
docker-compose ps

# View detailed container information
docker inspect resolveit-postgres
```

## 🗂️ Database Schema in PostgreSQL

## 🗂️ Database Schema in PostgreSQL

### Our Current Database Structure

Let's look at our Prisma schema to understand our database:

```typescript
// Our main entities in PostgreSQL:

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  phone           String   @unique
  name            String
  age             Int
  gender          Gender
  photoUrl        String?
  isEmailVerified Boolean  @default(false)
  isPhoneVerified Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relationships
  address             Address?
  casesAsComplainant  Case[] @relation("Complainant")
  casesAsRespondent   Case[] @relation("Respondent")
  casesAsWitness      CaseWitness[]
  mediationPanels     MediationPanel[]
  notifications       Notification[]
}

model Case {
  id                   String      @id @default(cuid())
  caseNumber          String      @unique
  caseType            CaseType
  issueDescription    String
  status              CaseStatus  @default(PENDING)
  priority            Priority    @default(MEDIUM)
  
  // Party information
  complainantId       String
  complainant         User        @relation("Complainant", fields: [complainantId], references: [id])
  respondentId        String?
  respondent          User?       @relation("Respondent", fields: [respondentId], references: [id])
  
  // Case details
  evidence            Evidence[]
  witnesses           CaseWitness[]
  mediationPanels     MediationPanel[]
  mediationSessions   MediationSession[]
  caseHistory         CaseHistory[]
  
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
}
```

### Database Relationships Explained

```mermaid
graph TD
    A[User] --> B[Case as Complainant]
    A --> C[Case as Respondent]
    A --> D[CaseWitness]
    A --> E[MediationPanel]
    A --> F[Notifications]
    A --> G[Address]
    
    B --> H[Evidence]
    B --> I[CaseHistory]
    B --> J[MediationSession]
    
    K[Case] --> L[Multiple Evidence files]
    K --> M[Multiple Witnesses]
    K --> N[Mediation Panel]
```

## 🔄 Docker Volume Management

### Understanding Persistent Data

```bash
# Our volumes in docker-compose.yml:
volumes:
  postgres_data:    # ← Stores all database data
    driver: local
  pgadmin_data:     # ← Stores pgAdmin configuration
    driver: local
```

### What happens to your data?

```mermaid
graph TB
    A[Container Stops] --> B{Volume Exists?}
    B -->|Yes| C[Data Preserved ✅]
    B -->|No| D[Data Lost ❌]
    
    E[Container Starts] --> F{Volume Exists?}
    F -->|Yes| G[Data Restored ✅]
    F -->|No| H[Fresh Database ⚠️]
```

### Volume Management Commands

```bash
# List all volumes
docker volume ls

# Inspect our PostgreSQL volume
docker volume inspect resolvelt_postgres_data

# Backup database to file
docker exec resolvelt-postgres pg_dump -U resolveit_user resolvelt > backup.sql

# Restore database from file
docker exec -i resolvelt-postgres psql -U resolveit_user resolvelt < backup.sql

# Remove volumes (⚠️ DANGER: This deletes all data!)
docker-compose down -v

# Copy data from container to host
docker cp resolvelt-postgres:/var/lib/postgresql/data ./postgres-backup
```

## 🔍 pgAdmin Deep Dive

### Setting Up pgAdmin Connection

1. **Start Services**:
```bash
docker-compose up -d
```

2. **Access pgAdmin**:
   - Open: http://localhost:8080
   - Email: `admin@resolveit.com`
   - Password: `admin123`

3. **Add Server Connection**:
```json
{
  "name": "ResolveIt Database",
  "host": "postgres",           // ← Container name (not localhost!)
  "port": 5432,
  "database": "resolvelt", 
  "username": "resolvelt_user",
  "password": "resolvelt_password"
}
```

### Common pgAdmin Tasks

#### 1. View All Tables
```sql
-- See all tables in our database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

#### 2. Check Database Size
```sql
-- Check how much space our database uses
SELECT 
    pg_size_pretty(pg_database_size('resolvelt')) as database_size;
```

#### 3. View User Data
```sql
-- See all users in our system
SELECT id, name, email, age, gender, "createdAt" 
FROM users 
ORDER BY "createdAt" DESC;
```

#### 4. Case Statistics
```sql
-- Get case statistics
SELECT 
    "caseType",
    status,
    COUNT(*) as case_count
FROM "Case"
GROUP BY "caseType", status
ORDER BY case_count DESC;
```

#### 5. Database Performance
```sql
-- Check active connections
SELECT 
    pid,
    usename,
    application_name,
    state,
    query_start,
    query
FROM pg_stat_activity 
WHERE datname = 'resolvelt';
```

## 🛠️ Troubleshooting Docker Issues

### Common Problems & Solutions

#### Problem 1: Port Already in Use
```bash
Error: Port 5432 is already in use

# Solution 1: Find what's using the port
netstat -tulpn | grep 5432

# Solution 2: Stop conflicting service
sudo systemctl stop postgresql

# Solution 3: Change port in docker-compose.yml
ports:
  - "5433:5432"  # Use different host port
```

#### Problem 2: Container Won't Start
```bash
# Check container logs
docker-compose logs postgres

# Common causes:
# - Permission issues
# - Port conflicts
# - Invalid environment variables
# - Corrupted volume data
```

#### Problem 3: Can't Connect to Database
```bash
# Test connection from host
docker exec -it resolvelt-postgres psql -U resolvelt_user -d resolvelt

# If this fails, check:
# 1. Container is running: docker-compose ps
# 2. Port mapping: docker port resolvelt-postgres
# 3. Environment variables: docker inspect resolvelt-postgres
```

#### Problem 4: Data Lost After Restart
```bash
# Check if volumes exist
docker volume ls | grep resolvelt

# If missing, data wasn't persisted
# Make sure docker-compose.yml has volume mapping:
volumes:
  - postgres_data:/var/lib/postgresql/data
```

## 🔧 Advanced Docker Operations

### Custom Database Initialization

Our `init.sql` file runs when the database first starts:

```sql
-- init.sql (in project root)
-- This creates additional database objects if needed

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- You can add more initialization here
```

### Environment-Specific Configurations

```yaml
# docker-compose.dev.yml (for development)
version: "3.8"
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"

# docker-compose.prod.yml (for production)  
version: "3.8"
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PROD_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"  # Only local access
```

### Docker Health Checks

Our PostgreSQL container has health checks:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U resolvelt_user -d resolvelt"]
  interval: 30s      # Check every 30 seconds
  timeout: 10s       # Wait 10 seconds for response
  retries: 3         # Try 3 times before marking unhealthy
```

Check health status:
```bash
# View health status
docker-compose ps

# View health check logs
docker inspect resolvelt-postgres | grep -A 10 Health
```

## 📊 Database Performance Monitoring

### Using pgAdmin for Monitoring

1. **Dashboard**: Real-time server statistics
2. **Query Tool**: Execute and analyze SQL queries
3. **Server Activity**: View active connections and queries
4. **Statistics**: Table and index statistics

### Performance Queries

```sql
-- Slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT 
    indexrelname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 🎯 Key Takeaways for Part 4

1. **Docker Simplifies Setup**: One command (`docker-compose up`) starts everything
2. **Containers vs Volumes**: Containers are temporary, volumes are permanent
3. **PostgreSQL**: Our main database storing all application data
4. **pgAdmin**: Web interface for database management and monitoring
5. **Port Mapping**: Container ports (5432, 80) mapped to host ports (5432, 8080)
6. **Data Persistence**: Volumes ensure data survives container restarts

### Essential Commands Summary:

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs postgres

# Database backup
docker exec resolvelt-postgres pg_dump -U resolvelt_user resolvelt > backup.sql

# Access database directly
docker exec -it resolvelt-postgres psql -U resolvelt_user -d resolvelt

# View running containers
docker ps

# Clean restart (⚠️ Loses data)
docker-compose down -v && docker-compose up -d
```

### Access Points:
- **Database**: `localhost:5432`
- **pgAdmin**: `http://localhost:8080`
- **Connection String**: `postgresql://resolvelt_user:resolvelt_password@localhost:5432/resolvelt`

---

# Part 5: Prisma ORM Deep Dive

## 🗄️ What is Prisma and Why Do We Use It?

### The Problem Prisma Solves

Imagine you're trying to talk to someone who speaks a different language:
- You speak **JavaScript/TypeScript** 
- Your database speaks **SQL**
- You need a translator!

**Prisma is that translator - it's called an ORM (Object Relational Mapping).**

### Without Prisma (Raw SQL) 😰
```sql
-- You have to write complex SQL queries
SELECT u.id, u.name, u.email, 
       COUNT(c.id) as case_count,
       c.caseNumber, c.status, c.createdAt
FROM users u 
LEFT JOIN cases c ON u.id = c.complainantId 
WHERE u.email = $1 
GROUP BY u.id, c.id
ORDER BY c.createdAt DESC;
```

### With Prisma (Type-Safe JavaScript) ✨
```typescript
// You write intuitive JavaScript/TypeScript
const user = await prisma.user.findUnique({
  where: { email: userEmail },
  include: {
    casesAsComplainant: {
      select: {
        id: true,
        caseNumber: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    },
    _count: {
      select: { casesAsComplainant: true }
    }
  }
});
```

## 🏗️ Prisma Architecture in ResolveIt

```mermaid
graph TB
    A[Your TypeScript Code] --> B[Prisma Client]
    B --> C[Prisma Engine]
    C --> D[PostgreSQL Database]
    
    E[schema.prisma] --> F[Prisma Generate]
    F --> B
    
    G[Prisma Migrate] --> H[Database Migrations]
    H --> D
    
    I[Prisma Studio] --> J[Visual Database Editor]
    J --> D
```

### Our Prisma Setup Files

```bash
server/
├── prisma/
│   ├── schema.prisma    # ← Database schema definition
│   ├── seed.ts          # ← Test data for development
│   └── migrations/      # ← Database version history
├── src/
│   └── services/
│       └── database.ts  # ← Prisma client instance
```

## 📋 Understanding Our Schema.prisma

Let's break down our current schema file:

### 1. Configuration Section
```typescript
generator client {
  provider = "prisma-client-js"  // ← Generates TypeScript client
}

datasource db {
  provider = "postgresql"        // ← We're using PostgreSQL
  url      = env("DATABASE_URL") // ← Connection string from .env
}
```

### 2. User Model Deep Dive
```typescript
model User {
  id              String   @id @default(cuid())    // ← Primary key with auto-generated ID
  email           String   @unique                  // ← Unique constraint
  phone           String   @unique                  // ← Another unique field
  name            String                            // ← Required field
  age             Int                               // ← Integer field
  gender          Gender                            // ← Enum field
  isEmailVerified Boolean  @default(false)         // ← Boolean with default
  createdAt       DateTime @default(now())         // ← Auto timestamp
  updatedAt       DateTime @updatedAt              // ← Auto-updated timestamp

  // 🔗 RELATIONSHIPS (This is where Prisma shines!)
  casesAsComplainant Case[] @relation("Complainant")  // ← One user, many cases
  casesAsRespondent  Case[] @relation("Respondent")   // ← Same user can be respondent too
  notifications      Notification[]                  // ← One user, many notifications
  case_witnesses     case_witnesses[]                // ← Many-to-many through join table

  @@map("users")  // ← Maps to "users" table in database
}
```

### 3. Case Model with Complex Relationships
```typescript
model Case {
  id                   String      @id @default(cuid())
  caseNumber          String      @unique
  caseType            CaseType                    // ← Enum: FAMILY, BUSINESS, etc.
  issueDescription    String
  status              CaseStatus  @default(PENDING) // ← Enum with default
  priority            CasePriority @default(MEDIUM)
  
  // 🔗 FOREIGN KEY RELATIONSHIPS
  complainantId       String                      // ← Foreign key to User
  complainant         User        @relation("Complainant", fields: [complainantId], references: [id])
  
  respondentId        String?                     // ← Optional foreign key
  respondent          User?       @relation("Respondent", fields: [respondentId], references: [id])
  
  // 🔗 ONE-TO-MANY RELATIONSHIPS
  evidence            Evidence[]                  // ← One case, many evidence files
  notifications       Notification[]              // ← One case, many notifications
  caseHistory         CaseHistory[]               // ← Audit trail
  
  // 🔗 ONE-TO-ONE RELATIONSHIP
  mediationPanel      MediationPanel?             // ← Optional one-to-one
  
  // 🔗 MANY-TO-MANY RELATIONSHIP
  case_witnesses      case_witnesses[]            // ← Through join table
  
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  @@map("cases")
}
```

### 4. Enums for Type Safety
```typescript
enum CaseType {
  FAMILY      // ← Family disputes
  BUSINESS    // ← Business conflicts  
  CRIMINAL    // ← Criminal matters
  PROPERTY    // ← Property disputes
  CONTRACT    // ← Contract issues
  OTHER       // ← Miscellaneous
}

enum CaseStatus {
  PENDING                // ← Just created
  AWAITING_RESPONSE     // ← Waiting for respondent
  ACCEPTED              // ← Respondent accepted
  WITNESSES_NOMINATED   // ← Witnesses added
  PANEL_CREATED         // ← Mediation panel formed
  MEDIATION_IN_PROGRESS // ← Currently mediating
  RESOLVED              // ← Successfully resolved
  UNRESOLVED            // ← Could not resolve
  CANCELLED             // ← Case cancelled
}
```

## 🔧 Prisma Client Usage Patterns

### 1. Basic CRUD Operations

#### Creating Records
```typescript
// Create a new user
const newUser = await prisma.user.create({
  data: {
    email: "john@example.com",
    name: "John Doe",
    age: 30,
    gender: "MALE",
    phone: "+1234567890"
  }
});

// Create with relations
const newCase = await prisma.case.create({
  data: {
    caseNumber: "RES-2025-001",
    caseType: "CONTRACT",
    issueDescription: "Payment dispute",
    complainant: {
      connect: { id: userId }  // ← Connect to existing user
    },
    evidence: {
      create: [  // ← Create related records
        {
          fileName: "contract.pdf",
          fileType: "DOCUMENT",
          fileSize: 1024,
          fileUrl: "/uploads/contract.pdf",
          originalName: "contract.pdf"
        }
      ]
    }
  }
});
```

#### Reading Records
```typescript
// Find unique record
const user = await prisma.user.findUnique({
  where: { email: "john@example.com" }
});

// Find many with filters
const activeCases = await prisma.case.findMany({
  where: {
    status: {
      in: ["PENDING", "AWAITING_RESPONSE", "ACCEPTED"]
    },
    createdAt: {
      gte: new Date("2025-01-01")  // ← Cases from 2025
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 10  // ← Limit to 10 results
});

// Complex queries with relations
const caseWithDetails = await prisma.case.findUnique({
  where: { id: caseId },
  include: {
    complainant: {
      select: { id: true, name: true, email: true }
    },
    respondent: {
      select: { id: true, name: true, email: true }
    },
    evidence: true,
    case_witnesses: {
      include: {
        users: {
          select: { id: true, name: true, email: true }
        }
      }
    },
    mediationPanel: {
      include: {
        users_mediation_panels_lawyerIdTousers: {
          select: { id: true, name: true, email: true }
        }
      }
    },
    _count: {
      select: {
        evidence: true,
        case_witnesses: true,
        notifications: true
      }
    }
  }
});
```

#### Updating Records
```typescript
// Simple update
const updatedCase = await prisma.case.update({
  where: { id: caseId },
  data: {
    status: "ACCEPTED",
    respondentAccepted: true,
    respondentResponse: "I accept the mediation process",
    respondentResponseAt: new Date()
  }
});

// Update with relations
const caseWithNewEvidence = await prisma.case.update({
  where: { id: caseId },
  data: {
    evidence: {
      create: {
        fileName: "new-evidence.jpg",
        fileType: "IMAGE",
        fileSize: 2048,
        fileUrl: "/uploads/new-evidence.jpg",
        originalName: "new-evidence.jpg"
      }
    },
    caseHistory: {
      create: {
        action: "EVIDENCE_ADDED",
        description: "New evidence file uploaded",
        metadata: {
          fileName: "new-evidence.jpg",
          uploadedBy: userId
        }
      }
    }
  }
});
```

#### Deleting Records
```typescript
// Delete single record
await prisma.evidence.delete({
  where: { id: evidenceId }
});

// Delete many with conditions
await prisma.notification.deleteMany({
  where: {
    isRead: true,
    createdAt: {
      lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)  // ← Older than 30 days
    }
  }
});

// Cascade deletion (automatically deletes related records)
await prisma.case.delete({
  where: { id: caseId }
  // This will automatically delete:
  // - evidence (onDelete: Cascade)
  // - case_witnesses (onDelete: Cascade) 
  // - notifications (onDelete: Cascade)
  // - caseHistory (onDelete: Cascade)
});
```

### 2. Advanced Query Patterns

#### Aggregations and Grouping
```typescript
// Count records
const userStats = await prisma.user.aggregate({
  _count: {
    id: true
  },
  where: {
    isEmailVerified: true
  }
});

// Group by with counting
const casesByStatus = await prisma.case.groupBy({
  by: ['status'],
  _count: {
    id: true
  },
  orderBy: {
    _count: {
      id: 'desc'
    }
  }
});

// Advanced aggregations
const caseStatistics = await prisma.case.aggregate({
  _count: { id: true },
  _min: { createdAt: true },
  _max: { createdAt: true },
  where: {
    status: 'RESOLVED'
  }
});
```

#### Raw SQL for Complex Queries
```typescript
// When Prisma syntax isn't enough, use raw SQL
const complexReport = await prisma.$queryRaw`
  SELECT 
    u.name,
    u.email,
    COUNT(DISTINCT c1.id) as cases_as_complainant,
    COUNT(DISTINCT c2.id) as cases_as_respondent,
    COUNT(DISTINCT cw.id) as cases_as_witness
  FROM users u
  LEFT JOIN cases c1 ON u.id = c1."complainantId"
  LEFT JOIN cases c2 ON u.id = c2."respondentId"  
  LEFT JOIN case_witnesses cw ON u.id = cw."witnessId"
  WHERE u."createdAt" >= ${new Date('2025-01-01')}
  GROUP BY u.id, u.name, u.email
  ORDER BY cases_as_complainant DESC
`;

// Execute raw SQL with parameters
const userCases = await prisma.$queryRaw`
  SELECT c.*, u.name as complainant_name
  FROM cases c
  JOIN users u ON c."complainantId" = u.id
  WHERE c.status = ${CaseStatus.PENDING}
  AND c."createdAt" >= ${startDate}
  ORDER BY c."createdAt" DESC
  LIMIT ${limit}
`;
```

#### Transactions for Data Consistency
```typescript
// Use transactions when multiple operations must succeed together
const result = await prisma.$transaction(async (tx) => {
  // 1. Create the case
  const newCase = await tx.case.create({
    data: {
      caseNumber: generateCaseNumber(),
      caseType: "CONTRACT",
      issueDescription: "Payment dispute",
      complainantId: userId
    }
  });

  // 2. Create notification for complainant
  await tx.notification.create({
    data: {
      title: "Case Created Successfully",
      message: `Your case ${newCase.caseNumber} has been created`,
      type: "CASE_STATUS_UPDATE",
      userId: userId,
      caseId: newCase.id
    }
  });

  // 3. Add to case history
  await tx.caseHistory.create({
    data: {
      action: "CASE_CREATED",
      description: "Case was created by complainant",
      caseId: newCase.id,
      metadata: {
        createdBy: userId,
        caseType: "CONTRACT"
      }
    }
  });

  // 4. If respondent email provided, create notification
  if (respondentEmail) {
    const respondent = await tx.user.findUnique({
      where: { email: respondentEmail }
    });

    if (respondent) {
      await tx.notification.create({
        data: {
          title: "You've Been Named in a Case",
          message: `Case ${newCase.caseNumber} requires your attention`,
          type: "CASE_STATUS_UPDATE", 
          userId: respondent.id,
          caseId: newCase.id
        }
      });
    }
  }

  return newCase;
});
```

## 🗃️ Database Migrations

### What Are Migrations?

Migrations are like "version control for your database schema". They track changes to your database structure over time.

```mermaid
graph LR
    A[Version 1<br/>Basic User table] --> B[Version 2<br/>Add phone field]
    B --> C[Version 3<br/>Add Case table]
    C --> D[Version 4<br/>Add relationships]
    D --> E[Version 5<br/>Add indexes]
```

### Creating Migrations

```bash
# After changing schema.prisma, create a migration
npx prisma migrate dev --name add_case_priority

# This creates:
# - SQL migration file
# - Updates database 
# - Regenerates Prisma client
```

### Migration Example

When you change schema.prisma:
```typescript
// Added this field to Case model
priority  CasePriority @default(MEDIUM)
```

Prisma generates this SQL migration:
```sql
-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "cases" ADD COLUMN "priority" "CasePriority" NOT NULL DEFAULT 'MEDIUM';
```

### Migration Commands

```bash
# Create and apply migration (development)
npx prisma migrate dev --name description_of_change

# Apply pending migrations (production)
npx prisma migrate deploy

# Reset database (⚠️ DANGER: Deletes all data)
npx prisma migrate reset

# Create migration without applying
npx prisma migrate dev --create-only --name add_new_field

# Check migration status
npx prisma migrate status

# View migration history
ls prisma/migrations/
```

## 🌱 Database Seeding

### What is Seeding?

Seeding fills your database with test data for development. It's like having a "starter pack" of data.

### Our Seed File: `prisma/seed.ts`

```typescript
import { PrismaClient, Gender, CaseType, CaseStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@resolveit.com' },
    update: {},
    create: {
      email: 'admin@resolveit.com',
      name: 'System Administrator',
      phone: '+1-555-0100',
      age: 35,
      gender: Gender.MALE,
      password: await bcrypt.hash('admin123', 12),
      isEmailVerified: true,
      isPhoneVerified: true,
    }
  });

  // 2. Create test users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@example.com',
        name: 'John Doe',
        phone: '+1-555-0101',
        age: 28,
        gender: Gender.MALE,
        password: await bcrypt.hash('password123', 12),
        isEmailVerified: true,
      }
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@example.com', 
        name: 'Jane Smith',
        phone: '+1-555-0102',
        age: 32,
        gender: Gender.FEMALE,
        password: await bcrypt.hash('password123', 12),
        isEmailVerified: true,
      }
    })
  ]);

  // 3. Create test cases with relationships
  const cases = await Promise.all([
    prisma.case.create({
      data: {
        caseNumber: 'RES-2025-001',
        caseType: CaseType.CONTRACT,
        issueDescription: 'Dispute regarding non-payment for freelance services',
        status: CaseStatus.AWAITING_RESPONSE,
        priority: 'HIGH',
        complainantId: users[0].id,
        respondentId: users[1].id,
        
        // Create related evidence
        evidence: {
          create: [
            {
              fileName: 'contract.pdf',
              fileType: 'DOCUMENT',
              fileSize: 1024768,
              fileUrl: '/uploads/evidence/contract.pdf',
              originalName: 'Freelance Contract.pdf',
              description: 'Original signed contract'
            }
          ]
        },

        // Create case history
        caseHistory: {
          create: [
            {
              action: 'CASE_CREATED',
              description: 'Case was created by complainant',
              metadata: {
                createdBy: users[0].id,
                initialStatus: 'PENDING'
              }
            }
          ]
        },

        // Create notifications
        notifications: {
          create: [
            {
              title: 'New Case Created',
              message: 'Your case has been successfully created',
              type: 'CASE_STATUS_UPDATE',
              userId: users[0].id
            },
            {
              title: 'You Have Been Named in a Case',
              message: 'Please review case RES-2025-001',
              type: 'CASE_STATUS_UPDATE', 
              userId: users[1].id
            }
          ]
        }
      }
    })
  ]);

  // 4. Add witnesses
  await prisma.case_witnesses.create({
    data: {
      id: 'witness_1',
      caseId: cases[0].id,
      witnessId: admin.id
    }
  });

  console.log('✅ Database seeded successfully!');
  console.log(`👤 Created ${users.length + 1} users`);
  console.log(`📋 Created ${cases.length} cases`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Running Seeds

```bash
# Run the seed file
npx prisma db seed

# Or reset database and seed
npx prisma migrate reset

# Custom seed scripts
npm run db:seed
```

## 🔍 Prisma Studio

### What is Prisma Studio?

Prisma Studio is a visual database editor - think "phpMyAdmin for Prisma".

```bash
# Start Prisma Studio
npx prisma studio

# Opens at: http://localhost:5555
```

### Prisma Studio Features

1. **Visual Data Browser**: Click through tables and relationships
2. **Query Builder**: Build queries visually
3. **Data Editor**: Add, edit, delete records with a GUI
4. **Relationship Navigation**: Follow foreign keys between tables
5. **Real-time**: See changes immediately

### Common Prisma Studio Tasks

#### 1. Viewing Data
- Click on any table (users, cases, evidence)
- See all records with pagination
- Filter and sort columns
- Follow relationships by clicking links

#### 2. Editing Records
- Click on any cell to edit
- Save changes with Ctrl+S
- Add new records with the "+" button
- Delete records with the trash icon

#### 3. Understanding Relationships
```mermaid
graph LR
    A[User: John Doe] -->|complainantId| B[Case: RES-2025-001]
    B -->|caseId| C[Evidence: contract.pdf]
    B -->|caseId| D[Notification: Case Created]
    E[User: Jane Smith] -->|respondentId| B
```

In Prisma Studio:
- Click on a User → see their cases
- Click on a Case → see evidence and notifications
- Click on Evidence → see which case it belongs to

## ⚡ Performance Optimization

### 1. Query Optimization

#### Use `select` instead of `include` when possible
```typescript
// ❌ Bad: Fetches all user fields
const users = await prisma.user.findMany({
  include: {
    casesAsComplainant: true
  }
});

// ✅ Good: Only fetch needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    casesAsComplainant: {
      select: {
        id: true,
        caseNumber: true,
        status: true
      }
    }
  }
});
```

#### Use pagination for large datasets
```typescript
// ❌ Bad: Fetches all records
const allCases = await prisma.case.findMany();

// ✅ Good: Paginated query
const cases = await prisma.case.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' }
});
```

#### Optimize with indexes
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_complainant_id ON cases("complainantId");
CREATE INDEX idx_cases_created_at ON cases("createdAt");
```

### 2. Connection Pooling

```typescript
// database.ts - Configure connection pooling
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection pool configuration in DATABASE_URL:
// postgresql://user:password@localhost:5432/database?connection_limit=20&pool_timeout=20
```

### 3. Query Analysis

```typescript
// Enable query logging in development
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) {  // Log queries taking > 1 second
    console.log('Slow query detected:');
    console.log('Query:', e.query);
    console.log('Duration:', e.duration + 'ms');
    console.log('Params:', e.params);
  }
});
```

## 🔧 Advanced Prisma Features

### 1. Prisma Extensions

```typescript
// Create reusable query extensions
const prismaWithExtensions = prisma.$extends({
  model: {
    user: {
      // Add custom method to User model
      async findByEmailWithCases(email: string) {
        return await prisma.user.findUnique({
          where: { email },
          include: {
            casesAsComplainant: {
              select: {
                id: true,
                caseNumber: true,
                status: true,
                createdAt: true
              }
            },
            casesAsRespondent: {
              select: {
                id: true,
                caseNumber: true,
                status: true,
                createdAt: true
              }
            },
            _count: {
              select: {
                casesAsComplainant: true,
                casesAsRespondent: true,
                notifications: true
              }
            }
          }
        });
      }
    },
    case: {
      // Add custom method to Case model
      async findActiveWithDetails(userId: string) {
        return await prisma.case.findMany({
          where: {
            OR: [
              { complainantId: userId },
              { respondentId: userId }
            ],
            status: {
              in: ['PENDING', 'AWAITING_RESPONSE', 'ACCEPTED', 'MEDIATION_IN_PROGRESS']
            }
          },
          include: {
            complainant: { select: { id: true, name: true, email: true } },
            respondent: { select: { id: true, name: true, email: true } },
            evidence: { select: { id: true, fileName: true, fileType: true } },
            _count: {
              select: {
                evidence: true,
                case_witnesses: true,
                notifications: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' }
        });
      }
    }
  }
});

// Usage
const user = await prismaWithExtensions.user.findByEmailWithCases('john@example.com');
const activeCases = await prismaWithExtensions.case.findActiveWithDetails(userId);
```

### 2. Computed Fields

```typescript
// Add computed fields to models
const prismaWithComputedFields = prisma.$extends({
  result: {
    user: {
      fullName: {
        needs: { name: true },
        compute(user) {
          return `${user.name} (ID: ${user.id})`;
        }
      },
      isActive: {
        needs: { createdAt: true },
        compute(user) {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return user.createdAt > thirtyDaysAgo;
        }
      }
    },
    case: {
      ageInDays: {
        needs: { createdAt: true },
        compute(caseRecord) {
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - caseRecord.createdAt.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      },
      isUrgent: {
        needs: { priority: true, createdAt: true },
        compute(caseRecord) {
          if (caseRecord.priority === 'URGENT') return true;
          
          const daysSinceCreated = Math.ceil(
            (Date.now() - caseRecord.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          return daysSinceCreated > 30; // Consider old cases urgent
        }
      }
    }
  }
});
```

### 3. Middleware for Auditing

```typescript
// Add automatic auditing
prisma.$use(async (params, next) => {
  // Log all database operations
  console.log('Prisma Query:', {
    model: params.model,
    action: params.action,
    timestamp: new Date().toISOString()
  });

  // Add automatic timestamps for updates
  if (params.action === 'update' && params.args.data) {
    params.args.data.updatedAt = new Date();
  }

  // Soft delete implementation
  if (params.action === 'delete') {
    // Change delete to update with deletedAt timestamp
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }

  // Filter out soft-deleted records
  if (params.action === 'findMany' || params.action === 'findFirst') {
    if (!params.args.where) params.args.where = {};
    params.args.where.deletedAt = null;
  }

  return next(params);
});
```

## 🔧 Rate Limiting Deep Dive

### What is Rate Limiting?

Rate limiting controls how many requests a user can make in a specific time period. Think of it like a speed limit for API calls.

```mermaid
graph LR
    A[User makes request] --> B{Rate limit check}
    B -->|Under limit| C[Process request]
    B -->|Over limit| D[Return 429 error]
    C --> E[Update request counter]
    D --> F[User must wait]
```

### Why Do We Need Rate Limiting?

1. **Prevent Abuse**: Stop malicious users from overwhelming your server
2. **Protect Resources**: Ensure your database doesn't get overloaded
3. **Fair Usage**: Give all users equal access to your API
4. **Cost Control**: Prevent unexpected server costs from traffic spikes

### Our Rate Limiting Implementation

Let's examine how rate limiting works in ResolveIt:

```typescript
// server/src/middleware/auth.ts - Rate limiting for authentication
import rateLimit from 'express-rate-limit';

// Create rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // Default 5 requests per window
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Skip rate limiting for successful requests (optional)
  skipSuccessfulRequests: false,
  
  // Skip rate limiting for failed requests (optional)  
  skipFailedRequests: false,
  
  // Custom key generator (defaults to IP address)
  keyGenerator: (req) => {
    // You could use email, user ID, or combination
    return req.ip; // Default: limit by IP address
  },
  
  // Custom handler for when limit is exceeded
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again later',
      retryAfter: '15 minutes'
    });
  }
});

// Usage in auth routes
import { Router } from 'express';
const router = Router();

// Apply rate limiting to login endpoint
router.post('/login', authLimiter, async (req, res) => {
  // Login logic here
});

// Apply to registration endpoint
router.post('/register', authLimiter, async (req, res) => {
  // Registration logic here  
});
```

### Different Types of Rate Limiting

#### 1. Global Rate Limiting
```typescript
// Apply to all routes
import rateLimit from 'express-rate-limit';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  message: 'Too many requests from this IP'
});

app.use(globalLimiter);
```

#### 2. Per-User Rate Limiting
```typescript
// Limit based on authenticated user
const userLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per user
  keyGenerator: (req) => {
    // Use user ID instead of IP
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for admin users
    return req.user?.role === 'ADMIN';
  }
});
```

#### 3. Endpoint-Specific Rate Limiting
```typescript
// Different limits for different endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Very strict for sensitive operations
  message: 'Too many requests for this operation'
});

const relaxedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // More relaxed for read operations
});

// Apply different limiters
router.post('/cases', strictLimiter, createCase);
router.get('/cases', relaxedLimiter, getCases);
router.delete('/cases/:id', strictLimiter, deleteCase);
```

### Advanced Rate Limiting Strategies

#### 1. Redis-Based Rate Limiting (for production)
```typescript
import RedisStore from 'rate-limit-redis';
import Redis from 'redis';

const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const redisLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Benefits:
// - Shared across multiple server instances
// - Persists through server restarts
// - More accurate for distributed systems
```

#### 2. Sliding Window Rate Limiting
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'resolveit_rl',
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: secs
    });
  }
};
```

#### 3. Dynamic Rate Limiting
```typescript
// Adjust limits based on user type or system load
const dynamicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    // Admin users get higher limits
    if (req.user?.role === 'ADMIN') return 1000;
    
    // Verified users get more requests
    if (req.user?.isEmailVerified) return 100;
    
    // Unverified users get fewer requests
    return 20;
  },
  keyGenerator: (req) => {
    // Combine user ID and IP for better accuracy
    return req.user ? `user_${req.user.id}` : `ip_${req.ip}`;
  }
});
```

### Rate Limiting Best Practices

#### 1. Graceful Error Messages
```typescript
const informativeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (req, res) => {
    const resetTime = new Date(Date.now() + 15 * 60 * 1000);
    
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.',
      details: {
        limit: 100,
        windowMs: 15 * 60 * 1000,
        resetTime: resetTime.toISOString(),
        currentRequests: req.rateLimit?.used || 0,
        remainingRequests: req.rateLimit?.remaining || 0
      },
      suggestion: 'Consider implementing request batching or caching on your client'
    });
  }
});
```

#### 2. Rate Limit Headers
```typescript
// Always include helpful headers
const limiterWithHeaders = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true, // Include standard headers
  legacyHeaders: false,
  
  // Custom headers
  onLimitReached: (req, res) => {
    res.set({
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0', 
      'X-RateLimit-Reset': new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      'Retry-After': '900' // 15 minutes in seconds
    });
  }
});
```

#### 3. Monitoring and Alerting
```typescript
// Log rate limiting events for monitoring
const monitoredLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  onLimitReached: (req, res) => {
    // Log for monitoring
    console.warn('Rate limit exceeded:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      user: req.user?.id || 'anonymous'
    });
    
    // Could send to monitoring service
    // monitoringService.alert('RATE_LIMIT_EXCEEDED', { ... });
  },
  
  // Track near-limit events too
  skip: (req, res) => {
    if (req.rateLimit && req.rateLimit.remaining < 10) {
      console.info('Approaching rate limit:', {
        ip: req.ip,
        remaining: req.rateLimit.remaining,
        endpoint: req.path
      });
    }
    return false; // Don't skip any requests
  }
});
```

### Testing Rate Limiting

```typescript
// test/rate-limiting.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Rate Limiting', () => {
  test('should allow requests under the limit', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });
      
      expect(response.status).not.toBe(429);
    }
  });

  test('should block requests over the limit', async () => {
    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });
    }

    // This request should be rate limited
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.status).toBe(429);
    expect(response.body).toHaveProperty('error');
    expect(response.headers).toHaveProperty('retry-after');
  });

  test('should reset after window expires', async () => {
    // This test would need to wait or mock time
    // to verify that limits reset after the window
  });
});
```

### Rate Limiting Configuration

```typescript
// config/rateLimiting.ts - Centralized configuration
export const rateLimitConfig = {
  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT) || 5,
    message: 'Too many authentication attempts'
  },
  
  // API endpoints (moderate)
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: parseInt(process.env.API_RATE_LIMIT) || 100,
    message: 'Too many API requests'
  },
  
  // File uploads (very strict)
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: parseInt(process.env.UPLOAD_RATE_LIMIT) || 5,
    message: 'Too many upload attempts'
  },
  
  // Public endpoints (relaxed)
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.PUBLIC_RATE_LIMIT) || 1000,
    message: 'Too many requests'
  }
};
```

## 🎯 Key Takeaways for Part 5

1. **Prisma is a Translator**: Converts JavaScript to SQL and provides type safety
2. **Schema-First Development**: Define your database structure in `schema.prisma`
3. **Migrations Track Changes**: Every schema change creates a versioned migration
4. **Seeding Provides Test Data**: Fill your database with realistic development data
5. **Prisma Studio is Visual**: GUI for browsing and editing your database
6. **Performance Matters**: Use `select` instead of `include`, add indexes, use pagination
7. **Rate Limiting Protects**: Prevents abuse and ensures fair usage of your API

### Essential Prisma Commands:
```bash
# Generate client after schema changes
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name description

# Apply migrations in production
npx prisma migrate deploy

# Reset and seed database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Run seed file
npx prisma db seed

# Check migration status
npx prisma migrate status
```

### Essential Rate Limiting Concepts:
```typescript
// Basic rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Time window
  max: 100,                 // Max requests per window
  message: 'Too many requests' // Error message
});

// Apply to routes
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
```

---

## 🚀 Ready for Part 6?

In Part 6, we'll explore:
- Complete Workflows & Case Registration
- File upload and evidence management
- Email notifications and communication
- Advanced frontend patterns
- Error handling and validation

**Type "continue" when you're ready for Part 6!**
