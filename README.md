# ResolveIt - Dispute Resolution System

A comprehensive dispute resolution platform that helps resolve legal disputes through mediation, featuring case management, evidence handling, witness coordination, and mediation panel assignments.

## 🎯 Project Overview

**ResolveIt** is a digital platform designed to streamline dispute resolution processes by:
- Managing legal cases from complaint to resolution
- Coordinating between complainants, respondents, and witnesses
- Organizing mediation panels with lawyers, religious scholars, and society members
- Tracking case evidence and maintaining audit trails
- Providing real-time notifications and updates

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Architecture](#system-architecture)
3. [Database Design](#database-design)
4. [Project Setup](#project-setup)
5. [Backend Development](#backend-development)
6. [Frontend Development](#frontend-development)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [API Documentation](#api-documentation)
10. [Contributing](#contributing)

## 🔧 Prerequisites

Before starting this project, you should have basic knowledge of:

### Technologies Used
- **Backend**: Node.js, Express.js/Next.js
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React.js/Next.js, TypeScript
- **Authentication**: JWT or NextAuth.js
- **File Upload**: AWS S3 or Cloudinary
- **Email**: SendGrid or Nodemailer
- **SMS**: Twilio
- **Real-time**: Socket.io or Server-Sent Events

### Required Software
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Git
- VS Code or preferred IDE
- Postman (for API testing)

## 🏗️ System Architecture

```
Frontend (React/Next.js)
    ↓
API Layer (Express/Next.js API)
    ↓
Business Logic Layer
    ↓
Database Layer (Prisma + PostgreSQL)
    ↓
External Services (File Storage, Email, SMS)
```

## 🗄️ Database Design

### Core Entities

1. **User**: Stores user information for all parties
2. **Address**: User address details
3. **Case**: Central entity for dispute cases
4. **Evidence**: Case-related documents and files
5. **CaseWitness**: Many-to-many relationship for witnesses
6. **MediationPanel**: Panel members assigned to cases
7. **MediationSession**: Session records and outcomes
8. **CaseHistory**: Audit trail for case changes
9. **Notification**: User notifications system

### Key Relationships
- Users can be complainants, respondents, or witnesses
- Cases have evidence, witnesses, and mediation panels
- Mediation panels consist of lawyers and optional religious scholars/society members

## 🚀 Project Setup

### Step 1: Initialize the Project

```bash
# Create project directory
mkdir resolvelt
cd resolvelt

# Initialize Node.js project
npm init -y

# Install core dependencies
npm install next react react-dom typescript @types/node @types/react
npm install prisma @prisma/client
npm install bcryptjs jsonwebtoken
npm install @types/bcryptjs @types/jsonwebtoken --save-dev

# Install additional dependencies
npm install axios
npm install tailwindcss postcss autoprefixer --save-dev
npm install @headlessui/react @heroicons/react
npm install react-hook-form @hookform/resolvers zod
npm install date-fns
npm install multer @types/multer --save-dev
```

### Step 2: Setup TypeScript

```bash
# Initialize TypeScript
npx tsc --init

# Setup Next.js TypeScript config
npx next@latest .
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Step 3: Setup Prisma

```bash
# Initialize Prisma
npx prisma init
```

This creates the Prisma schema file you already have. Now let's create the environment configuration.

### Step 4: Environment Configuration

Create `.env.local`:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/resolvelt_db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# File Upload (Choose one)
# AWS S3
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="your-aws-region"
AWS_S3_BUCKET="your-s3-bucket-name"

# Or Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email Service (Choose one)
# SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@resolvelt.com"

# Or SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# SMS Service
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"

# App Configuration
APP_NAME="ResolveIt"
APP_URL="http://localhost:3000"
```

### Step 5: Database Setup

```bash
# Create PostgreSQL database
createdb resolvelt_db

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Seed the database
npx prisma db seed
```

## 🔧 Backend Development

### Step 1: Project Structure

Create the following directory structure:
```
src/
├── components/          # React components
├── pages/              # Next.js pages
│   ├── api/           # API routes
│   ├── auth/          # Authentication pages
│   ├── cases/         # Case-related pages
│   └── dashboard/     # Dashboard pages
├── lib/               # Utility libraries
├── types/             # TypeScript type definitions
├── hooks/             # Custom React hooks
├── utils/             # Helper functions
├── styles/            # CSS/Tailwind styles
└── middleware/        # API middleware
```

### Step 2: Database Connection

Create `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Step 3: Authentication System

Create `src/lib/auth.ts`:
```typescript
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

export interface AuthUser {
  id: string
  email: string
  name: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return decoded
  } catch {
    return null
  }
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { address: true }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Note: You'll need to add password field to User model
  // const isValid = await verifyPassword(password, user.password)
  // if (!isValid) {
  //   throw new Error('Invalid password')
  // }

  return {
    id: user.id,
    email: user.email,
    name: user.name
  }
}
```

### Step 4: API Routes

Create `src/pages/api/auth/register.ts`:
```typescript
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { hashPassword, generateToken } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { email, phone, name, age, gender, address, password } = req.body

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    })

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Hash password (you'll need to add password field to schema)
    // const hashedPassword = await hashPassword(password)

    // Create user with address
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        name,
        age: parseInt(age),
        gender,
        address: address ? {
          create: {
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip
          }
        } : undefined
      },
      include: {
        address: true
      }
    })

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name
    })

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address
      },
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
```

Create `src/pages/api/cases/index.ts`:
```typescript
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { verifyToken } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' })
  }

  const user = verifyToken(token)
  if (!user) {
    return res.status(401).json({ message: 'Invalid token' })
  }

  if (req.method === 'GET') {
    try {
      const cases = await prisma.case.findMany({
        where: {
          OR: [
            { complainantId: user.userId },
            { respondentId: user.userId },
            { witnesses: { some: { witnessId: user.userId } } }
          ]
        },
        include: {
          complainant: {
            select: { name: true, email: true }
          },
          respondent: {
            select: { name: true, email: true }
          },
          evidence: true,
          witnesses: {
            include: {
              witness: {
                select: { name: true, email: true }
              }
            }
          },
          mediationPanel: {
            include: {
              lawyer: { select: { name: true, email: true } },
              religiousScholar: { select: { name: true, email: true } },
              societyMember: { select: { name: true, email: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      res.status(200).json(cases)
    } catch (error) {
      console.error('Error fetching cases:', error)
      res.status(500).json({ message: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    try {
      const {
        caseType,
        issueDescription,
        priority,
        isInCourt,
        isInPoliceStation,
        courtCaseNumber,
        firNumber,
        courtName,
        policeStationName,
        respondentId,
        oppositePartyName,
        oppositePartyEmail,
        oppositePartyPhone,
        oppositePartyAddress
      } = req.body

      const newCase = await prisma.case.create({
        data: {
          caseType,
          issueDescription,
          priority: priority || 'MEDIUM',
          isInCourt: isInCourt || false,
          isInPoliceStation: isInPoliceStation || false,
          courtCaseNumber,
          firNumber,
          courtName,
          policeStationName,
          complainantId: user.userId,
          respondentId,
          oppositePartyName,
          oppositePartyEmail,
          oppositePartyPhone,
          oppositePartyAddress
        },
        include: {
          complainant: {
            select: { name: true, email: true }
          },
          respondent: {
            select: { name: true, email: true }
          }
        }
      })

      // Create case history entry
      await prisma.caseHistory.create({
        data: {
          caseId: newCase.id,
          action: 'CASE_CREATED',
          description: 'Case was created by complainant',
          metadata: {
            userId: user.userId,
            caseType: newCase.caseType
          }
        }
      })

      res.status(201).json(newCase)
    } catch (error) {
      console.error('Error creating case:', error)
      res.status(500).json({ message: 'Internal server error' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
```

### Step 5: File Upload Service

Create `src/lib/fileUpload.ts`:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

export async function uploadFile(file: Buffer, originalName: string, mimeType: string) {
  const fileName = `${uuidv4()}-${originalName}`
  const key = `evidence/${fileName}`

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: file,
    ContentType: mimeType
  })

  await s3Client.send(command)

  return {
    fileName,
    fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
  }
}

export function getFileType(mimeType: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  return 'DOCUMENT'
}
```

## 🎨 Frontend Development

### Step 1: Setup Tailwind CSS

```bash
npx tailwindcss init -p
```

Configure `tailwind.config.js`:
```javascript
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
```

### Step 2: Create Layout Component

Create `src/components/Layout.tsx`:
```typescript
import { ReactNode } from 'react'
import Head from 'next/head'
import Navigation from './Navigation'

interface LayoutProps {
  children: ReactNode
  title?: string
}

export default function Layout({ children, title = 'ResolveIt' }: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Dispute Resolution Platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </>
  )
}
```

### Step 3: Create Case Form Component

Create `src/components/CaseForm.tsx`:
```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const caseSchema = z.object({
  caseType: z.enum(['FAMILY', 'BUSINESS', 'CRIMINAL', 'PROPERTY', 'CONTRACT', 'OTHER']),
  issueDescription: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  isInCourt: z.boolean().optional(),
  isInPoliceStation: z.boolean().optional(),
  courtCaseNumber: z.string().optional(),
  firNumber: z.string().optional(),
  courtName: z.string().optional(),
  policeStationName: z.string().optional(),
  oppositePartyName: z.string().optional(),
  oppositePartyEmail: z.string().email().optional().or(z.literal('')),
  oppositePartyPhone: z.string().optional(),
  oppositePartyAddress: z.string().optional()
})

type CaseFormData = z.infer<typeof caseSchema>

interface CaseFormProps {
  onSubmit: (data: CaseFormData) => Promise<void>
  loading?: boolean
}

export default function CaseForm({ onSubmit, loading = false }: CaseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema)
  })

  const isInCourt = watch('isInCourt')
  const isInPoliceStation = watch('isInPoliceStation')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Case Type
        </label>
        <select
          {...register('caseType')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          <option value="">Select case type</option>
          <option value="FAMILY">Family</option>
          <option value="BUSINESS">Business</option>
          <option value="CRIMINAL">Criminal</option>
          <option value="PROPERTY">Property</option>
          <option value="CONTRACT">Contract</option>
          <option value="OTHER">Other</option>
        </select>
        {errors.caseType && (
          <p className="mt-1 text-sm text-red-600">{errors.caseType.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Issue Description
        </label>
        <textarea
          {...register('issueDescription')}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder="Describe the issue in detail..."
        />
        {errors.issueDescription && (
          <p className="mt-1 text-sm text-red-600">{errors.issueDescription.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Priority
        </label>
        <select
          {...register('priority')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center">
          <input
            {...register('isInCourt')}
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Currently in court
          </label>
        </div>

        <div className="flex items-center">
          <input
            {...register('isInPoliceStation')}
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Police complaint filed
          </label>
        </div>
      </div>

      {isInCourt && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Court Case Number
            </label>
            <input
              {...register('courtCaseNumber')}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Court Name
            </label>
            <input
              {...register('courtName')}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      {isInPoliceStation && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              FIR Number
            </label>
            <input
              {...register('firNumber')}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Police Station Name
            </label>
            <input
              {...register('policeStationName')}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Opposite Party Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              {...register('oppositePartyName')}
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              {...register('oppositePartyEmail')}
              type="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.oppositePartyEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.oppositePartyEmail.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            {...register('oppositePartyPhone')}
            type="tel"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <textarea
            {...register('oppositePartyAddress')}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Creating Case...' : 'Create Case'}
        </button>
      </div>
    </form>
  )
}
```

### Step 4: Create Dashboard Page

Create `src/pages/dashboard/index.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { Case, User } from '@prisma/client'

interface CaseWithDetails extends Case {
  complainant: Pick<User, 'name' | 'email'>
  respondent: Pick<User, 'name' | 'email'> | null
  _count: {
    evidence: number
    witnesses: number
  }
}

export default function Dashboard() {
  const [cases, setCases] = useState<CaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchCases()
  }, [])

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/cases', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCases(data)
      }
    } catch (error) {
      console.error('Error fetching cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      AWAITING_RESPONSE: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      RESOLVED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Layout title="Dashboard - ResolveIt">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard - ResolveIt">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={() => router.push('/cases/new')}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Create New Case
          </button>
        </div>

        {cases.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No cases</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new case.</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/cases/new')}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Create New Case
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((case_) => (
              <div key={case_.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(case_.status)}`}>
                    {case_.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500">
                    {case_.caseType}
                  </span>
                </div>

                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Case #{case_.caseNumber.slice(-8)}
                </h3>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {case_.issueDescription}
                </p>

                <div className="space-y-2 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Complainant:</span> {case_.complainant.name}
                  </div>
                  {case_.respondent && (
                    <div>
                      <span className="font-medium">Respondent:</span> {case_.respondent.name}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{case_._count.evidence} Evidence</span>
                    <span>{case_._count.witnesses} Witnesses</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => router.push(`/cases/${case_.id}`)}
                    className="w-full text-center text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
```

## 🧪 Testing

### Step 1: Setup Testing Framework

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/jest
```

Create `jest.config.js`:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

### Step 2: Write Tests

Create `src/__tests__/api/cases.test.ts`:
```typescript
import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/cases/index'
import { prisma } from '../../lib/prisma'
import jwt from 'jsonwebtoken'

jest.mock('../../lib/prisma', () => ({
  prisma: {
    case: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    caseHistory: {
      create: jest.fn(),
    },
  },
}))

jest.mock('jsonwebtoken')

describe('/api/cases', () => {
  it('should return 401 if no token provided', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    expect(JSON.parse(res._getData())).toEqual({
      message: 'No token provided',
    })
  })

  it('should return cases for authenticated user', async () => {
    const mockCases = [
      {
        id: '1',
        caseNumber: 'CASE-001',
        issueDescription: 'Test case',
        status: 'PENDING',
      },
    ]

    ;(jwt.verify as jest.Mock).mockReturnValue({ userId: 'user1' })
    ;(prisma.case.findMany as jest.Mock).mockResolvedValue(mockCases)

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual(mockCases)
  })
})
```

## 🚀 Deployment

### Step 1: Environment Variables

Set up production environment variables for:
- Database URL (PostgreSQL)
- JWT secrets
- File storage credentials
- Email/SMS service credentials

### Step 2: Database Migration

```bash
# Production migration
npx prisma migrate deploy
```

### Step 3: Build and Deploy

For **Vercel**:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

For **Docker**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## 📚 Additional Features to Implement

### Phase 2 Features:
1. **Real-time Notifications** - Socket.io integration
2. **Document Signing** - Digital signature support
3. **Video Conferencing** - Integration with Zoom/WebRTC
4. **Payment Gateway** - For mediation fees
5. **Mobile App** - React Native version
6. **AI Recommendations** - Case categorization and routing

### Phase 3 Features:
1. **Multi-language Support** - i18n implementation
2. **Advanced Analytics** - Case resolution metrics
3. **Integration APIs** - Court systems integration
4. **Blockchain Records** - Immutable case records
5. **Voice-to-Text** - For session transcription

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🆘 Support

For support, email support@resolvelt.com or join our Slack channel.

---

**Built with ❤️ for justice and dispute resolution**
