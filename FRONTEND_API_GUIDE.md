# 🌾 Agrio India - Complete API Documentation

> **Last Updated:** January 11, 2026  
> **Backend Version:** 1.0.0  
> **Base URL (Local):** `http://localhost:3001/api/v1`  
> **Document Version:** 2.1 (Updated with all endpoints)

---

## 📍 Configuration

### Frontend `.env` Setup

```env
# Development (Local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Production (Railway - when working)
NEXT_PUBLIC_API_URL=https://backend-agricultre-new.up.railway.app/api/v1
```

---

## 🔧 API Helper Function

Create this helper in your frontend:

```javascript
// lib/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'API Error');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Admin API Helper
export async function adminApiCall(endpoint, options = {}) {
  const adminToken = localStorage.getItem('adminToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(adminToken && { 'Authorization': `Bearer ${adminToken}` }),
    ...options.headers
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'API Error');
  }
  
  return data;
}
```

---

# 📱 USER APIs (Frontend App/Website)

---

## 🔐 Authentication

### 1. Dev Login (Development Only - Bypasses OTP)

```javascript
// POST /auth/dev-login
const response = await apiCall('/auth/dev-login', {
  method: 'POST',
  body: JSON.stringify({
    phone_number: "9876543210"
  })
});

// Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "is_new_user": false,
    "user": {
      "id": "uuid",
      "phone_number": "9876543210",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    }
  }
}

// Save token after login
localStorage.setItem('token', response.data.token);
localStorage.setItem('refreshToken', response.data.refresh_token);
```

### 2. Send OTP (Production)

```javascript
// POST /auth/send-otp
const response = await apiCall('/auth/send-otp', {
  method: 'POST',
  body: JSON.stringify({
    phone_number: "9876543210"
  })
});

// Response
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### 3. Verify OTP

```javascript
// POST /auth/verify-otp
// Note: Use "123456" as OTP in development mode for bypass
const response = await apiCall('/auth/verify-otp', {
  method: 'POST',
  body: JSON.stringify({
    phone_number: "9876543210",
    otp_code: "123456"  // Use "123456" in development
  })
});

// Response (same as dev-login)
{
  "success": true,
  "data": {
    "token": "...",
    "refresh_token": "...",
    "is_new_user": true,
    "user": { ... }
  }
}
```

### 4. Refresh Token

```javascript
// POST /auth/refresh-token
const response = await apiCall('/auth/refresh-token', {
  method: 'POST',
  body: JSON.stringify({
    refresh_token: localStorage.getItem('refreshToken')
  })
});

// Response
{
  "success": true,
  "data": {
    "token": "new-access-token",
    "refresh_token": "new-refresh-token"
  }
}
```

### 5. Logout

```javascript
// POST /auth/logout (Requires Auth)
const response = await apiCall('/auth/logout', {
  method: 'POST'
});

// Clear local storage after logout
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
```

---

## 📦 Products

### 1. Get All Products

```javascript
// GET /products
// Query params: page, limit, category, crop, q, sort, best_seller
const response = await apiCall('/products?page=1&limit=10');

// With filters
const filtered = await apiCall('/products?category=insecticide&sort=popular&limit=20');

// Response
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Product Name",
        "name_hi": "उत्पाद नाम",
        "slug": "product-slug",
        "category": {
          "id": "cat-uuid",
          "name": "Insecticides",
          "name_hi": "कीटनाशक"
        },
        "description": "Product description",
        "description_hi": "उत्पाद विवरण",
        "composition": "Chemical composition",
        "dosage": "Dosage instructions",
        "application_method": "How to apply",
        "target_pests": ["pest1", "pest2"],
        "suitable_crops": ["crop-id-1", "crop-id-2"],
        "pack_sizes": [
          { "size": "100ml", "sku": "SKU001", "mrp": 150, "selling_price": 120 },
          { "size": "250ml", "sku": "SKU002", "mrp": 300, "selling_price": 250 }
        ],
        "safety_precautions": ["precaution1", "precaution2"],
        "images": ["url1", "url2"],
        "is_best_seller": true,
        "is_active": true,
        "sales_count": 150
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### 2. Get Best Sellers

```javascript
// GET /products/best-sellers?limit=8
const response = await apiCall('/products/best-sellers?limit=8');

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Product Name",
      "name_hi": "उत्पाद नाम",
      "slug": "product-slug",
      "category": { "id": "...", "name": "...", "name_hi": "..." },
      "images": ["url1"],
      "pack_sizes": [...],
      "is_best_seller": true
    }
  ]
}
```

### 3. Get New Arrivals

```javascript
// GET /products/new-arrivals?limit=8
const response = await apiCall('/products/new-arrivals?limit=8');
```

### 4. Get Featured Products

```javascript
// GET /products/featured?limit=8
const response = await apiCall('/products/featured?limit=8');
```

### 5. Search Products

```javascript
// GET /products/search?q=keyword
const response = await apiCall('/products/search?q=fertilizer');

// Response
{
  "success": true,
  "data": [
    { "id": "...", "name": "...", "slug": "...", ... }
  ]
}
```

### 6. Get Product by Slug

```javascript
// GET /products/:slug
const response = await apiCall('/products/product-slug-here');

// Response includes related_products
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Product Name",
    "name_hi": "...",
    "slug": "product-slug",
    "category": { ... },
    "description": "...",
    "description_hi": "...",
    "composition": "...",
    "dosage": "...",
    "application_method": "...",
    "target_pests": [...],
    "suitable_crops": [...],
    "pack_sizes": [...],
    "safety_precautions": [...],
    "images": [...],
    "technical_details": { ... },
    "is_best_seller": true,
    "related_products": [
      { "id": "...", "name": "...", "slug": "...", "images": [...] }
    ]
  }
}
```

### 7. Get Recommended Products (Auth Required)

```javascript
// GET /products/recommended?limit=10
const response = await apiCall('/products/recommended?limit=10');
```

---

## 🏷️ Categories

### 1. Get All Categories

```javascript
// GET /categories
const response = await apiCall('/categories');

// Response
{
  "success": true,
  "data": [
    {
      "id": "insecticide",
      "name": "Insecticides",
      "name_hi": "कीटनाशक",
      "slug": "insecticides",
      "image_url": "https://...",
      "product_count": 15,
      "is_active": true
    },
    {
      "id": "fungicide",
      "name": "Fungicides",
      "name_hi": "फफूंदनाशक",
      "slug": "fungicides",
      "image_url": "https://...",
      "product_count": 10,
      "is_active": true
    }
  ]
}
```

### 2. Get Category by ID

```javascript
// GET /categories/:id
const response = await apiCall('/categories/insecticide');
```

---

## 🌱 Crops

### Get All Crops

```javascript
// GET /crops
const response = await apiCall('/crops');

// Response
{
  "success": true,
  "data": [
    {
      "id": "wheat",
      "name": "Wheat",
      "name_hi": "गेहूं",
      "slug": "wheat",
      "image_url": "https://...",
      "season": "Rabi",
      "is_active": true
    },
    {
      "id": "rice",
      "name": "Rice",
      "name_hi": "चावल",
      "slug": "rice",
      "image_url": "https://...",
      "season": "Kharif",
      "is_active": true
    }
  ]
}
```

---

## 👤 User Profile (Auth Required)

### 1. Get Profile

```javascript
// GET /user/profile
const response = await apiCall('/user/profile');

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone_number": "9876543210",
    "full_name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "pin_code": "400001",
    "full_address": "123 Main Street",
    "state": "Maharashtra",
    "district": "Mumbai",
    "profile_image_url": "https://cloudinary.com/...",
    "language": "en",
    "crop_preferences": [
      { "id": "wheat", "name": "Wheat", "name_hi": "गेहूं" }
    ],
    "is_active": true,
    "created_at": "2026-01-01T00:00:00.000Z",
    "last_login": "2026-01-10T12:00:00.000Z"
  }
}
```

### 2. Create/Complete Profile

```javascript
// POST /user/profile
const response = await apiCall('/user/profile', {
  method: 'POST',
  body: JSON.stringify({
    full_name: "John Doe",
    pin_code: "400001",
    email: "john@example.com",  // optional
    full_address: "123 Main Street",  // optional
    state: "Maharashtra",  // optional (auto-filled from pincode)
    district: "Mumbai"  // optional (auto-filled from pincode)
  })
});
```

### 3. Update Profile

```javascript
// PUT /user/profile
const response = await apiCall('/user/profile', {
  method: 'PUT',
  body: JSON.stringify({
    full_name: "John Doe Updated",
    email: "newemail@example.com",
    pin_code: "400001",
    full_address: "123 New Street",
    state: "Maharashtra",
    district: "Mumbai"
  })
});
```

### 6. Update Language

```javascript
// PUT /user/language
const response = await apiCall('/user/language', {
  method: 'PUT',
  body: JSON.stringify({
    language: "hi"  // "en" or "hi"
  })
});
```

### 7. Get User Stats

```javascript
// GET /user/stats
const response = await apiCall('/user/stats');

// Response
{
  "success": true,
  "data": {
    "total_scans": 15,
    "coupons_won": 5,
    "rewards_claimed": 3,
    "last_scan_date": "2026-01-10T12:00:00.000Z",
    "total_savings": 500
  }
}
```

### 8. Get Crop Preferences

```javascript
// GET /user/crops
const response = await apiCall('/user/crops');

// Response
{
  "success": true,
  "data": {
    "crop_ids": ["wheat", "rice"],
    "crops": [
      { "id": "wheat", "name": "Wheat", "name_hi": "गेहूं" },
      { "id": "rice", "name": "Rice", "name_hi": "चावल" }
    ]
  }
}
```

### 9. Sync Crop Preferences

```javascript
// POST /user/crops
const response = await apiCall('/user/crops', {
  method: 'POST',
  body: JSON.stringify({
    crop_ids: ["wheat", "rice", "cotton"]
  })
});
```

### 10. Get Coupon History

```javascript
// GET /user/coupons
const response = await apiCall('/user/coupons');

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "ABC123XYZ456",
      "scanned_at": "2026-01-10T12:00:00.000Z",
      "reward": {
        "type": "CASHBACK",
        "amount": 100
      }
    }
  ]
}
```

### 11. Get User Rewards

```javascript
// GET /user/rewards
const response = await apiCall('/user/rewards');

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "CASHBACK",
      "amount": 100,
      "status": "PENDING",
      "won_at": "2026-01-10T12:00:00.000Z",
      "product_name": "Product XYZ"
    }
  ]
}
```

---

## 🎟️ Coupons (Auth Required)

### 1. Verify Coupon

```javascript
// POST /coupons/verify
const response = await apiCall('/coupons/verify', {
  method: 'POST',
  body: JSON.stringify({
    coupon_code: "ABC123XYZ456"
  })
});

// Response (if valid)
{
  "success": true,
  "data": {
    "is_valid": true,
    "coupon": {
      "id": "uuid",
      "code": "ABC123XYZ456",
      "product": {
        "id": "product-uuid",
        "name": "Product XYZ"
      },
      "batch_number": "BATCH001"
    },
    "campaign": {
      "id": "campaign-uuid",
      "name": "Campaign Name",
      "tier": {
        "id": "tier-uuid",
        "reward_name": "Cashback ₹100",
        "reward_name_hi": "कैशबैक ₹100",
        "reward_type": "CASHBACK",
        "reward_value": 100
      }
    }
  }
}

// If invalid
{
  "success": false,
  "error": {
    "code": "COUPON_INVALID",
    "message": "This coupon code is invalid."
  }
}
```

### 2. Redeem Coupon (Claim Prize)

```javascript
// POST /coupons/redeem
// Note: First call /coupons/verify to get coupon_id and campaign_tier_id
const response = await apiCall('/coupons/redeem', {
  method: 'POST',
  body: JSON.stringify({
    coupon_id: "coupon-uuid",
    campaign_tier_id: "tier-uuid"
  })
});

// Response
{
  "success": true,
  "data": {
    "redemption": {
      "id": "redemption-uuid",
      "coupon_code": "ABC123XYZ456",
      "prize": {
        "name": "Cashback ₹100",
        "name_hi": "कैशबैक ₹100",
        "description": "Get cashback worth ₹100",
        "type": "CASHBACK",
        "value": 100
      },
      "status": "PENDING_VERIFICATION",
      "assigned_rank": 1,
      "rank_display": "1st Winner",
      "redeemed_at": "2026-01-10T12:00:00.000Z"
    }
  }
}
```

---

## 🏪 Distributors

### 1. Get Nearby Distributors

```javascript
// GET /distributors?pincode=400001
const response = await apiCall('/distributors?pincode=400001');

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "ABC Agro Store",
      "owner_name": "Ramesh Kumar",
      "address": "123 Main Street, Mumbai",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "phone": "9876543210",
      "email": "store@example.com",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "distance_km": 2.5,
      "is_active": true
    }
  ]
}
```

### 2. Get Distributor by ID

```javascript
// GET /distributors/:id
const response = await apiCall('/distributors/distributor-uuid');
```

### 3. Get Distributor Coverage

```javascript
// GET /distributors/:id/coverage
const response = await apiCall('/distributors/distributor-uuid/coverage');

// Response
{
  "success": true,
  "data": {
    "distributor_id": "uuid",
    "coverage_areas": [
      {
        "pincode": "400001",
        "city": "Mumbai",
        "state": "Maharashtra"
      }
    ],
    "total_products": 50
  }
}
```

---

## 📱 QR Code Scanning (Auth Required)

### Scan and Redeem QR Code

```javascript
// POST /scan/redeem
const response = await apiCall('/scan/redeem', {
  method: 'POST',
  body: JSON.stringify({
    code: "QR_CODE_STRING"
  })
});

// Response
{
  "success": true,
  "data": {
    "redemption": {
      "id": "redemption-uuid",
      "coupon_code": "ABC123XYZ456",
      "prize_type": "CASHBACK",
      "prize_value": 100,
      "status": "PENDING_VERIFICATION",
      "scanned_at": "2026-01-10T12:00:00.000Z"
    },
    "reward": {
      "name": "Cashback ₹100",
      "name_hi": "कैशबैक ₹100",
      "type": "CASHBACK",
      "value": 100,
      "image_url": null
    },
    "message": "Reward claimed successfully!"
  }
}
```

---

## 🏆 Rewards (Auth Required)

### Get Reward Certificate

```javascript
// GET /rewards/:id/certificate
const response = await apiCall('/rewards/redemption-uuid/certificate');

// Response (if certificate exists)
{
  "success": true,
  "data": {
    "certificate_url": "https://cloudinary.com/...",
    "download_url": "https://cloudinary.com/..."
  }
}

// Response (if certificate needs to be generated)
{
  "success": true,
  "data": {
    "certificate_data": {
      "winner_name": "John Doe",
      "phone_number": "9876543210",
      "coupon_code": "ABC123XYZ456",
      "prize_name": "Cashback ₹100",
      "prize_value": 100,
      "prize_type": "CASHBACK",
      "rank": 1,
      "won_date": "2026-01-10T12:00:00.000Z",
      "status": "PENDING_VERIFICATION"
    },
    "certificate_url": null
  }
}
```

---

## 🔔 Notifications (Auth Required)

### 1. Get Notifications

```javascript
// GET /notifications
const response = await apiCall('/notifications');

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "New Reward!",
      "message": "You won ₹100 cashback",
      "type": "REWARD",
      "is_read": false,
      "created_at": "2026-01-10T12:00:00.000Z"
    }
  ]
}
```

### 2. Mark as Read

```javascript
// PUT /notifications/:id/read
const response = await apiCall('/notifications/notification-uuid/read', {
  method: 'PUT'
});
```

### 3. Mark All as Read

```javascript
// PUT /notifications/read-all
const response = await apiCall('/notifications/read-all', {
  method: 'PUT'
});
```

### 4. Delete Notification

```javascript
// DELETE /notifications/:id
const response = await apiCall('/notifications/notification-uuid', {
  method: 'DELETE'
});
```

### 5. Delete All Notifications

```javascript
// DELETE /notifications
const response = await apiCall('/notifications', {
  method: 'DELETE'
});
```

---

## 🔍 Search

### Global Search

```javascript
// GET /search?q=keyword
const response = await apiCall('/search?q=rice');

// Response
{
  "success": true,
  "data": {
    "products": [
      { "id": "...", "name": "...", "slug": "...", "images": [...] }
    ],
    "categories": [
      { "id": "...", "name": "...", "slug": "..." }
    ],
    "crops": [
      { "id": "...", "name": "...", "slug": "..." }
    ]
  }
}
```

---

## ⚙️ Config & Banners

### 1. Get App Config

```javascript
// GET /config
const response = await apiCall('/config');
```

### 2. Get Banners

```javascript
// GET /config/banners
// Also available at: /banners (alias)
const response = await apiCall('/config/banners');

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Summer Sale",
      "title_hi": "गर्मी की बिक्री",
      "image_url": "https://...",
      "link": "/products",
      "display_order": 1,
      "is_active": true,
      "created_at": "2026-01-10T12:00:00.000Z"
    }
  ]
}
```

---

## 📄 Support & Pages

### 1. Get FAQ

```javascript
// GET /support/faqs
const response = await apiCall('/support/faqs');
```

### 2. Contact Support

```javascript
// POST /support/contact
// Note: Auth is optional - can be called without login
const response = await apiCall('/support/contact', {
  method: 'POST',
  body: JSON.stringify({
    name: "John Doe",
    mobile: "9876543210",
    email: "john@example.com",  // optional
    subject: "Product Inquiry",
    message: "I need help with..."
  })
});

// Response
{
  "success": true,
  "data": {
    "ticket_id": "TKT-20260111-001",
    "message": "Your message has been received. We'll get back to you soon."
  }
}
```

### 3. Get Page Content

```javascript
// GET /support/:slug (terms, privacy-policy, about)
const terms = await apiCall('/support/terms');
const privacy = await apiCall('/support/privacy-policy');
const about = await apiCall('/support/about');

// Response
{
  "success": true,
  "data": {
    "slug": "terms",
    "title": "Terms and Conditions",
    "title_hi": "नियम और शर्तें",
    "content": "Page content here...",
    "content_hi": "पृष्ठ सामग्री यहाँ...",
    "updated_at": "2026-01-10T12:00:00.000Z"
  }
}
```

---

## 🏥 Health Check

```javascript
// GET /health (No /api/v1 prefix)
const response = await fetch('http://localhost:3001/health');

// Response
{
  "success": true,
  "message": "Agrio India API is running",
  "timestamp": "2026-01-11T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

# 🔐 ADMIN APIs (Admin Panel)

---

## Admin Authentication

### Admin Login

```javascript
// POST /admin/auth/login
const response = await fetch(`${API_URL}/admin/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "admin@agrioindia.com",
    password: "admin123"
  })
});

// Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "...",
    "admin": {
      "id": "uuid",
      "name": "Super Admin",
      "email": "admin@agrioindia.com",
      "role": "SUPER_ADMIN"
    }
  }
}

// Save admin token
localStorage.setItem('adminToken', response.data.token);
localStorage.setItem('adminRefreshToken', response.data.refresh_token);
```

### Admin Refresh Token

```javascript
// POST /admin/auth/refresh
const response = await adminApiCall('/admin/auth/refresh', {
  method: 'POST',
  body: JSON.stringify({
    refresh_token: localStorage.getItem('adminRefreshToken')
  })
});

// Response
{
  "success": true,
  "data": {
    "token": "new-access-token",
    "refresh_token": "new-refresh-token"
  }
}
```

### Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@agrioindia.com` |
| Password | `admin123` |
| Role | `SUPER_ADMIN` |

---

## Admin Dashboard

### Get Dashboard Stats

```javascript
// GET /admin/dashboard/stats
const response = await adminApiCall('/admin/dashboard/stats');

// Response
{
  "success": true,
  "data": {
    "total_users": 150,
    "total_products": 50,
    "total_orders": 200,
    "total_revenue": 50000,
    "total_coupons_scanned": 500,
    "recent_activity": [...]
  }
}
```

---

## Admin Products

### 1. List Products

```javascript
// GET /admin/products?page=1&limit=10
const response = await adminApiCall('/admin/products?page=1&limit=10');

// Response
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Product Name",
        "name_hi": "...",
        "slug": "...",
        "category": "Insecticides",
        "is_best_seller": true,
        "is_active": true,
        "sales_count": 100,
        "pack_sizes": 3,
        "created_at": "..."
      }
    ],
    "pagination": { ... }
  }
}
```

### 2. Get Single Product

```javascript
// GET /admin/products/:id
const response = await adminApiCall('/admin/products/product-uuid');
```

### 3. Create Product

```javascript
// POST /admin/products
const response = await adminApiCall('/admin/products', {
  method: 'POST',
  body: JSON.stringify({
    name: "New Product",
    name_hi: "नया उत्पाद",
    category_id: "insecticide",
    description: "Product description",
    description_hi: "उत्पाद विवरण",
    composition: "Chemical composition",
    dosage: "Dosage info",
    application_method: "How to apply",
    target_pests: ["pest1", "pest2"],
    suitable_crops: ["wheat", "rice"],
    safety_precautions: ["precaution1"],
    images: ["url1", "url2"],
    is_best_seller: false,
    is_active: true,
    pack_sizes: [
      { size: "100ml", sku: "SKU001", mrp: 150, selling_price: 120 },
      { size: "250ml", sku: "SKU002", mrp: 300, selling_price: 250 }
    ]
  })
});
```

### 4. Update Product

```javascript
// PUT /admin/products/:id
const response = await adminApiCall('/admin/products/product-uuid', {
  method: 'PUT',
  body: JSON.stringify({
    name: "Updated Product Name",
    is_best_seller: true
  })
});
```

### 5. Delete Product

```javascript
// DELETE /admin/products/:id
const response = await adminApiCall('/admin/products/product-uuid', {
  method: 'DELETE'
});
```

---

## Admin Users

### 1. List Users

```javascript
// GET /admin/users?page=1&limit=10
const response = await adminApiCall('/admin/users?page=1&limit=10');

// Response
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "phone_number": "9876543210",
        "name": "John Doe",
        "email": "john@example.com",
        "pincode": "400001",
        "role": "USER",
        "total_scans": 15,
        "total_rewards": 5,
        "created_at": "..."
      }
    ],
    "pagination": { ... }
  }
}
```

### 2. Get Single User

```javascript
// GET /admin/users/:id
const response = await adminApiCall('/admin/users/user-uuid');
```

### 3. Export Users

```javascript
// GET /admin/users/export
const response = await adminApiCall('/admin/users/export');

// Response (CSV file download)
// Returns CSV file with all user data
```

### 4. Update User Status

```javascript
// PUT /admin/users/:id/status
const response = await adminApiCall('/admin/users/user-uuid/status', {
  method: 'PUT',
  body: JSON.stringify({
    is_active: false  // true or false
  })
});
```

---

## Admin Campaigns

### 1. List Campaigns

```javascript
// GET /admin/campaigns?page=1&limit=10&is_active=true
const response = await adminApiCall('/admin/campaigns?page=1&limit=10');

// Response
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "uuid",
        "name": "Summer Sale Campaign",
        "name_hi": "गर्मी की बिक्री अभियान",
        "description": "Campaign description",
        "start_date": "2026-01-01T00:00:00.000Z",
        "end_date": "2026-12-31T23:59:59.000Z",
        "is_active": true,
        "distribution_type": "RANDOM",
        "total_qr_codes": 1000,
        "coupon_count": 500,
        "tiers": [
          {
            "id": "tier-uuid",
            "tier_name": "Gold Tier",
            "reward_name": "₹500 Cashback",
            "reward_name_hi": "₹500 कैशबैक",
            "reward_type": "CASHBACK",
            "reward_value": 500,
            "probability": 0.1,
            "priority": 1,
            "max_winners": 5,
            "current_winners": 2
          }
        ],
        "created_at": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 2. Get Campaign by ID

```javascript
// GET /admin/campaigns/:id
const response = await adminApiCall('/admin/campaigns/campaign-uuid');
```

### 3. Create Campaign

```javascript
// POST /admin/campaigns
const response = await adminApiCall('/admin/campaigns', {
  method: 'POST',
  body: JSON.stringify({
    name: "Summer Sale Campaign",
    name_hi: "गर्मी की बिक्री अभियान",
    description: "Campaign description",
    start_date: "2026-01-01",  // ISO date or YYYY-MM-DD
    end_date: "2026-12-31",
    distribution_type: "RANDOM",  // "RANDOM" or "SEQUENTIAL"
    is_active: true,
    tiers: [
      {
        tier_name: "Gold Tier",
        reward_name: "₹500 Cashback",
        reward_name_hi: "₹500 कैशबैक",
        reward_type: "CASHBACK",  // "CASHBACK", "DISCOUNT", "GIFT", "POINTS"
        reward_value: 500,
        probability: 0.1,  // 10% chance (0-1)
        priority: 1,
        max_winners: 5  // Optional
      },
      {
        tier_name: "Silver Tier",
        reward_name: "₹100 Discount",
        reward_name_hi: "₹100 छूट",
        reward_type: "DISCOUNT",
        reward_value: 100,
        probability: 0.9,  // 90% chance
        priority: 2,
        max_winners: 50
      }
    ]
  })
});

// Response
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "id": "campaign-uuid",
    "name": "Summer Sale Campaign",
    "tiers": [...],
    "created_at": "2026-01-11T12:00:00.000Z"
  }
}
```

**Important Notes:**
- At least one tier is required
- Total probability of all tiers should not exceed 1.0
- End date must be after start date
- Reward types: `CASHBACK`, `DISCOUNT`, `GIFT`, `POINTS`
- Distribution types: `RANDOM` (default) or `SEQUENTIAL`

### 4. Update Campaign

```javascript
// PUT /admin/campaigns/:id
const response = await adminApiCall('/admin/campaigns/campaign-uuid', {
  method: 'PUT',
  body: JSON.stringify({
    name: "Updated Campaign Name",
    is_active: false
  })
});
```

### 5. Delete Campaign

```javascript
// DELETE /admin/campaigns/:id
// Note: Cannot delete if campaign has coupons. Delete coupons first.
const response = await adminApiCall('/admin/campaigns/campaign-uuid', {
  method: 'DELETE'
});
```

---

## Admin Coupons

### 1. List Coupons

```javascript
// GET /admin/coupons?page=1&limit=10
const response = await adminApiCall('/admin/coupons?page=1&limit=10');
```

### 2. Create Coupons (Batch)

```javascript
// POST /admin/coupons/generate
// Note: Coupons are generated for a Campaign. Campaign must have Tiers defined with rewards.
// First create a Campaign with Tiers, then generate coupons for that campaign.
const response = await adminApiCall('/admin/coupons/generate', {
  method: 'POST',
  body: JSON.stringify({
    campaign_id: "campaign-uuid",  // REQUIRED - Campaign must exist with tiers
    count: 100,  // Number of coupons to generate (1-10000)
    product_id: "product-uuid",  // Optional - Link product to coupons
    prefix: "AGRI",  // Optional - Prefix for coupon codes
    expiry_date: "2026-12-31"  // Optional - ISO date string
  })
});

// Response
{
  "success": true,
  "message": "100 QR codes generated successfully for campaign",
  "data": {
    "generated_count": 100,
    "batch_id": "BATCH-20260111-001",
    "campaign_id": "campaign-uuid"
  }
}
```

**Important Notes:**
- `campaign_id` is **REQUIRED** - You must create a Campaign first with reward Tiers
- `count` (not `quantity`) - Number of coupons to generate
- `batch_name` is auto-generated by backend
- `reward_type` and `reward_amount` belong to Campaign Tiers, not coupon generation
- Campaign Tiers define the rewards users can win when scanning coupons

### 3. Get Coupon Details

```javascript
// GET /admin/coupons/:id
const response = await adminApiCall('/admin/coupons/coupon-uuid');
```

---

## Admin Distributors

### 1. List Distributors

```javascript
// GET /admin/distributors?page=1&limit=10
const response = await adminApiCall('/admin/distributors?page=1&limit=10');
```

### 2. Create Distributor

```javascript
// POST /admin/distributors
const response = await adminApiCall('/admin/distributors', {
  method: 'POST',
  body: JSON.stringify({
    name: "ABC Agro Store",
    owner_name: "Ramesh Kumar",
    address: "123 Main Street",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    phone: "9876543210",
    email: "store@example.com",
    latitude: 19.0760,
    longitude: 72.8777
  })
});
```

### 3. Update Distributor

```javascript
// PUT /admin/distributors/:id
// Note: Can upload signature and stamp files using FormData
const formData = new FormData();
formData.append('name', 'Updated Store Name');
formData.append('signature', signatureFile); // optional
formData.append('stamp', stampFile); // optional

const response = await fetch(`${API_URL}/admin/distributors/distributor-uuid`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
  },
  body: formData
});
```

### 4. Delete Distributor

```javascript
// DELETE /admin/distributors/:id
const response = await adminApiCall('/admin/distributors/distributor-uuid', {
  method: 'DELETE'
});
```

---

## Admin Settings

### Get Settings

```javascript
// GET /admin/settings
const response = await adminApiCall('/admin/settings');
```

### Update Settings

```javascript
// PUT /admin/settings
const response = await adminApiCall('/admin/settings', {
  method: 'PUT',
  body: JSON.stringify({
    app_name: "Agrio India",
    support_email: "support@agrioindia.com",
    support_phone: "1800-XXX-XXXX"
  })
});
```

---

## Admin Reports

### Get Report Data

```javascript
// GET /admin/reports/:type?from=2026-01-01&to=2026-01-31
const response = await adminApiCall('/admin/reports/sales?from=2026-01-01&to=2026-01-31');

// Available report types: sales, users, coupons, rewards, distributors
```

### Export Report

```javascript
// GET /admin/reports/:type/export?from=2026-01-01&to=2026-01-31
const response = await adminApiCall('/admin/reports/sales/export?from=2026-01-01&to=2026-01-31');

// Response (CSV/Excel file download)
```

---

## Admin Banners

### 1. List All Banners

```javascript
// GET /admin/banners
const response = await adminApiCall('/admin/banners');
```

### 2. Create Banner

```javascript
// POST /admin/banners
const formData = new FormData();
formData.append('title', 'Summer Sale');
formData.append('title_hi', 'गर्मी की बिक्री');
formData.append('image', imageFile);
formData.append('link', '/products');
formData.append('display_order', '1');
formData.append('is_active', 'true');

const response = await fetch(`${API_URL}/admin/banners`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
  },
  body: formData
});
```

### 3. Update Banner

```javascript
// PUT /admin/banners/:id
const response = await adminApiCall('/admin/banners/banner-uuid', {
  method: 'PUT',
  body: JSON.stringify({
    title: "Updated Title",
    is_active: false
  })
});
```

### 4. Delete Banner

```javascript
// DELETE /admin/banners/:id
const response = await adminApiCall('/admin/banners/banner-uuid', {
  method: 'DELETE'
});
```

---

## Admin CMS (Content Management)

### FAQ Management

#### 1. Get All FAQs

```javascript
// GET /admin/cms/faqs
const response = await adminApiCall('/admin/cms/faqs');
```

#### 2. Create FAQ

```javascript
// POST /admin/cms/faqs
const response = await adminApiCall('/admin/cms/faqs', {
  method: 'POST',
  body: JSON.stringify({
    question: "How do I scan a coupon?",
    question_hi: "मैं कूपन कैसे स्कैन करूं?",
    answer: "Open the app and use the scan feature...",
    answer_hi: "ऐप खोलें और स्कैन सुविधा का उपयोग करें...",
    category: "GENERAL",
    order: 1
  })
});
```

#### 3. Update FAQ

```javascript
// PUT /admin/cms/faqs/:id
const response = await adminApiCall('/admin/cms/faqs/faq-uuid', {
  method: 'PUT',
  body: JSON.stringify({
    question: "Updated question"
  })
});
```

#### 4. Delete FAQ

```javascript
// DELETE /admin/cms/faqs/:id
const response = await adminApiCall('/admin/cms/faqs/faq-uuid', {
  method: 'DELETE'
});
```

### Page Management

#### 1. Get All Pages

```javascript
// GET /admin/cms/pages
const response = await adminApiCall('/admin/cms/pages');
```

#### 2. Update Page

```javascript
// PUT /admin/cms/pages/:slug
const response = await adminApiCall('/admin/cms/pages/terms', {
  method: 'PUT',
  body: JSON.stringify({
    title: "Terms and Conditions",
    title_hi: "नियम और शर्तें",
    content: "Updated content...",
    content_hi: "अपडेट की गई सामग्री..."
  })
});
```

---

# 📊 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

---

# 🚨 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Token missing or invalid |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INVALID_COUPON` | 400 | Coupon is invalid or used |
| `EXPIRED_COUPON` | 400 | Coupon has expired |
| `INTERNAL_ERROR` | 500 | Server error |

---

# 📝 Quick Reference

## Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List products |
| GET | `/products/best-sellers` | Best selling products |
| GET | `/products/new-arrivals` | New arrivals |
| GET | `/products/featured` | Featured products |
| GET | `/products/search?q=` | Search products |
| GET | `/products/:slug` | Single product |
| GET | `/categories` | All categories |
| GET | `/crops` | All crops |
| GET | `/distributors?pincode=` | Nearby distributors |
| GET | `/search?q=` | Global search |
| GET | `/config/banners` | App banners |
| GET | `/banners` | App banners (alias) |
| GET | `/support/faqs` | FAQ |
| GET | `/support/:slug` | Get page (terms, privacy-policy, about) |
| GET | `/pages/:slug` | Get page (alias) |
| POST | `/auth/dev-login` | Dev login |
| POST | `/auth/send-otp` | Send OTP |
| POST | `/auth/verify-otp` | Verify OTP |
| GET | `/categories/:id` | Get category by ID |
| GET | `/distributors/:id/coverage` | Get distributor coverage |

## User Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/profile` | Get profile |
| POST | `/user/profile` | Create profile |
| PUT | `/user/profile` | Update profile |
| PUT | `/user/language` | Update language |
| GET | `/user/stats` | User statistics |
| GET | `/user/crops` | Crop preferences |
| POST | `/user/crops` | Update crops |
| GET | `/user/coupons` | Coupon history |
| GET | `/user/rewards` | User rewards |
| GET | `/products/recommended` | Recommended products |
| PATCH | `/user/profile/avatar` | Update avatar |
| POST | `/coupons/verify` | Verify coupon |
| POST | `/coupons/redeem` | Redeem coupon |
| POST | `/scan/redeem` | Scan QR code |
| GET | `/rewards/:id/certificate` | Get reward certificate |
| GET | `/notifications` | Notifications |
| PUT | `/notifications/:id/read` | Mark read |
| PUT | `/notifications/read-all` | Mark all read |
| DELETE | `/notifications/:id` | Delete notification |
| DELETE | `/notifications` | Delete all notifications |
| POST | `/auth/logout` | Logout |
| POST | `/auth/refresh-token` | Refresh token |

## Admin Endpoints (Admin Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/auth/login` | Admin login |
| POST | `/admin/auth/refresh` | Admin refresh token |
| GET | `/admin/dashboard/stats` | Dashboard stats |
| GET | `/admin/products` | List products |
| POST | `/admin/products` | Create product |
| GET | `/admin/products/:id` | Get product |
| PUT | `/admin/products/:id` | Update product |
| DELETE | `/admin/products/:id` | Delete product |
| GET | `/admin/users` | List users |
| GET | `/admin/users/:id` | Get user details |
| GET | `/admin/users/export` | Export users |
| PUT | `/admin/users/:id/status` | Update user status |
| GET | `/admin/campaigns` | List campaigns |
| GET | `/admin/campaigns/:id` | Get campaign |
| POST | `/admin/campaigns` | Create campaign |
| PUT | `/admin/campaigns/:id` | Update campaign |
| DELETE | `/admin/campaigns/:id` | Delete campaign |
| GET | `/admin/coupons` | List coupons |
| GET | `/admin/coupons/:id` | Get coupon details |
| POST | `/admin/coupons/generate` | Generate coupons |
| GET | `/admin/distributors` | List distributors |
| GET | `/admin/distributors/:id` | Get distributor |
| POST | `/admin/distributors` | Create distributor |
| PUT | `/admin/distributors/:id` | Update distributor |
| DELETE | `/admin/distributors/:id` | Delete distributor |
| GET | `/admin/settings` | Get settings |
| PUT | `/admin/settings` | Update settings |
| GET | `/admin/reports/:type` | Get report data |
| GET | `/admin/reports/:type/export` | Export report |
| GET | `/admin/banners` | List banners |
| POST | `/admin/banners` | Create banner |
| PUT | `/admin/banners/:id` | Update banner |
| DELETE | `/admin/banners/:id` | Delete banner |
| GET | `/admin/cms/faqs` | List FAQs |
| POST | `/admin/cms/faqs` | Create FAQ |
| PUT | `/admin/cms/faqs/:id` | Update FAQ |
| DELETE | `/admin/cms/faqs/:id` | Delete FAQ |
| GET | `/admin/cms/pages` | List pages |
| PUT | `/admin/cms/pages/:slug` | Update page |

---

# 📞 Backend Info

| Property | Value |
|----------|-------|
| **Local Backend** | `http://localhost:3001` |
| **API Base URL** | `http://localhost:3001/api/v1` |
| **Health Check** | `http://localhost:3001/health` |
| **Admin Email** | `admin@agrioindia.com` |
| **Admin Password** | `admin123` |
| **Dev OTP Code** | `123456` |

---

**Document Version:** 2.1  
**Last Updated:** January 11, 2026  
**Status:** ✅ Complete - All endpoints verified and documented
