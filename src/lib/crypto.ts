import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.DATABASE_ENCRYPTION_KEY;
  if (!key) {
    // In development or build, if key is missing, warn but don't crash
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_ENCRYPTION_KEY is not set");
    }
    console.warn("WARNING: DATABASE_ENCRYPTION_KEY is not set. Using a fallback key for development only.");
    return crypto.scryptSync("development-fallback-key", "salt", 32);
  }
  
  if (key.length !== 64) {
    throw new Error("DATABASE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(key, "hex");
}

export function encrypt(text: string | null | undefined): string | null {
  if (!text) return text as any;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(hash: string | null | undefined): string | null {
  if (!hash) return hash as any;
  
  // If it doesn't match our format (e.g. old unencrypted data), return as-is
  const parts = hash.split(":");
  if (parts.length !== 3) {
    return hash;
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  
  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, undefined, "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    console.error("[crypto] Decryption failed:", err);
    return hash; // Fallback to raw text if decryption fails (e.g., key changed or data corrupted)
  }
}
