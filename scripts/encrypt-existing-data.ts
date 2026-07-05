import { config } from "dotenv";
config(); // Load .env file

import { encrypt } from "../src/lib/crypto";

async function main() {
  const { db } = await import("../src/lib/db");
  console.log("Starting encryption of existing database events...");
  
  const key = process.env.DATABASE_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    console.error("ERROR: DATABASE_ENCRYPTION_KEY is missing or invalid in .env");
    process.exit(1);
  }

  // Fetch all events
  const events = await db.event.findMany();
  console.log(`Found ${events.length} total events in the database.`);

  let encryptedCount = 0;
  let skippedCount = 0;

  for (const event of events) {
    // Check if it's already encrypted. Our encrypted strings start with 32 hex chars followed by a colon.
    // A quick heuristic is to check if it contains a colon and the first part is 32 chars.
    const isEncrypted = (text: string | null) => {
      if (!text) return true; // Nothing to encrypt
      const parts = text.split(":");
      return parts.length === 3 && parts[0].length === 32;
    };

    if (
      isEncrypted(event.title) &&
      isEncrypted(event.description) &&
      isEncrypted(event.location) &&
      isEncrypted(event.attendees)
    ) {
      skippedCount++;
      continue; // Already encrypted
    }

    // Encrypt fields
    const updatedTitle = isEncrypted(event.title) ? event.title : encrypt(event.title) || "";
    const updatedDescription = isEncrypted(event.description) ? event.description : encrypt(event.description);
    const updatedLocation = isEncrypted(event.location) ? event.location : encrypt(event.location);
    const updatedAttendees = isEncrypted(event.attendees) ? event.attendees : encrypt(event.attendees);

    await db.event.update({
      where: { id: event.id },
      data: {
        title: updatedTitle,
        description: updatedDescription,
        location: updatedLocation,
        attendees: updatedAttendees,
      },
    });

    encryptedCount++;
  }

  console.log(`Successfully encrypted ${encryptedCount} previously unencrypted events.`);
  console.log(`Skipped ${skippedCount} events that were already encrypted or empty.`);
  
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
