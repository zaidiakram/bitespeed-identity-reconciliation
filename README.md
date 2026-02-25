# Bitespeed Identity Reconciliation

Hi 👋  

This project is my solution to the **Bitespeed Backend Task – Identity Reconciliation**.

The goal of this assignment was to build a backend service that can identify and consolidate customer records when multiple contacts share common email addresses or phone numbers.

Live URL
https://bitespeed-identity-reconciliation-efg9.onrender.com

Main Endpoint:
POST https://bitespeed-identity-reconciliation-efg9.onrender.com/identify

## 🔎 What I Built

I created a Node.js + Express backend that exposes one main endpoint:

POST `/identify`

This endpoint accepts a JSON request containing:

- `email`
- `phoneNumber`

At least one of them must be provided.

The service then:

- Checks if the contact already exists
- Links contacts if they share an email or phone number
- Creates secondary contacts when new information is found
- Merges two primary contacts correctly (oldest remains primary)
- Returns a consolidated response with:
  - Primary contact ID
  - All unique emails
  - All unique phone numbers
  - Secondary contact IDs

---

## 🧠 Key Logic Implemented

- If no existing record is found → create a new **primary contact**
- If a match is found → link it appropriately
- If new information is provided → create a **secondary contact**
- If two primary contacts become connected →  
  - The oldest one remains primary  
  - The newer one becomes secondary  
- Ensured consistent data handling using SQL queries

---
## 🛠 Tech Stack

- Node.js
- Express.js
- SQLite (better-sqlite3)

SQLite was used as a lightweight SQL database for simplicity and easy deployment.

---

## 🗄 Database Design

The `Contact` table includes:

- id
- email
- phoneNumber
- linkedId
- linkPrecedence (primary / secondary)
- createdAt
- updatedAt
- deletedAt

---
🏃 Run Locally

git clone https://github.com/zaidiakram/bitespeed-identity-reconciliation.git
cd bitespeed-identity-reconciliation
npm install
node server.js

Open in browser:
http://localhost:3000



