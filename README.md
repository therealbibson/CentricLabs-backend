# CentricLabs API (backend)

Separate Express + JavaScript API for the CentricLabs store. Plain Node.js /
Express — no TypeScript. Products, services, orders and quotes live in
MongoDB when connected, otherwise in memory (see below).

## Structure

```
backend/
  app.js                 # root entry: creates the Express app, mounts
                         # middleware + routes, connects the DB, listens
                         # on port 4000, exports the app
  package.json           # start: node app.js · dev: nodemon app.js
                         # seed: node seed.js
  seed.js                # seeds the 16 sample products + 4 services
  .env.example           # example env vars (gitignored — see below)
  .gitignore             # node_modules/, dist/, .env, .env.example, *.log
  config/
    db.js                # MongoDB connection (MONGODB_URI), mongodb vs
                         # in-memory fallback
  data/
    sampleData.js        # THE catalogue: 16 sample products + 4 services
  models/                # Mongoose models, one file per model
    Product.js  Service.js  Order.js  Quote.js
  middlewares/
    adminAuth.js         # admin Bearer-token check
    errorHandler.js      # async wrapper + final error handler
  components/            # business logic / data access: MongoDB when
                         # connected, otherwise the in-memory store
    products.js  services.js  orders.js  quotes.js  admin.js
  routes/                # thin Express routers, one per resource
    products.js  orders.js  quotes.js  services.js  admin.js
  utils/
    store.js             # in-memory store for the no-MongoDB mode
```

## Run

```bash
npm install
npm run dev      # http://localhost:4000 (nodemon)
npm start        # node app.js
```

Set `PORT` to change the port (default 4000).

## Environment variables

`.env.example` is **gitignored** — it stays in the project as a template,
but it is not tracked by git, so it will not be pushed to GitHub. (Note: an
earlier copy was already pushed to GitHub in the first backend snapshot,
commit `3d04fd6` — gitignore alone does not remove that already-pushed
copy; it still needs deleting from GitHub.)

To run locally, copy it and fill in your own values:

```bash
cp .env.example .env
```

| Variable | What it does |
| --- | --- |
| `MONGODB_URI` | e.g. `mongodb://localhost:27017/centriclabs`. Unset = in-memory mode. |
| `PORT` | API port, default `4000`. |
| `ADMIN_PASSWORD` | Password for `POST /api/admin/login`. Demo default `admin123` — **CHANGE ME** before any real deployment. |

Never commit a real `.env` file, and never put real credentials in the repo.

## Database — MongoDB (optional, with in-memory fallback)

The backend uses Mongoose with models in `models/`: `Product`, `Service`,
`Order`, `Quote`.

- **No MongoDB?** The API still works. If `MONGODB_URI` is not set, or
  MongoDB cannot be reached, it logs a warning and serves the in-memory
  sample data from `data/sampleData.js`; orders and quotes are kept in
  memory until the server restarts.
- **With MongoDB:** set `MONGODB_URI`, e.g.
  `MONGODB_URI=mongodb://localhost:27017/centriclabs` (see `.env.example`),
  start MongoDB, then seed the catalogue:
  ```bash
  npm run seed   # inserts the 16 sample products + 4 services, only if empty
  ```
  Products/services are then read from MongoDB, and orders/quotes are saved
  there. If the products collection is empty (not seeded yet), the API falls
  back to the sample data so the shop never renders empty.
- **`/health`** reports `"database": "mongodb"` or `"in-memory"` so you can
  tell at a glance which mode the server is in.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | `{ ok: true, products: 16 }` |
| GET | `/api/products` | All products. Optional `?category=` and `?search=` |
| GET | `/api/products/:id` | One product, or 404 |
| GET | `/api/categories` | Category names |
| GET | `/api/services` | The 4 services |
| POST | `/api/orders` | Create an order — see below |
| GET | `/api/orders` | Orders placed since the server started |
| POST | `/api/quotes` | Request a service quote |
| GET | `/api/quotes` | Quote requests since the server started |
| POST | `/api/admin/login` | Admin login — `{ password }` → `{ token }` |
| GET | `/api/admin/stats` | 🔒 Dashboard totals + low stock + recent orders |
| GET | `/api/admin/customers` | 🔒 Customers derived from orders & quotes |
| GET | `/api/admin/quotes` | 🔒 Quote requests (with status) |
| POST | `/api/products` | 🔒 Add a product |
| PUT | `/api/products/:id` | 🔒 Edit a product (price, stock, …) |
| DELETE | `/api/products/:id` | 🔒 Delete a product |
| PUT | `/api/orders/:id` | 🔒 Update order status |
| PUT | `/api/quotes/:id` | 🔒 Update quote status |

🔒 = requires `Authorization: Bearer <token>` from `/api/admin/login`.

## Admin login

```bash
curl -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'
# → { "token": "..." }  (token is random per server start — log in again after a restart)

curl http://localhost:4000/api/admin/stats -H "Authorization: Bearer <token>"
```

The password comes from the `ADMIN_PASSWORD` environment variable
(`.env.example` shows `admin123` as the **demo default for local
development only — CHANGE ME** before any real deployment). There is no
separate user registration system yet: customers are derived from the
orders and quote requests the store already has. Admin CRUD works against
MongoDB when connected, and against the in-memory sample data when it is
not — so the demo works with no database running.

### POST /api/orders — body

```json
{
  "customer": { "name": "Ada", "phone": "0803 000 0000", "email": "ada@example.com", "address": "Lekki, Lagos" },
  "items": [{ "id": "iphone-13-128", "name": "iPhone 13 · 128GB", "price": 520000, "qty": 1 }],
  "paymentMethod": "Pay on delivery"
}
```

Returns `201` with the created order, including its `id` (e.g. `CL-...`) and `total`.

### POST /api/quotes — body

```json
{ "serviceId": "web-applications", "name": "Ada", "phone": "0803 000 0000", "details": "I need a website for my shop." }
```

Returns `201` with a confirmation `id` and message.

## Swapping the sample catalogue

**All products and services live in one file: `data/sampleData.js`.**

1. Edit the `products` array there — keep the same fields (`id`, `name`,
   `category`, `price`, `description`, `stock`, `image`; `oldPrice` and
   `badge` are optional).
2. Prices are whole Naira (NGN). Categories are derived automatically, so a
   new `category` value on a product creates a new shop filter by itself.
3. `image` can be any direct image URL, or a path under the frontend's
   `public/` folder (e.g. `"/products/phone.jpg"`).
4. Restart the backend. The frontend fetches from this API, so no frontend
   change is needed.
5. The frontend also keeps a small embedded fallback copy
   (`frontend/src/lib/fallback.ts`) so the shop still renders if the API is
   down — update that too if you want the fallback to match.

## Later

- **Payments:** the checkout currently records "Pay on delivery" / bank
  transfer. Connect Paystack (or Flutterwave) here and in the frontend
  checkout when ready — no keys are stored in this repo.
- **Database:** MongoDB is already wired in (see above). When the catalogue
  lives in MongoDB, edit products there (or via the admin dashboard)
  instead of `data/sampleData.js` — `data/sampleData.js` remains the seed /
  fallback source.
