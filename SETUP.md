# Inkora Print Studio — setup guide (read this first)

This starter website includes a responsive 3D-style print-studio design, email/password signup and sign-in, customer orders in Firebase Firestore, a customer order-history screen, an owner order desk, and EmailJS order-notification emails.

**Important:** It is a ready-to-configure starter project, not connected to your real Firebase or email account yet. Complete the setup below before using it with real customers. Replace the sample business name `INKORA` with your father's actual business name.

## 1. Install what you need

1. Install **Node.js LTS** from https://nodejs.org/.
2. Install **Visual Studio Code** from https://code.visualstudio.com/.
3. Extract the ZIP file to a folder you can find, for example `Desktop/inkora-print-studio`.
4. Open VS Code → **File → Open Folder** → choose the extracted `inkora-print-studio` folder.
5. In VS Code choose **Terminal → New Terminal**. Make sure the terminal is inside the project folder.
6. Run these commands:

```bash
npm install
```

After the setup below is completed, start the local site with:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## 2. Create and configure Firebase

### A. Create the project and web app

1. Open https://console.firebase.google.com/ and sign in.
2. Click **Create a project**. Give it a name such as `family-print-orders`.
3. After creation, open **Project settings** (gear icon) → **General** → **Your apps**.
4. Click the **Web (`</>`) app** icon, register the app, and copy the Firebase configuration values.
5. In the project's root folder, make a copy of `.env.example` named exactly `.env` (same folder as `package.json`).
6. Paste your real Firebase values in `.env`. Replace all `replace_me` values; do not leave quote marks around the values. Example format:

```dotenv
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-real-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Use the actual values from your own Firebase console; these example values are not real credentials.

### B. Turn on email/password sign-in

1. In Firebase console, open **Build → Authentication**.
2. Click **Get started** if shown.
3. Open **Sign-in method** → choose **Email/Password** → enable it → Save.
4. Create one customer account later to test sign-up.

### C. Create the Firestore database

1. Open **Build → Firestore Database**.
2. Click **Create database**.
3. Choose a database location close to your customers. The chosen location cannot easily be changed later.
4. Finish creation. Do not leave the database in test mode for production.
5. Open the **Rules** tab. Copy the content of this project's `firestore.rules` file into the editor.
6. In `firestore.rules`, replace **both** occurrences of `your-father-email@example.com` with the exact email address your father will use to sign in to the website's order desk. Publish the rules.
7. In the root `.env` file, set `VITE_ADMIN_EMAIL` to that exact same email address.

The email must match in these places: the business-owner email literal in `firestore.rules` and `VITE_ADMIN_EMAIL` in `.env`. The owner must also verify the email address from the link sent to that inbox; the Firestore rules require `email_verified == true` before granting business-wide order access. After verifying, sign out and sign back in so Firebase refreshes the session. These rules let customers create orders and read only their own orders. The verified matching business-owner account can read all orders and update order status. Do not replace these with open rules such as `allow read, write: if true`.

### D. Change the sample brand name

Open `src/App.jsx` and change the first `BRAND_NAME` constant from `INKORA` to your father's actual business name. Also open `index.html` and edit the page title. Save the files.

## 3. Set up order emails (EmailJS)

The database save happens first. EmailJS is only used to send the notification; if an email fails, the saved order remains in Firebase and the page shows a warning.

1. Create an EmailJS account at https://www.emailjs.com/ and sign in.
2. In **Email Services**, connect the email service your father wants to receive messages at.
3. In **Email Templates**, create a template for new print orders.
4. Set the template's **To Email** field to your father's real email address in the EmailJS dashboard. Keep it fixed there; do not make the recipient a customer-editable variable.
5. Use a clear subject such as `New print order: {{order_id}}`.
6. Copy and paste this example into the template's message/body:

```text
NEW PRINT ORDER

Order reference: {{order_id}}
Submitted: {{created_at}}

CUSTOMER
Name: {{customer_name}}
Email: {{customer_email}}
Phone: {{customer_phone}}

ORDER DETAILS
Product: {{product_type}}
Quantity: {{quantity}}
Size: {{size}}
Paper: {{paper}}
Finish / binding: {{binding}}
Needed by: {{needed_by}}

Delivery / pickup location:
{{delivery_address}}

Design notes:
{{design_brief}}
```

7. Save the template. Copy the EmailJS **Public Key**, **Service ID**, and **Template ID**.
8. Add these values in the root `.env` file:

```dotenv
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
```

Do not paste your email password or any private email-service secret into this website. The EmailJS public key is intended for front-end use, but protect the account: restrict the allowed website origins in EmailJS if that setting is available, configure the provider's anti-spam options/rate limits, and test with a small number of orders.

## 4. Restart and test

If the local website was already running, stop it with **Ctrl+C** in the terminal and restart it:

```bash
npm run dev
```

Test in this order:

1. Open the website and create a normal test customer account.
2. Create/sign in with the business owner's email in `VITE_ADMIN_EMAIL`. When that account is created (or when an unverified owner signs in), the site sends a verification email. Open that inbox and verify the address, then sign out and sign back in. Only the verified owner account can see the order desk.
3. Sign out and sign in as the customer. Submit a test print request with a phone number and delivery/pickup address.
4. Open **My orders** to confirm the customer's request is saved.
5. Sign in as the owner and open **Order desk** to verify you can see the request and change its status.
6. Check the business email inbox and spam/junk folder for the EmailJS notification.

If Firestore shows `permission-denied`, re-check that you published `firestore.rules`, that the business-owner email in the rules matches `VITE_ADMIN_EMAIL`, and that the owner account's email is verified and you signed in again afterward. If emails don't arrive but the order reference is shown, first inspect the EmailJS template's **To Email**, service connection, template ID and EmailJS request history.

## 5. Build for hosting

After the site works locally, run:

```bash
npm run build
```

Vite makes a `dist` folder. You can publish that folder with a static host such as Firebase Hosting or Netlify. Follow the chosen host's instructions for a Vite app, and make sure to add every `VITE_...` variable from your `.env` to the host's build/environment settings before building/deploying. Never upload the `.env` file itself as a public website file.

For Firebase Hosting, the typical outline is to install the Firebase CLI, run `firebase login`, run `firebase init hosting` from this project folder, select your Firebase project, set the public directory to `dist`, choose single-page-app rewrites (`Yes`), and deploy with `npm run build` then `firebase deploy`. Follow the current CLI prompts carefully; avoid overwriting this project's `src`, `package.json`, or `firestore.rules` files.

## What is included

- `src/App.jsx` — page, account modal, order form, order list and EmailJS call.
- `src/styles.css` — responsive visual design, CSS 3D objects and motion.
- `src/firebase.js` — Firebase and EmailJS configuration loading.
- `src/main.jsx` — React entry point.
- `firestore.rules` — security rules for customer and owner access.
- `.env.example` — configuration template; copy it to `.env` and fill in your actual values.
- `package.json` — project packages and commands.

## Notes before taking real orders

- This build collects a customer's name (from their signup), email, phone, print details and delivery/pickup location. Only collect these details when needed, and keep access restricted.
- This is an order-request website, not an online payment system. The business should confirm quote, artwork, production timing and delivery with the customer before starting work.
- EmailJS is convenient for a beginner, but the browser-triggered email request can be abused if left unrestricted. For a high-volume public business, consider sending email from a trusted server/Cloud Function with secrets stored server-side and add spam protection.
