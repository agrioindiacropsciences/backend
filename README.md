# Agrio India - Backend API

A comprehensive Node.js/Express backend API for the Agrio India agricultural platform, supporting both web and mobile applications.

## 🌾 Features

- **Authentication** - OTP-based authentication via Twilio Verify
- **User Management** - Profile, preferences, crop selections
- **Product Catalog** - Categories, products, search
- **Distributors** - Location-based dealer finder
- **Scan & Win** - Coupon verification and redemption
- **Rewards System** - Prize tiers and certificates
- **Notifications** - Push notification management
- **Admin Panel** - Dashboard, reports, CRUD operations

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Aiven)
- **ORM**: Prisma
- **Authentication**: JWT (RS256)
- **Validation**: Zod
- **SMS**: Twilio Verify API

## 📁 Project Structure

```
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeder
├── src/
│   ├── controllers/      # Route handlers
│   │   ├── admin/        # Admin controllers
│   │   └── *.controller.ts
│   ├── lib/
│   │   └── prisma.ts     # Prisma client
│   ├── middleware/
│   │   ├── auth.ts       # Authentication middleware
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── routes/
│   │   ├── admin/        # Admin routes
│   │   └── *.routes.ts
│   ├── types/
│   │   └── index.ts      # TypeScript types
│   ├── utils/
│   │   ├── helpers.ts    # Utility functions
│   │   ├── jwt.ts        # JWT utilities
│   │   ├── otp.ts        # OTP utilities
│   │   ├── response.ts   # Response helpers
│   │   └── validation.ts # Zod schemas
│   └── index.ts          # App entry point
├── env.example           # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Aiven or local)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd Backend-agricultre
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your database credentials. You can use either:
   
   **Option 1: Individual database variables (Recommended)**
   ```env
   DB_DIALECT=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=agrio_india
   DB_USER=postgres
   DB_PASS=your_password
   DB_SSL=require
   ```
   
   **Option 2: Full DATABASE_URL (Alternative)**
   ```env
   DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
   ```
   
   And other required variables:
   ```env
   JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
   JWT_REFRESH_SECRET="your-refresh-secret-key"
   # ... see env.example for all variables
   ```

4. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

5. **Push database schema**
   ```bash
   npm run db:push
   ```

6. **Seed the database** (optional)
   ```bash
   npm run db:seed
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3000`

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/send-otp` | Send OTP to phone |
| POST | `/api/v1/auth/verify-otp` | Verify OTP and login |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout user |

### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/user/profile` | Get current user profile |
| POST | `/api/v1/user/profile` | Create/complete profile |
| PUT | `/api/v1/user/profile` | Update profile |
| PUT | `/api/v1/user/language` | Update language preference |
| GET | `/api/v1/user/stats` | Get user statistics |
| GET | `/api/v1/user/crops` | Get crop preferences |
| POST | `/api/v1/user/crops` | Sync crop preferences |

### Products & Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List products |
| GET | `/api/v1/products/best-sellers` | Get best sellers |
| GET | `/api/v1/products/recommended` | Get recommended products |
| GET | `/api/v1/products/:slug` | Get product details |
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/crops` | List crops |

### Distributors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/distributors?pincode=` | Find distributors by pincode |
| GET | `/api/v1/distributors/:id` | Get distributor details |
| GET | `/api/v1/distributors/:id/coverage` | Get coverage area |

### Coupons & Rewards
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/coupons/verify` | Verify coupon code |
| POST | `/api/v1/coupons/redeem` | Redeem coupon |
| GET | `/api/v1/user/coupons` | Get coupon history |
| GET | `/api/v1/user/rewards` | Get rewards |
| GET | `/api/v1/rewards/:id/certificate` | Get reward certificate |

### Other Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/search?q=` | Global search |
| POST | `/api/v1/support/contact` | Submit contact form |
| GET | `/api/v1/support/faqs` | Get FAQs |
| GET | `/api/v1/pages/:slug` | Get CMS page |
| GET | `/api/v1/notifications` | Get notifications |
| GET | `/api/v1/config` | Get app config |
| GET | `/api/v1/banners` | Get banners |

### Admin Endpoints
All admin endpoints are prefixed with `/api/v1/admin/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Admin login |
| GET | `/dashboard/stats` | Dashboard statistics |
| GET | `/users` | List users |
| GET | `/products` | List products |
| POST | `/products` | Create product |
| GET | `/coupons` | List coupons |
| POST | `/coupons/generate` | Generate coupons |
| GET | `/distributors` | List distributors |
| GET | `/reports/:type` | Get report data |
| GET | `/settings` | Get settings |

## 🔐 Authentication

The API uses JWT-based authentication:

- **Access Token**: Valid for 7 days
- **Refresh Token**: Valid for 30 days
- **Admin Token**: Valid for 24 hours

Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## 📊 Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## 🗄️ Database

### Migrations

```bash
# Create a migration
npm run db:migrate

# Deploy migrations to production
npm run db:migrate:prod

# View database in Prisma Studio
npm run db:studio
```

### Seeding

The seed file creates:
- Admin user (admin@agrioindia.com / admin123)
- Categories
- Crops
- Sample products
- FAQs
- CMS pages
- System config
- Sample pincode data

## 🚀 Deployment

### Build for production

```bash
npm run build
npm start
```

### Environment Variables

Required environment variables for production:

| Variable | Description |
|----------|-------------|
| **Database** (use either option): | |
| `DB_DIALECT` | Database type (default: `postgres`) |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port (default: `5432`) |
| `DB_NAME` | Database name |
| `DB_USER` | Database username |
| `DB_PASS` | Database password |
| `DB_SSL` | SSL mode: `require` or `disable` (default: `require`) |
| **OR** | |
| `DATABASE_URL` | Full PostgreSQL connection string (alternative to individual DB_* vars) |
| **Authentication:** | |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `ADMIN_JWT_SECRET` | Admin JWT secret |
| **Twilio:** | |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID |
| **Other:** | |
| `PORT` | Server port (default: `3000`) |
| `NODE_ENV` | Environment: `development` or `production` |

## 📝 Default Admin Credentials

After running the seed:

- **Email**: admin@agrioindiacropsciences.com
- **Password**: f7formula7

⚠️ **Change these credentials in production!**

## 📄 License

Proprietary - Agrio India

## 👥 Contact

- Support: support@agrioindia.com
- Website: https://agrioindia.com

