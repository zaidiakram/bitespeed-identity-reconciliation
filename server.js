const express = require("express");
const Database = require("better-sqlite3");

const app = express();
app.use(express.json());

// Database Setup 
const db = new Database("contacts.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS Contact (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    phoneNumber    TEXT,
    email          TEXT,
    linkedId       INTEGER,
    linkPrecedence TEXT NOT NULL CHECK(linkPrecedence IN ('primary','secondary')),
    createdAt      DATETIME DEFAULT (datetime('now')),
    updatedAt      DATETIME DEFAULT (datetime('now')),
    deletedAt      DATETIME
  )
`);


app.post("/identify", (req, res) => {

  const email       = req.body.email       ? String(req.body.email).trim()       : null;
  const phoneNumber = req.body.phoneNumber ? String(req.body.phoneNumber).trim() : null;

  
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "email or phoneNumber is required" });
  }


  const matches = findMatches(email, phoneNumber);


  if (matches.length === 0) {
    const id = createContact(email, phoneNumber, null, "primary");
    return res.status(200).json(buildResponse(id));
  }

  
  const rootIds = [...new Set(
    matches.map(c => c.linkPrecedence === "primary" ? c.id : c.linkedId)
  )];


  const cluster = getCluster(rootIds);


  const primaries = cluster
    .filter(c => c.linkPrecedence === "primary")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const truePrimary = primaries[0];

 
  for (const extra of primaries.slice(1)) {
    db.prepare(`
      UPDATE Contact
      SET linkPrecedence = 'secondary',
          linkedId       = ?,
          updatedAt      = datetime('now')
      WHERE id = ?
    `).run(truePrimary.id, extra.id);

    
    db.prepare(`
      UPDATE Contact
      SET linkedId  = ?,
          updatedAt = datetime('now')
      WHERE linkedId = ?
    `).run(truePrimary.id, extra.id);
  }

  
  const updatedCluster = getAllInCluster(truePrimary.id);

  
  const hasNewEmail = email       && !updatedCluster.some(c => c.email === email);
  const hasNewPhone = phoneNumber && !updatedCluster.some(c => c.phoneNumber === phoneNumber);

  if (hasNewEmail || hasNewPhone) {
    createContact(email, phoneNumber, truePrimary.id, "secondary");
  }

  
  return res.status(200).json(buildResponse(truePrimary.id));
});

// find contacts by email OR phone 
function findMatches(email, phoneNumber) {
  return db.prepare(`
    SELECT * FROM Contact
    WHERE deletedAt IS NULL
      AND (email = ? OR phoneNumber = ?)
  `).all(email, phoneNumber);
}


function getCluster(rootIds) {
  const p = rootIds.map(() => "?").join(",");
  return db.prepare(`
    SELECT * FROM Contact
    WHERE deletedAt IS NULL
      AND (id IN (${p}) OR linkedId IN (${p}))
    ORDER BY createdAt ASC
  `).all(...rootIds, ...rootIds);
}

// get all contacts under one primary 
function getAllInCluster(primaryId) {
  return db.prepare(`
    SELECT * FROM Contact
    WHERE deletedAt IS NULL
      AND (id = ? OR linkedId = ?)
    ORDER BY createdAt ASC
  `).all(primaryId, primaryId);
}

// insert a new contact row
function createContact(email, phoneNumber, linkedId, linkPrecedence) {
  const result = db.prepare(`
    INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence)
    VALUES (?, ?, ?, ?)
  `).run(email, phoneNumber, linkedId, linkPrecedence);
  return Number(result.lastInsertRowid);
}

// Helper: build the response 
function buildResponse(primaryId) {
  const all         = getAllInCluster(primaryId);
  const primary     = all.find(c => c.id === primaryId);
  const secondaries = all.filter(c => c.id !== primaryId);

  
  const emails = [...new Set(
    [primary.email, ...secondaries.map(c => c.email)].filter(Boolean)
  )];

  const phoneNumbers = [...new Set(
    [primary.phoneNumber, ...secondaries.map(c => c.phoneNumber)].filter(Boolean)
  )];

  return {
    contact: {
      primaryContatctId: primaryId,   
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map(c => c.id)
    }
  };
}


app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Bitespeed Identity Service is running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});