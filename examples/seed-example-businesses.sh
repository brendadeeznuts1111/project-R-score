#!/bin/bash
# Seed example businesses for the registry

PROXY_URL="${PROXY_URL:-http://localhost:3002}"
ADMIN_SECRET="${ADMIN_SECRET:-admin-secret-change-in-production}"

echo "🌱 Seeding example businesses..."
echo ""

# Business 1: Haircut Salon
echo "1. Registering HaircutPro..."
curl -s -X POST "${PROXY_URL}/admin/business" \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HaircutPro Barbershop",
    "alias": "HaircutPro",
    "startDate": "2024-01-15T00:00:00Z",
    "paymentHandles": {
      "cashapp": "$HaircutPro",
      "venmo": "@HaircutPro",
      "paypal": "paypal.me/HaircutPro"
    },
    "contact": "hello@haircutpro.com",
    "location": "123 Main St",
    "branding": {
      "primaryColor": "#FF6B35",
      "secondaryColor": "#FF8C5A",
      "backgroundColor": "linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)",
      "logoText": "HP"
    },
    "specialty": {
      "type": "barbershop",
      "services": ["Haircut", "Beard Trim", "Hot Towel Shave", "Hair Styling", "Fade"],
      "pricing": [
        {"item": "Haircut", "price": "$25"},
        {"item": "Beard Trim", "price": "$15"},
        {"item": "Full Service", "price": "$35"}
      ],
      "hours": "Mon-Sat 9AM-7PM",
      "specialties": ["Classic Cuts", "Modern Fades", "Beard Grooming"]
    }
  }' | jq -r '.businessId // "Error"'
echo ""

# Business 2: Coffee Shop
echo "2. Registering CoffeeCorner..."
curl -s -X POST "${PROXY_URL}/admin/business" \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coffee Corner",
    "alias": "CoffeeCorner",
    "startDate": "2024-02-01T00:00:00Z",
    "paymentHandles": {
      "cashapp": "$CoffeeCorner",
      "venmo": "@CoffeeCorner",
      "paypal": "paypal.me/CoffeeCorner"
    },
    "contact": "info@coffeecorner.com",
    "location": "456 Oak Ave",
    "branding": {
      "primaryColor": "#8B4513",
      "secondaryColor": "#A0522D",
      "backgroundColor": "linear-gradient(135deg, #8B4513 0%, #A0522D 100%)",
      "logoText": "☕"
    },
    "specialty": {
      "type": "coffee",
      "menuItems": ["Espresso", "Cappuccino", "Latte", "Cold Brew", "Mocha"],
      "popularItems": ["Caramel Macchiato", "Vanilla Latte", "Iced Coffee"],
      "hours": "Daily 6AM-8PM",
      "specialties": ["Single Origin", "Artisan Roasts", "Plant-Based Options"]
    }
  }' | jq -r '.businessId // "Error"'
echo ""

# Business 3: Fitness Studio
echo "3. Registering FitZone..."
curl -s -X POST "${PROXY_URL}/admin/business" \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FitZone Gym",
    "alias": "FitZone",
    "startDate": "2024-02-10T00:00:00Z",
    "paymentHandles": {
      "cashapp": "$FitZone",
      "venmo": "@FitZone",
      "paypal": "paypal.me/FitZone"
    },
    "contact": "membership@fitzone.com",
    "location": "789 Fitness Blvd",
    "branding": {
      "primaryColor": "#00D632",
      "secondaryColor": "#00B82E",
      "backgroundColor": "linear-gradient(135deg, #00D632 0%, #00B82E 100%)",
      "logoText": "💪"
    },
    "specialty": {
      "type": "gym",
      "membershipTiers": [
        {"name": "Basic", "price": "$29/mo"},
        {"name": "Premium", "price": "$49/mo"},
        {"name": "Elite", "price": "$79/mo"}
      ],
      "specialties": ["Cardio Equipment", "Weight Training", "Yoga Studio", "Personal Training"],
      "hours": "24/7 Access",
      "popularItems": ["Personal Training", "Group Classes", "Nutrition Counseling"]
    }
  }' | jq -r '.businessId // "Error"'
echo ""

# Business 4: Restaurant
echo "4. Registering TastyBites..."
curl -s -X POST "${PROXY_URL}/admin/business" \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tasty Bites Restaurant",
    "alias": "TastyBites",
    "startDate": "2024-02-20T00:00:00Z",
    "paymentHandles": {
      "cashapp": "$TastyBites",
      "venmo": "@TastyBites",
      "paypal": "paypal.me/TastyBites"
    },
    "contact": "reservations@tastybites.com",
    "location": "321 Food St",
    "branding": {
      "primaryColor": "#FF4500",
      "secondaryColor": "#FF6347",
      "backgroundColor": "linear-gradient(135deg, #FF4500 0%, #FF6347 100%)",
      "logoText": "🍽️"
    },
    "specialty": {
      "type": "restaurant",
      "menuItems": ["Grilled Salmon", "Pasta Carbonara", "Caesar Salad", "Ribeye Steak", "Tiramisu"],
      "popularItems": ["Signature Burger", "Truffle Pasta", "Chocolate Lava Cake"],
      "hours": "Tue-Sun 5PM-11PM",
      "specialties": ["Farm to Table", "Wine Selection", "Private Dining"]
    }
  }' | jq -r '.businessId // "Error"'
echo ""

# Business 5: Bookstore
echo "5. Registering BookNook..."
curl -s -X POST "${PROXY_URL}/admin/business" \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Book Nook",
    "alias": "BookNook",
    "startDate": "2024-03-01T00:00:00Z",
    "paymentHandles": {
      "cashapp": "$BookNook",
      "venmo": "@BookNook",
      "paypal": "paypal.me/BookNook"
    },
    "contact": "books@booknook.com",
    "location": "555 Library Lane",
    "branding": {
      "primaryColor": "#4A90E2",
      "secondaryColor": "#6BA3E8",
      "backgroundColor": "linear-gradient(135deg, #4A90E2 0%, #6BA3E8 100%)",
      "logoText": "📚"
    },
    "specialty": {
      "type": "bookstore",
      "categories": ["Fiction", "Non-Fiction", "Mystery", "Sci-Fi", "Biography"],
      "popularItems": ["The Seven Husbands", "Atomic Habits", "Project Hail Mary"],
      "hours": "Mon-Sat 10AM-8PM, Sun 12PM-6PM",
      "specialties": ["Author Events", "Book Clubs", "Rare Books"]
    }
  }' | jq -r '.businessId // "Error"'
echo ""

echo "✅ Example businesses seeded!"
echo ""
echo "View registry at:"
echo "http://localhost:3004/registry"
echo ""
echo "Or start the registry server:"
echo "bun run start:business-registry"
