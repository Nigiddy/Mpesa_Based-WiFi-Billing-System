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

1️⃣ Clone the Repository

git clone https://github.com/Nigiddy/Mpesa_Based-WiFi-Billing-System.git


`cd Mpesa_Based-WiFi-Billing-System`



2️⃣ Install Dependencies


`npm install`



3️⃣ Set Up Environment Variables


```
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_shortcode
DATABASE_URL=mysql://user:password@localhost/dbname
```



4️⃣ Run the Application


### Start the backend
`node index.js`

### Start the frontend
From the `Frontend/` folder:
```
cp .env.local.example .env.local # if provided, otherwise create manually
echo NEXT_PUBLIC_API_URL=http://localhost:5000 > .env.local
npm install
npm run dev
```




*🤝 CONTRIBUTING*

Feel free to submit issues and pull requests to improve the system!



## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.






***📞 CONTACT***

For inquiries & support, reach out via:

📧 Email: gideonpapa9@gmail.com

📱 WhatsApp: https://wa.me/254756521055
