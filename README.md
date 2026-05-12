
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
```

> `DATABASE_URL` must point to your MySQL database. Example:
> `DATABASE_URL="mysql://root:password@localhost:3306/wifi_billing"`


## Fresh Database Setup (Crucial)

This project uses Prisma and requires the schema to be pushed to your MySQL database before use.

1. Ensure your MySQL database exists.
2. From the project root, run:

```bash
npx prisma db push
```

If you prefer migrations instead, you can also run:

```bash
npx prisma migrate dev --name init
```


### Admin users are NOT seeded automatically

A fresh database will have no admin records. To create the first admin user, run:

```bash
node scripts/addAdmin.js
```

Then log in with the email and password you configured in `scripts/addAdmin.js`.

If you want a custom admin account, edit the `email` and `password` fields in `scripts/addAdmin.js` before running the command.


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
