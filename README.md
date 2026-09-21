
# Mpesa_Based-WiFi-Billing-System
A WiFi billing system that allows users to purchase internet access via MPesa payments (STK Push). Ideal for cybercafés, small businesses, and public WiFi hotspots.

**📌 FEATURES**

✅ MPesa STK Push Integration – Users pay directly from their phone via STK Push.

✅ Time-Based Access.

✅ Admin Dashboard – Track payments and manage users.

✅ MAC Address Whitelisting – Secure WiFi access via MikroTik integration.


**🛠️ TECH STACK**

Frontend: React + Tailwind CSS

Backend: Node.js + Express

Database: MySQL

Router Integration: MikroTik (MAC Address Whitelisting)


**🔧 INSTALLATION & SETUP**

1️⃣ Clone the repository

```bash
git clone https://github.com/Nigiddy/Mpesa_Based-WiFi-Billing-System.git
cd PROJECT_FOLDER
```

2️⃣ Install backend dependencies

```bash
npm install
```

3️⃣ Configure environment variables

Copy the template and edit the values for your local setup:

```bash
copy env.template .env
```

Then update `.env` with your database and API credentials. At minimum, set:

```env
DATABASE_URL="mysql://<db_user>:<db_password>@localhost:3306/<db_name>"
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_chars
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_PASSKEY=your_mpesa_passkey
MPESA_CALLBACK_URL=https://your-callback-url.ngrok.io/mpesa/callback
NEXT_PUBLIC_API_URL=http://localhost:5000
FRONTEND_ORIGIN=http://localhost:3000

# Optional — seed script defaults (used by npx prisma db seed / npm run db:seed)
SEED_ADMIN_EMAIL=admin@qonnect.com
SEED_ADMIN_PASSWORD=Admin@1234
```

> `DATABASE_URL` must point to your MySQL database. Example:
> `DATABASE_URL="mysql://root:password@localhost:3306/wifi_billing"`


## Fresh Database Setup

This project uses **Prisma Migrate** for schema management. Never use `prisma db push` in production — it bypasses the migration history and causes schema drift.

1. Make sure your MySQL database exists and `DATABASE_URL` is set in `.env`.
2. Apply all migrations:

```bash
npx prisma migrate deploy
```

3. Seed the database (creates the `SystemSettings` singleton and a default admin account):

```bash
npx prisma db seed
# or equivalently:
npm run db:seed
```

> The seed script is **idempotent** — safe to run multiple times. It will not overwrite an existing admin or system-settings row.

### Default admin credentials

| Field    | Default value          | Override with env var   |
|----------|------------------------|-------------------------|
| Email    | `admin@qonnect.com`    | `SEED_ADMIN_EMAIL`      |
| Password | `Admin@1234`           | `SEED_ADMIN_PASSWORD`   |

> ⚠️ **Change the default password immediately after first login.**

To use custom credentials without editing source code, set the env vars before seeding:

```bash
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=StrongPassWord npm run db:seed
```


## Development Workflow

### 1. Start Redis

The backend uses Redis for job queues and callback processing.

If Redis is installed locally:

```bash
redis-server
```



Set `REDIS_URL` in `.env` if you use a different host.


### 2. Start the backend

```bash
npm run dev
```

This starts the Express backend at `http://localhost:5000` by default.

> **Production (PM2):** `npm run pm2:start` points PM2 at `scripts/start.js`, which
> automatically runs `prisma migrate deploy` before starting the server. No manual
> migration step is needed on deploy.


### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend should run on `http://localhost:3000`.


### 4. Run ngrok for M-Pesa callbacks

If you are developing M-Pesa integration locally, expose port 5000 with ngrok:

```bash
ngrok http 5000
```

Then update the callback URL in `.env`:

```env
MPESA_CALLBACK_URL=https://<your-ngrok-id>.ngrok.io/mpesa/callback
```

Restart the backend after changing `.env`.


## Call for Collaboration

This project is open to contributions! If you want to help, please:

- open issues for bugs or missing features
- submit pull requests with fixes or improvements
- improve UI/UX for the admin dashboard
- optimize payment workers, callback handling, or Redis queue flow
- harden security around admin auth and M-Pesa callbacks

### Suggested contribution workflow

1. Fork the repository
2. Create a feature branch
3. Make focused changes
4. Submit a PR with a clear description of the problem and fix

Your help is welcome — especially for better documentation, more robust testing, and cleaner deployment flows.


#


## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.






***📞 CONTACT***

For inquiries & support, reach out via: 

*(Paid Consultations)* only

📧 Email: gideonpapa9@gmail.com

📱 WhatsApp: https://wa.me/254756521055
