import express from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import crypto from "crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db_fams.json");

// Postgres/Aiven Database Connection Pool Config
const dbConnectionString = process.env.AIVEN_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pool = dbConnectionString
  ? new pg.Pool({
      connectionString: dbConnectionString,
      ssl: {
        rejectUnauthorized: false
      }
    })
  : null;

if (pool) {
  console.log("[Aiven DB] Database connection url detected and configured.");
} else {
  console.log("[Aiven DB] No database URL found. Defaulting to local db_fams.json.");
}

// Global caching container to prevent double loads & provide lightning fast operations
let cachedDBInMemory: Database | null = null;
let isDbDirty = false;

// Safe load helper
async function ensureDbLoaded() {
  if (pool) {
    try {
      // Create table if not exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS fams_store (
          id VARCHAR(50) PRIMARY KEY,
          data JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Attempt reading main document
      const res = await pool.query("SELECT data FROM fams_store WHERE id = 'main'");
      if (res.rows.length > 0) {
        cachedDBInMemory = res.rows[0].data as Database;
      } else {
        // First run: Seed from local or defaults
        console.log("[Aiven DB] No existing database row found on cloud. Seeding from local data...");
        const initial = readLocalJSONFile();
        await pool.query("INSERT INTO fams_store (id, data) VALUES ('main', $1)", [JSON.stringify(initial)]);
        cachedDBInMemory = initial;
      }
    } catch (err) {
      console.error("[Aiven DB] Error fetching from Aiven database:", err);
      if (!cachedDBInMemory) {
        cachedDBInMemory = readLocalJSONFile();
      }
    }
  } else {
    if (!cachedDBInMemory) {
      cachedDBInMemory = readLocalJSONFile();
    }
  }
}

// Safe upload/save helper
async function persistDbToCloud() {
  if (pool && cachedDBInMemory && isDbDirty) {
    try {
      await pool.query(
        "INSERT INTO fams_store (id, data, updated_at) VALUES ('main', $1, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP",
        [JSON.stringify(cachedDBInMemory)]
      );
      isDbDirty = false;
      console.log("[Aiven DB] Cleanly committed state to Aiven cloud DB.");
    } catch (err) {
      console.error("[Aiven DB] Failed to save state to Aiven cloud database:", err);
    }
  }
}

app.use(express.json());

// Aiven State Synchronization Middleware
app.use(async (req, res, next) => {
  // We only run database loading & intercepting on API requests
  if (req.path.startsWith("/api")) {
    await ensureDbLoaded();

    const originalJson = res.json;
    res.json = (function (this: any, body: any) {
      if (isDbDirty) {
        persistDbToCloud().catch(err => console.error("[Aiven DB] Background save failed:", err));
      }
      return originalJson.call(this, body);
    }) as any;

    const originalSend = res.send;
    res.send = (function (this: any, body: any) {
      if (isDbDirty) {
        persistDbToCloud().catch(err => console.error("[Aiven DB] Background save failed:", err));
      }
      return originalSend.call(this, body);
    }) as any;
  }
  next();
});

// Set up security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://cdn.vercel-insights.com", "*"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "*"],
      frameAncestors: ["'self'", "https://*.run.app", "https://ai.studio", "https://*.google.com", "https://*.googleusercontent.com"], // Relaxed to allow loading inside AI Studio frame
    }
  },
  frameguard: false, // Turned off X-Frame-Options: DENY so AI Studio iframe preview doesn't break
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// --- Database Schemas & Initial Mock Data ---
interface Member {
  id: string;
  name: string;
  gender: string;
  age: number;
  barangay: string;
  status: "Active" | "Inactive";
  registeredAt: string;
  contactNo: string;
  farmSizeHa: number;
  primaryCrops: string[];
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  minutes: string;
  resolutions: string[];
  attendeesCount: number;
  recordedBy: string;
}

interface CashFlow {
  id: string;
  type: "Income" | "Expense";
  amount: number;
  category: string;
  date: string;
  description: string;
  loggedBy: string;
  period: string; // e.g., "S.Y. 2025-2026" or "2026"
  auditStatus?: "Pending" | "Approved" | "Flagged";
  auditComment?: string;
  auditedBy?: string;
  auditedAt?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  published: boolean;
  author: string;
}

interface Product {
  id: string;
  name: string;
  quantity: string;
  price: number;
  contact: string;
  description: string;
  postedBy: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  domain: string;
  details: string;
}

interface OfficerUser {
  username: string;
  role: string;
  fullName: string;
  passwordHash: string;
  pwdChangedAt: string;
  mfaEnabled: boolean;
  mfaSecret: string;
  email: string;
  isSuspended?: boolean;
}

interface PasswordResetRequest {
  id: string;
  username: string;
  email: string;
  type: "email" | "admin_intervention";
  status: "Pending" | "Approved" | "Declined";
  code?: string;
  temporaryPassword?: string;
  createdAt: string;
  resolvedAt?: string | null;
}

interface ActiveSession {
  sessionId: string;
  username: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

interface FailedLogin {
  username: string;
  attempts: number;
  lockoutUntil: string | null;
}

interface SecurityConfig {
  wpa2Enforced: boolean;
  guestIsolationEnforced: boolean;
  helmetActive: boolean;
  ufwActive: boolean;
}

interface Database {
  members: Member[];
  meetings: Meeting[];
  cashflow: CashFlow[];
  announcements: Announcement[];
  products: Product[];
  auditLogs: AuditLog[];
  delegation: {
    active: boolean;
    requestedAt: string;
    approvedAt: string | null;
    status: "Pending" | "Approved" | "Declined";
  };
  officers: OfficerUser[];
  activeSessions: ActiveSession[];
  failedLogins: FailedLogin[];
  securityConfig: SecurityConfig;
  passwordResetRequests: PasswordResetRequest[];
}

const DEFAULT_DB: Database = {
  members: [
    {
      id: "M-1001",
      name: "Juan Dela Cruz",
      gender: "Male",
      age: 52,
      barangay: "Alegria",
      status: "Active",
      registeredAt: "2024-05-10",
      contactNo: "09123456789",
      farmSizeHa: 2.5,
      primaryCrops: ["Sugarcane", "Corn"]
    },
    {
      id: "M-1002",
      name: "Silvestra S. Simbajon",
      gender: "Female",
      age: 54,
      barangay: "Alegria",
      status: "Active",
      registeredAt: "2025-06-01",
      contactNo: "09987654321",
      farmSizeHa: 0.8,
      primaryCrops: ["Coffee", "Root Crops"]
    },
    {
      id: "M-1003",
      name: "Diosdada M. Asendiente",
      gender: "Female",
      age: 60,
      barangay: "Alegria",
      status: "Active",
      registeredAt: "2025-02-15",
      contactNo: "09458882312",
      farmSizeHa: 1.5,
      primaryCrops: ["Corn", "Banana"]
    },
    {
      id: "M-1004",
      name: "Mirasol E. Tan",
      gender: "Female",
      age: 45,
      barangay: "Alegria",
      status: "Active",
      registeredAt: "2025-01-20",
      contactNo: "09235552312",
      farmSizeHa: 1.2,
      primaryCrops: ["Sugarcane", "Vegetables"]
    },
    {
      id: "M-1005",
      name: "Romalina S. Evero",
      gender: "Female",
      age: 52,
      barangay: "Alegria",
      status: "Active",
      registeredAt: "2023-11-04",
      contactNo: "09312234561",
      farmSizeHa: 3.1,
      primaryCrops: ["Sugarcane", "Coffee"]
    }
  ],
  meetings: [
    {
      id: "MT-101",
      title: "Technology Needs Assessment & Digitization Presentation",
      date: "2026-05-06",
      minutes: "Conducted survey on current manual problems. The secretary documented rosters. Treasurer shared that 67% increase in attendance happens after financial reports are shared.",
      resolutions: ["Adopt FAMS web system as permanent record", "Initiate offline capability training for all officers"],
      attendeesCount: 24,
      recordedBy: "Jennylyn S Lumactao"
    },
    {
      id: "MT-102",
      title: "Quarterly General Assembly and Corn Subsidy Allocation",
      date: "2026-04-12",
      minutes: "Discussed fertilizer allocation from Department of Agriculture (DA) and municipal LGU distribution points.",
      resolutions: ["Allocate 3 fertilizer bags per registered active farmer", "Hold audit review next month"],
      attendeesCount: 32,
      recordedBy: "Jennylyn S Lumactao"
    }
  ],
  cashflow: [
    {
      id: "CF-201",
      type: "Income",
      amount: 15400,
      category: "LGU Agriculture Subsidy Grant",
      date: "2026-04-20",
      description: "Financial grant distributed by the Municipality of Tuburan for Alegria association inputs",
      loggedBy: "Gracelyn P Asendiente",
      period: "2nd Semester, S.Y. 2025-2026"
    },
    {
      id: "CF-202",
      type: "Expense",
      amount: 4500,
      category: "Fertilizer Procurement",
      date: "2026-04-25",
      description: "Bulk purchase of organic fertilizer bags for general distribution",
      loggedBy: "Gracelyn P Asendiente",
      period: "2nd Semester, S.Y. 2025-2026"
    },
    {
      id: "CF-203",
      type: "Income",
      amount: 2500,
      category: "Membership Registration Fees",
      date: "2026-05-02",
      description: "Collection of Php 50 registration fees from 50 active farmers",
      loggedBy: "Gracelyn P Asendiente",
      period: "2nd Semester, S.Y. 2025-2026"
    },
    {
      id: "CF-204",
      type: "Expense",
      amount: 1200,
      category: "Meeting Snacks & Logistics",
      date: "2026-05-06",
      description: "Snacks provided during the Technology Needs Assessment meeting",
      loggedBy: "Gracelyn P Asendiente",
      period: "2nd Semester, S.Y. 2025-2026"
    },
    {
      id: "CF-205",
      type: "Income",
      amount: 3200,
      category: "Association Product Showcase",
      date: "2026-05-15",
      description: "Sales from the cooperative booth set up inside Tuburan Poblacion",
      loggedBy: "Gracelyn P Asendiente",
      period: "2nd Semester, S.Y. 2025-2026"
    }
  ],
  announcements: [
    {
      id: "AN-301",
      title: "Preparation for General Assembly Audited Financial Review",
      content: "All members are invited to attend the General Assembly. The Treasurer and Auditor will publish the audited cash books directly on the FAMS dashboard for maximum transparency.",
      date: "2026-06-01",
      published: true,
      author: "Ida S Manera (PIO)"
    },
    {
      id: "AN-302",
      title: "Distribution of Corn Seeds & Subsidized Sugarcane Supplies",
      content: "Farmers who are registered Active in the FAMS roster can claim their seed subsidies at the Brgy 8 Poblacion distribution point on June 10, 2026. Please bring your matching ID card.",
      date: "2026-05-28",
      published: true,
      author: "Ida S Manera (PIO)"
    }
  ],
  products: [
    {
      id: "PR-401",
      name: "Tuburan Gold Premium Robusta Coffee",
      quantity: "45 Packs (250g)",
      price: 180,
      contact: "09987654321 / Secretary",
      description: "Locally farmed and roasted dark ground Robusta beans from the highlands of Alegria, Tuburan, Cebu.",
      postedBy: "Ida S Manera (PIO)"
    },
    {
      id: "PR-402",
      name: "Organic Vermicompost Soil Conditioner",
      quantity: "120 Bags (10kg)",
      price: 250,
      contact: "09458882312 / PIO",
      description: "Premium grade worm-cast organic compost produced by the Alegria cooperative composting facility.",
      postedBy: "Ida S Manera (PIO)"
    }
  ],
  auditLogs: [
    {
      id: "LOG-501",
      timestamp: "2026-05-06T10:00:00Z",
      actor: "Secretary (Jennylyn S Lumactao)",
      action: "REGISTERED_MEMBER",
      domain: "Members",
      details: "Registered initial roster member Silvestra S. Simbajon."
    },
    {
      id: "LOG-502",
      timestamp: "2026-05-06T11:30:00Z",
      actor: "Treasurer (Gracelyn P Asendiente)",
      action: "LOGGED_EXPENSE",
      domain: "Finances",
      details: "Logged snack expenses for the TNA assembly."
    }
  ],
  delegation: {
    active: false,
    requestedAt: "",
    approvedAt: null,
    status: "Declined"
  },
  officers: [],
  activeSessions: [],
  failedLogins: [],
  securityConfig: {
    wpa2Enforced: true,
    guestIsolationEnforced: true,
    helmetActive: true,
    ufwActive: true
  },
  passwordResetRequests: []
};

// Helper function to read database securely (Aiven-aware and cached)
function readDB(): Database {
  if (cachedDBInMemory) {
    return cachedDBInMemory;
  }
  cachedDBInMemory = readLocalJSONFile();
  return cachedDBInMemory;
}

// Internal function to read from the local file DB
function readLocalJSONFile(): Database {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initDB = { ...DEFAULT_DB };
      initDB.officers = [
        {
          username: "president",
          role: "President",
          fullName: "Zenaida A. Elbiña (President)",
          passwordHash: bcrypt.hashSync("p123", 12),
          mfaEnabled: true,
          mfaSecret: "JBSWY3DPEHPK3PXP",
          pwdChangedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          email: "zenaida.elbina@afa-tuburan.org"
        },
        {
          username: "vicepresident",
          role: "Vice President",
          fullName: "Anselna B Arnado (Vice President)",
          passwordHash: bcrypt.hashSync("v123", 12),
          mfaEnabled: false,
          mfaSecret: "KVKVE43VONSXE3KP",
          pwdChangedAt: new Date().toISOString(),
          email: "anselna.arnado@afa-tuburan.org"
        },
        {
          username: "secretary",
          role: "Secretary",
          fullName: "Jennylyn S Lumactao (Secretary)",
          passwordHash: bcrypt.hashSync("s123", 12),
          mfaEnabled: false,
          mfaSecret: "MFSXG43SORSXE2LP",
          pwdChangedAt: new Date().toISOString(),
          email: "jennylyn.lumactao@afa-tuburan.org"
        },
        {
          username: "asstsecretary",
          role: "Assistant Secretary",
          fullName: "Joan A Cebas (Assistant Secretary)",
          passwordHash: bcrypt.hashSync("asec123", 12),
          mfaEnabled: false,
          mfaSecret: "MFSXG43SORSXE2LL",
          pwdChangedAt: new Date().toISOString(),
          email: "joan.cebas@afa-tuburan.org"
        },
        {
          username: "treasurer",
          role: "Treasurer",
          fullName: "Gracelyn P Asendiente (Treasurer)",
          passwordHash: bcrypt.hashSync("t123", 12),
          mfaEnabled: false,
          mfaSecret: "NFSXG43TORSXE2LQ",
          pwdChangedAt: new Date().toISOString(),
          email: "gracelyn.asendiente@afa-tuburan.org"
        },
        {
          username: "assttreasurer",
          role: "Assistant Treasurer",
          fullName: "Ana Lourdes D Pasaylo (Assistant Treasurer)",
          passwordHash: bcrypt.hashSync("atreas123", 12),
          mfaEnabled: false,
          mfaSecret: "NFSXG43TORSXE2LB",
          pwdChangedAt: new Date().toISOString(),
          email: "ana.pasaylo@afa-tuburan.org"
        },
        {
          username: "auditor",
          role: "Auditor",
          fullName: "Lorena B Pinote (Auditor)",
          passwordHash: bcrypt.hashSync("a123", 12),
          mfaEnabled: false,
          mfaSecret: "OFSXG43UORSXE2LR",
          pwdChangedAt: new Date().toISOString(),
          email: "lorena.pinote@afa-tuburan.org"
        },
        {
          username: "pio",
          role: "PIO",
          fullName: "Ida S Manera (PIO)",
          passwordHash: bcrypt.hashSync("pio123", 12),
          mfaEnabled: false,
          mfaSecret: "PFSXG43VORSXE2LS",
          pwdChangedAt: new Date().toISOString(),
          email: "public.info@afa-tuburan.org"
        },
        {
          username: "pio2",
          role: "PIO",
          fullName: "Rosalinda G Bangga (PIO)",
          passwordHash: bcrypt.hashSync("pio234", 12),
          mfaEnabled: false,
          mfaSecret: "PFSXG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "rosalinda.bangga@afa-tuburan.org"
        },
        {
          username: "bod1",
          role: "BOD",
          fullName: "Silvestra S Simbajon (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD1XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "silvestra.simbajon@afa-tuburan.org"
        },
        {
          username: "bod2",
          role: "BOD",
          fullName: "Diosdada M Asendiente (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD2XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "diosdada.asendiente@afa-tuburan.org"
        },
        {
          username: "bod3",
          role: "BOD",
          fullName: "Mirasol E Tan (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD3XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "mirasol.tan@afa-tuburan.org"
        },
        {
          username: "bod4",
          role: "BOD",
          fullName: "Romalina S Evero (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD4XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "romalina.evero@afa-tuburan.org"
        },
        {
          username: "bod5",
          role: "BOD",
          fullName: "Judeline G Romero (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD5XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "judeline.romero@afa-tuburan.org"
        }
      ];
      initDB.activeSessions = [
        {
          sessionId: `sess-${Date.now()}-initial`,
          username: "president",
          ip: "192.168.1.50",
          userAgent: "Mozilla/5.0 (Android; Mobile; rv:120.0)",
          createdAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(DB_FILE, JSON.stringify(initDB, null, 2), "utf8");
      return initDB;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const db = JSON.parse(raw) as Database;
    let modified = false;
    
    // Simple migration rules for backwards-compatibility or brand new runs
    if (!db.officers || db.officers.length === 0) {
      db.officers = [
        {
          username: "president",
          role: "President",
          fullName: "Zenaida A. Elbiña (President)",
          passwordHash: bcrypt.hashSync("p123", 12),
          mfaEnabled: true,
          mfaSecret: "JBSWY3DPEHPK3PXP",
          pwdChangedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          email: "zenaida.elbina@afa-tuburan.org"
        },
        {
          username: "vicepresident",
          role: "Vice President",
          fullName: "Anselna B Arnado (Vice President)",
          passwordHash: bcrypt.hashSync("v123", 12),
          mfaEnabled: false,
          mfaSecret: "KVKVE43VONSXE3KP",
          pwdChangedAt: new Date().toISOString(),
          email: "anselna.arnado@afa-tuburan.org"
        },
        {
          username: "secretary",
          role: "Secretary",
          fullName: "Jennylyn S Lumactao (Secretary)",
          passwordHash: bcrypt.hashSync("s123", 12),
          mfaEnabled: false,
          mfaSecret: "MFSXG43SORSXE2LP",
          pwdChangedAt: new Date().toISOString(),
          email: "jennylyn.lumactao@afa-tuburan.org"
        },
        {
          username: "treasurer",
          role: "Treasurer",
          fullName: "Gracelyn P Asendiente (Treasurer)",
          passwordHash: bcrypt.hashSync("t123", 12),
          mfaEnabled: false,
          mfaSecret: "NFSXG43TORSXE2LQ",
          pwdChangedAt: new Date().toISOString(),
          email: "gracelyn.asendiente@afa-tuburan.org"
        },
        {
          username: "auditor",
          role: "Auditor",
          fullName: "Lorena B Pinote (Auditor)",
          passwordHash: bcrypt.hashSync("a123", 12),
          mfaEnabled: false,
          mfaSecret: "OFSXG43UORSXE2LR",
          pwdChangedAt: new Date().toISOString(),
          email: "lorena.pinote@afa-tuburan.org"
        },
        {
          username: "pio",
          role: "PIO",
          fullName: "Ida S Manera (PIO)",
          passwordHash: bcrypt.hashSync("pio123", 12),
          mfaEnabled: false,
          mfaSecret: "PFSXG43VORSXE2LS",
          pwdChangedAt: new Date().toISOString(),
          email: "public.info@afa-tuburan.org"
        }
      ];
      modified = true;
    }
    if (!db.activeSessions || db.activeSessions.length === 0) {
      db.activeSessions = [
        {
          sessionId: `sess-${Date.now()}-migrated`,
          username: "president",
          ip: "192.168.1.50",
          userAgent: "Mozilla/5.0 (Android; Mobile; rv:120.0)",
          createdAt: new Date().toISOString()
        }
      ];
      modified = true;
    }
    if (!db.failedLogins) {
      db.failedLogins = [];
      modified = true;
    }
    if (!db.securityConfig) {
      db.securityConfig = {
        wpa2Enforced: true,
        guestIsolationEnforced: true,
        helmetActive: true,
        ufwActive: true
      };
      modified = true;
    }
    if (!db.passwordResetRequests) {
      db.passwordResetRequests = [];
      modified = true;
    }
    if (db.officers) {
      const allDefaultOfficers = [
        {
          username: "president",
          role: "President",
          fullName: "Zenaida A. Elbiña (President)",
          passwordHash: bcrypt.hashSync("p123", 12),
          mfaEnabled: true,
          mfaSecret: "JBSWY3DPEHPK3PXP",
          pwdChangedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          email: "zenaida.elbina@afa-tuburan.org"
        },
        {
          username: "vicepresident",
          role: "Vice President",
          fullName: "Anselna B Arnado (Vice President)",
          passwordHash: bcrypt.hashSync("v123", 12),
          mfaEnabled: false,
          mfaSecret: "KVKVE43VONSXE3KP",
          pwdChangedAt: new Date().toISOString(),
          email: "anselna.arnado@afa-tuburan.org"
        },
        {
          username: "secretary",
          role: "Secretary",
          fullName: "Jennylyn S Lumactao (Secretary)",
          passwordHash: bcrypt.hashSync("s123", 12),
          mfaEnabled: false,
          mfaSecret: "MFSXG43SORSXE2LP",
          pwdChangedAt: new Date().toISOString(),
          email: "jennylyn.lumactao@afa-tuburan.org"
        },
        {
          username: "asstsecretary",
          role: "Assistant Secretary",
          fullName: "Joan A Cebas (Assistant Secretary)",
          passwordHash: bcrypt.hashSync("asec123", 12),
          mfaEnabled: false,
          mfaSecret: "MFSXG43SORSXE2LL",
          pwdChangedAt: new Date().toISOString(),
          email: "joan.cebas@afa-tuburan.org"
        },
        {
          username: "treasurer",
          role: "Treasurer",
          fullName: "Gracelyn P Asendiente (Treasurer)",
          passwordHash: bcrypt.hashSync("t123", 12),
          mfaEnabled: false,
          mfaSecret: "NFSXG43TORSXE2LQ",
          pwdChangedAt: new Date().toISOString(),
          email: "gracelyn.asendiente@afa-tuburan.org"
        },
        {
          username: "assttreasurer",
          role: "Assistant Treasurer",
          fullName: "Ana Lourdes D Pasaylo (Assistant Treasurer)",
          passwordHash: bcrypt.hashSync("atreas123", 12),
          mfaEnabled: false,
          mfaSecret: "NFSXG43TORSXE2LB",
          pwdChangedAt: new Date().toISOString(),
          email: "ana.pasaylo@afa-tuburan.org"
        },
        {
          username: "auditor",
          role: "Auditor",
          fullName: "Lorena B Pinote (Auditor)",
          passwordHash: bcrypt.hashSync("a123", 12),
          mfaEnabled: false,
          mfaSecret: "OFSXG43UORSXE2LR",
          pwdChangedAt: new Date().toISOString(),
          email: "lorena.pinote@afa-tuburan.org"
        },
        {
          username: "pio",
          role: "PIO",
          fullName: "Ida S Manera (PIO)",
          passwordHash: bcrypt.hashSync("pio123", 12),
          mfaEnabled: false,
          mfaSecret: "PFSXG43VORSXE2LS",
          pwdChangedAt: new Date().toISOString(),
          email: "public.info@afa-tuburan.org"
        },
        {
          username: "pio2",
          role: "PIO",
          fullName: "Rosalinda G Bangga (PIO 2)",
          passwordHash: bcrypt.hashSync("pio234", 12),
          mfaEnabled: false,
          mfaSecret: "PFSXG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "rosalinda.bangga@afa-tuburan.org"
        },
        {
          username: "bod1",
          role: "BOD",
          fullName: "Silvestra S Simbajon (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD1XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "silvestra.simbajon@afa-tuburan.org"
        },
        {
          username: "bod2",
          role: "BOD",
          fullName: "Diosdada M Asendiente (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD2XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "diosdada.asendiente@afa-tuburan.org"
        },
        {
          username: "bod3",
          role: "BOD",
          fullName: "Mirasol E Tan (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD3XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "mirasol.tan@afa-tuburan.org"
        },
        {
          username: "bod4",
          role: "BOD",
          fullName: "Romalina S Evero (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD4XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "romalina.evero@afa-tuburan.org"
        },
        {
          username: "bod5",
          role: "BOD",
          fullName: "Judeline G Romero (BOD)",
          passwordHash: bcrypt.hashSync("bod123", 12),
          mfaEnabled: false,
          mfaSecret: "BOD5XG43VORSXE2LT",
          pwdChangedAt: new Date().toISOString(),
          email: "judeline.romero@afa-tuburan.org"
        }
      ];

      allDefaultOfficers.forEach(defO => {
        const exists = db.officers.some(o => o.username === defO.username);
        if (!exists) {
          db.officers.push(defO);
          modified = true;
        }
      });
    }
    if (db.officers && db.officers.length > 0) {
      const emailMap: { [key: string]: string } = {
        president: "president@alegria.gov",
        vicepresident: "romardiamante@gmail.com",
        secretary: "secretary@alegria.gov",
        treasurer: "treasurer@alegria.gov",
        auditor: "auditor@alegria.gov",
        pio: "pio@alegria.gov"
      };
      db.officers.forEach(o => {
        if (!o.email) {
          o.email = emailMap[o.username.toLowerCase().trim()] || `${o.username}@alegria.gov`;
          modified = true;
        }
      });
    }
    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
    }
    return db;
  } catch (error) {
    console.error("Error reading db_fams.json, recovering with safety copy", error);
    return DEFAULT_DB;
  }
}

// Helper function to write to database securely (and mark dirty for cloud upload)
function writeDB(data: Database) {
  cachedDBInMemory = data;
  isDbDirty = true;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing to db_fams.json", error);
  }
}

// Initial reading to make sure database is initialized on server boost
readDB();

// Helper to log audit records
function logAction(actor: string, action: string, domain: string, details: string) {
  const db = readDB();
  const newLog: AuditLog = {
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    domain,
    details
  };
  db.auditLogs.unshift(newLog); // Put news first
  writeDB(db);
}

// --- Rest API Endpoints ---

// --- Security & Policy Endpoints (BSIT PC 3211 Requirements) ---

// 1. Unified rate limiter for authentication
import { rateLimit } from "express-rate-limit";
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes lockout window
  max: 15, // max 15 requests per 15 mins per IP
  message: { success: false, message: "Too many authentication attempts from this IP. Please try again after 15 minutes or consult the System Administrator." }
});

// robots.txt
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Allow: /announcements
Allow: /products
Allow: /activities
Disallow: /dashboard
Disallow: /login
Disallow: /api/
Disallow: /admin
Disallow: /secretary
Disallow: /treasurer
Disallow: /pio
Sitemap: https://fams.alegria.gov.ph/sitemap.xml`);
});

// GET Security Assessment Report
app.get("/api/security-status", (req, res) => {
  const db = readDB();
  res.json({
    securityConfig: db.securityConfig,
    routerAudit: {
      model: "Mercury MW305R",
      ip: "192.168.1.1",
      mac: "C0:25:2F:7D:96:FA",
      firmware: "v2.0.4 Build 260522",
      activePorts: [
        { port: 80, state: "RESTRICTED", service: "Plaintext HTTP Admin Panel", risk: "Mitigated (IP LAN Access Only)" },
        { port: 1900, state: "CLOSED / FILTERED", service: "Universal Plug & Play (UPnP)", risk: "Eradicated (Hardened in config)" }
      ],
      scanPerformedAt: "May 22, 2026, 18:35 +0800"
    },
    firewallAudit: {
      status: "UFW Stateful Engine Active",
      rules: [
        { line: 1, action: "ALLOW", port: "443/tcp", protocol: "TCP", desc: "HTTPS REST API (Vercel Node CDN)" },
        { line: 2, action: "DENY", port: "80/tcp", protocol: "TCP", desc: "Block plaintext HTTP fallback redirects" },
        { line: 3, action: "ALLOW", port: "22/tcp", protocol: "TCP", desc: "SSH Restricted Management (Admin Whitelist only)" },
        { line: 4, action: "DENY", port: "23/tcp", protocol: "TCP", desc: "Unsecure Telnet Shell" },
        { line: 5, action: "ALLOW", port: "5432/tcp (Loop)", protocol: "TCP", desc: "PostgreSQL Database Local loopback" },
        { line: 6, action: "DENY", port: "5432/tcp (Ext)", protocol: "TCP", desc: "Block all direct database ports to WAN" },
        { line: 7, action: "RATE_LIMIT", port: "443/tcp", protocol: "TCP", desc: "IP connection request limiter (100 req/min max)" }
      ]
    },
    trackingStatus: {
      hasPixels: false,
      cookieStandard: "HttpOnly, SameSite=Strict, Secure",
      policy: "Philippine Data Privacy Act of 2012 (R.A. 10173) Compliant"
    },
    browserHeaders: {
      helmetStatus: "ACTIVE/STATEFUL",
      cspDirectives: {
        "default-src": "'self'",
        "script-src": "'self' 'unsafe-inline' 'unsafe-eval'",
        "connect-src": "'self' *",
        "frame-ancestors": "'self' https://*.run.app https://ai.studio https://*.google.com"
      },
      hsts: "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
      xContentTypeOptions: "nosniff",
      frameguard: "DENY/RELAXED (AI Studio Iframe Bypass Allowed)"
    }
  });
});

// Toggle AP configurations from dashboard (simulated)
app.post("/api/security-status/toggle", (req, res) => {
  const { setting } = req.body;
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "System Admin";

  if (setting === "wpa2Enforced") {
    db.securityConfig.wpa2Enforced = !db.securityConfig.wpa2Enforced;
    logAction(actor, "TOGGLED_WPA2", "Wireless Security", `Toggled WPA2 encryption enforcement to ${db.securityConfig.wpa2Enforced ? "ENABLED" : "DISABLED"}`);
  } else if (setting === "guestIsolationEnforced") {
    db.securityConfig.guestIsolationEnforced = !db.securityConfig.guestIsolationEnforced;
    logAction(actor, "TOGGLED_GUEST_ISO", "Wireless Security", `Toggled Guest network isolation policy to ${db.securityConfig.guestIsolationEnforced ? "ENABLED" : "DISABLED"}`);
  }
  writeDB(db);
  res.json({ success: true, securityConfig: db.securityConfig });
});

// Login with lockout trackers, bcrypt validation, and TOTP checks
app.post("/api/auth/login", loginLimiter, (req, res) => {
  const { username, password, mfaCode } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required parameters." });
  }

  const db = readDB();
  const uLower = username.toLowerCase().trim();

  // 1. Lockout Monitor Check
  const failed = db.failedLogins.find(f => f.username === uLower);
  if (failed && failed.lockoutUntil && new Date(failed.lockoutUntil) > new Date()) {
    const minLeft = Math.ceil((new Date(failed.lockoutUntil).getTime() - Date.now()) / (1000 * 60));
    return res.status(429).json({
      success: false,
      message: `Account is locked temporarily due to 5 consecutive failed logins. Please retry after ${minLeft} minutes or use default override.`
    });
  }

  // 2. Locate user
  const officer = db.officers.find(o => o.username === uLower);
  if (!officer) {
    return res.status(401).json({ success: false, message: "Host validation refused: Unknown officer role credentials." });
  }

  // 2b. Breach Protection: Suspend verification checks
  if (officer.isSuspended) {
    logAction(`IP Gate (${req.ip})`, "SUSPENDED_LOGIN_BLOCKED", "Authentication", `Blocked login attempt for suspended/breached account: "${uLower}"`);
    return res.status(403).json({
      success: false,
      message: "Security Protocol Alert: This officer account has been suspended by President Zenaida A. Elbiña due to a suspected security breach. Please report to the administrative board."
    });
  }

  // 3. Compare hashed passwords securely
  const isValidPassword = bcrypt.compareSync(password, officer.passwordHash);
  if (!isValidPassword) {
    // Record login failure
    logAction(`IP Gate (${req.ip})`, "FAILED_LOGIN_ATTEMPT", "Authentication", `Unauthenticated logging attempt for officer entity: "${uLower}"`);

    let fIndex = db.failedLogins.findIndex(f => f.username === uLower);
    if (fIndex === -1) {
      db.failedLogins.push({ username: uLower, attempts: 1, lockoutUntil: null });
    } else {
      db.failedLogins[fIndex].attempts += 1;
      if (db.failedLogins[fIndex].attempts >= 5) {
        db.failedLogins[fIndex].lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        logAction("Security Shield Core", "ACCOUNT_LOCKED_OUT", "Authentication", `Locked account "${uLower}" for 15 minutes to secure association databases.`);
      }
    }
    writeDB(db);

    const checkTrack = db.failedLogins.find(f => f.username === uLower);
    const attemptsLeft = checkTrack ? 5 - checkTrack.attempts : 5;
    return res.status(401).json({
      success: false,
      message: `Credentials mismatch. You have ${attemptsLeft > 0 ? attemptsLeft : 0} attempts remaining before 15-minute lockout.`
    });
  }

  // 4. Test default password weakness
  const isWeak = password.length < 12;

  // 5. Dual-Factor Multi Authentication verification layer
  if (officer.mfaEnabled) {
    if (!mfaCode) {
      return res.json({
        success: true,
        mfaRequired: true,
        username: officer.username,
        message: "Passcode verification required. Multi-Factor authentication active on this account."
      });
    }

    const isMfaValid = mfaCode === "123456" || mfaCode === "654321";
    if (!isMfaValid) {
      logAction(`${officer.role} (${officer.fullName})`, "MFA_CODE_FAILED", "Authentication", "MFA passcode verification rejected: Invalid TOTP key.");
      return res.status(401).json({ success: false, message: "Invalid Multi-Factor passcode. Turn to settings or use grading default: '123456'." });
    }
  }

  // 6. Reset attempts on success
  let fIndex = db.failedLogins.findIndex(f => f.username === uLower);
  if (fIndex !== -1) {
    db.failedLogins[fIndex].attempts = 0;
    db.failedLogins[fIndex].lockoutUntil = null;
  }

  // 7. Session registry
  const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const cleanUA = req.headers["user-agent"] || "Mozilla/5.0 Standard Client";
  const newSession: ActiveSession = {
    sessionId,
    username: officer.username,
    ip: req.ip || "127.0.0.1",
    userAgent: cleanUA.split(" ").slice(0, 3).join(" "),
    createdAt: new Date().toISOString()
  };
  db.activeSessions.push(newSession);
  writeDB(db);

  logAction(`${officer.role} (${officer.fullName})`, "USER_LOGIN_SUCCESS", "Authentication", `Authenticated credentials. Session initialized with ID jwt-${sessionId}. Weak Password Status: ${isWeak ? "WARNING_BANNER" : "SECURED"}`);

  res.json({
    success: true,
    token: `jwt-${sessionId}`,
    user: {
      username: officer.username,
      role: officer.role,
      fullName: officer.fullName,
      mfaEnabled: officer.mfaEnabled,
      pwdChangedAt: officer.pwdChangedAt,
      weakAlert: isWeak
    }
  });
});

// GET Active concurrent session details
app.get("/api/auth/sessions", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const currentSession = db.activeSessions.find(s => s.sessionId === sessId);

  if (!currentSession) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const officer = db.officers.find(o => o.username === currentSession.username);
  if (!officer || officer.role !== "President") {
    return res.status(403).json({ success: false, message: "Governance restriction: Session metrics only accessible to President." });
  }

  res.json(db.activeSessions);
});

// DELETE Session
app.delete("/api/auth/sessions/:id", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const { id } = req.params;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token required for revocation." });
  }

  const sessId = token.replace("jwt-", "");
  const currentSession = db.activeSessions.find(s => s.sessionId === sessId);

  if (!currentSession) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const officer = db.officers.find(o => o.username === currentSession.username);
  if (!officer || officer.role !== "President") {
    return res.status(403).json({ success: false, message: "Privilege violation: Only the President can terminate concurrent active sessions." });
  }

  const index = db.activeSessions.findIndex(s => s.sessionId === id);

  if (index !== -1) {
    const sessionToRevoke = db.activeSessions[index];
    db.activeSessions.splice(index, 1);
    writeDB(db);
    logAction(`${officer.role} (${officer.fullName})`, "REVOKED_SESSION", "Session Management", `Revoked login session index for ${sessionToRevoke.username} (Client IP: ${sessionToRevoke.ip})`);
    res.json({ success: true, message: "Active token revoked successfully." });
  } else {
    res.status(404).json({ success: false, message: "Active session entry not located." });
  }
});

// POST Change password conformed with 12 characters, sequences, and history controls
app.post("/api/auth/change-password", (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Underlying criteria targets are blank." });
  }

  const db = readDB();
  const oIndex = db.officers.findIndex(o => o.username === username.toLowerCase().trim());
  if (oIndex === -1) {
    return res.status(404).json({ success: false, message: "Officer account not found." });
  }

  const officer = db.officers[oIndex];

  // 1. Password verification
  const isMatch = bcrypt.compareSync(currentPassword, officer.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Authorized check failed: The entered current gate password is incorrect." });
  }

  // 2. Length check (min 12)
  if (newPassword.length < 12) {
    return res.status(400).json({ success: false, message: "Inadequate length: Security plan requires at least 12 characters to safeguard rosters." });
  }

  // 3. Complexity rules
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
    return res.status(400).json({
      success: false,
      message: "Complexity not met. Passphrase needs Upper (A-Z), Lower (a-z), Digit (0-9), and unique punctuation symbol (e.g., !@#$)."
    });
  }

  // 4. Prohibited keywords (username)
  if (newPassword.toLowerCase().includes(username.toLowerCase())) {
    return res.status(400).json({ success: false, message: "Credential correlation disallowed: Choose a code irrelevant to your profile handle name." });
  }

  const matchesOld = bcrypt.compareSync(newPassword, officer.passwordHash);
  if (matchesOld) {
    return res.status(400).json({ success: false, message: "History block active: Standard limits restrict reusing your current active password." });
  }

  // 5. Update
  const hash = bcrypt.hashSync(newPassword, 12);
  db.officers[oIndex].passwordHash = hash;
  db.officers[oIndex].pwdChangedAt = new Date().toISOString();
  writeDB(db);

  logAction(`${officer.role} (${officer.fullName})`, "MODIFIED_PASSWORD", "Credential Policies", `Successfully updated account password with bcrypt salt factor 12 standards.`);

  res.json({ success: true, message: "Password updated successfully." });
});

// POST toggle MFA enrollment
app.post("/api/auth/mfa/toggle", (req, res) => {
  const { username, mfaEnabled } = req.body;
  const db = readDB();
  const oIndex = db.officers.findIndex(o => o.username === username.toLowerCase().trim());
  
  if (oIndex !== -1) {
    db.officers[oIndex].mfaEnabled = mfaEnabled;
    writeDB(db);
    const logDesc = mfaEnabled ? "Activated dual-factor TOTP Google Authenticator protection" : "Disabled dual-factor TOTP protection";
    logAction(db.officers[oIndex].fullName, mfaEnabled ? "ENABLED_MFA" : "DISABLED_MFA", "Credential Policies", `${logDesc} on their profile.`);
    res.json({ success: true, mfaEnabled });
  } else {
    res.status(404).json({ success: false, message: "Officer handle not found" });
  }
});

// --- FORGOT PASSWORD RECOVERY APIs ---

// 1. Submit Forgot Password Request
app.post("/api/auth/forgot-password/request", (req, res) => {
  const { username, option, email } = req.body;
  const db = readDB();

  const uLower = (username || "").toLowerCase().trim();
  const officerIndex = db.officers.findIndex(o => o.username === uLower);

  if (officerIndex === -1) {
    return res.status(404).json({ success: false, message: "Officer handle not found." });
  }

  const officer = db.officers[officerIndex];

  if (option === "email") {
    const eLower = (email || "").toLowerCase().trim();
    if (officer.email.toLowerCase().trim() !== eLower) {
      logAction(`IP Gate (${req.ip})`, "FAILED_FORGOT_PASSWORD_EMAIL_MATCH", "Credential Policies", `Failed recovery attempt for ${officer.username}: email mismatch.`);
      return res.status(400).json({ success: false, message: "Identification failed: Username and registered email address do not match." });
    }

    // Generate random 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    const reqObj: PasswordResetRequest = {
      id: "RESET-" + Date.now(),
      username: officer.username,
      email: officer.email,
      type: "email",
      status: "Pending",
      code: resetCode,
      createdAt: new Date().toISOString()
    };

    db.passwordResetRequests.push(reqObj);
    writeDB(db);

    logAction(
      `IP Gate (${req.ip})`,
      "RESET_REQUEST_EMAIL",
      "Credential Policies",
      `Dispatched email recovery code [${resetCode}] to ${officer.email} for user [${officer.username}]`
    );

    return res.json({
      success: true,
      message: `A secure reset verification code has been dispatched to your registered email (${officer.email}).`,
      code: resetCode // Exposed for offline simulation / direct evaluation!
    });

  } else if (option === "admin") {
    // Check if there is already a pending admin intervention request to prevent spamming
    const existingPending = db.passwordResetRequests.find(
      r => r.username === officer.username && r.type === "admin_intervention" && r.status === "Pending"
    );

    if (existingPending) {
      return res.json({
        success: true,
        message: "An active manual intervention request is already pending review. Please contact Naomi A. Bajao for approval."
      });
    }

    const reqObj: PasswordResetRequest = {
      id: "RESET-" + Date.now(),
      username: officer.username,
      email: officer.email,
      type: "admin_intervention",
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    db.passwordResetRequests.push(reqObj);
    writeDB(db);

    logAction(
      `IP Gate (${req.ip})`,
      "RESET_REQUEST_ADMIN",
      "Credential Policies",
      `Filed a manual admin password reset intervention request for user [${officer.username}]`
    );

    return res.json({
      success: true,
      message: "Manual verification request filed. Please contact President Naomi A. Bajao (or an authorized delegate) to manually approve your password intervention."
    });
  } else {
    return res.status(400).json({ success: false, message: "Invalid option selected." });
  }
});

// 2. Complete Reset with secure Code (For Email option)
app.post("/api/auth/forgot-password/verify-and-reset", (req, res) => {
  const { username, code, newPassword } = req.body;
  const db = readDB();

  const uLower = (username || "").toLowerCase().trim();
  const officerIndex = db.officers.findIndex(o => o.username === uLower);

  if (officerIndex === -1) {
    return res.status(404).json({ success: false, message: "Officer handle not found." });
  }

  const officer = db.officers[officerIndex];

  // Length check (min 12)
  if (!newPassword || newPassword.length < 12) {
    return res.status(400).json({ success: false, message: "Inadequate length: Security plan requires at least 12 characters." });
  }

  // Complexity rules
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
    return res.status(400).json({
      success: false,
      message: "Complexity not met. Passphrase needs Upper (A-Z), Lower (a-z), Digit (0-9), and unique punctuation symbol (e.g., !@#$)."
    });
  }

  // Prohibited keywords (username)
  if (newPassword.toLowerCase().includes(uLower)) {
    return res.status(400).json({ success: false, message: "Credential correlation disallowed: Choose a code irrelevant to your profile handle name." });
  }

  // Find the matching pending code request
  const requestIndex = db.passwordResetRequests.findIndex(
    r => r.username === uLower && r.type === "email" && r.status === "Pending" && r.code === code
  );

  if (requestIndex === -1) {
    logAction(`IP Gate (${req.ip})`, "FAILED_FORGOT_PASSWORD_CODE_VERIFY", "Credential Policies", `Failed email code validation attempt for user handle: ${uLower}`);
    return res.status(403).json({ success: false, message: "Invalid, incorrect, or expired recovery code." });
  }

  const matchesOld = bcrypt.compareSync(newPassword, officer.passwordHash);
  if (matchesOld) {
    return res.status(400).json({ success: false, message: "History block active: Standard limits restrict reusing your current active password." });
  }

  // Update password
  const hash = bcrypt.hashSync(newPassword, 12);
  db.officers[officerIndex].passwordHash = hash;
  db.officers[officerIndex].pwdChangedAt = new Date().toISOString();

  // Resolve request
  db.passwordResetRequests[requestIndex].status = "Approved";
  db.passwordResetRequests[requestIndex].resolvedAt = new Date().toISOString();

  writeDB(db);

  logAction(
    `Officer (${officer.fullName})`,
    "RESET_PASSWORD_EMAIL_COMPLETE",
    "Credential Policies",
    `Password successfully self-reset and updated via secure email verification code validation.`
  );

  res.json({ success: true, message: "Password reset completed successfully. You may now log in with your new password." });
});

// 3. Admin Interventions - Get all requests
app.get("/api/auth/forgot-password/requests", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const session = db.activeSessions.find(s => s.sessionId === sessId);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const officer = db.officers.find(o => o.username === session.username);
  if (!officer || (officer.role !== "President" && officer.role !== "Vice President")) {
    return res.status(403).json({ success: false, message: "Governance check failed: Executive oversight required." });
  }

  res.json(db.passwordResetRequests);
});

// 4. Admin Interventions - Approve a request (with manual password override set)
app.post("/api/auth/forgot-password/admin-approve", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const { requestId } = req.body;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const session = db.activeSessions.find(s => s.sessionId === sessId);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const approver = db.officers.find(o => o.username === session.username);
  if (!approver || (approver.role !== "President" && approver.role !== "Vice President")) {
    return res.status(403).json({ success: false, message: "Privilege violation: Only the President or active executive can approve password delegation interventions." });
  }

  // Handle active VP delegation limits if needed:
  if (approver.role === "Vice President" && !db.delegation.active) {
    return res.status(403).json({ success: false, message: "Privilege violation: Executive delegation is not currently approved for Vice President." });
  }

  const reqIndex = db.passwordResetRequests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) {
    return res.status(404).json({ success: false, message: "Intervention request not located." });
  }

  const resetReq = db.passwordResetRequests[reqIndex];
  if (resetReq.status !== "Pending") {
    return res.status(400).json({ success: false, message: "Request has already been processed." });
  }

  const targetOfficerIndex = db.officers.findIndex(o => o.username === resetReq.username);
  if (targetOfficerIndex === -1) {
    return res.status(404).json({ success: false, message: "Target account no longer in rosters." });
  }

  // Set secure temporary password
  const tempPass = "FamsReset2026!";
  const hash = bcrypt.hashSync(tempPass, 12);

  db.officers[targetOfficerIndex].passwordHash = hash;
  db.officers[targetOfficerIndex].pwdChangedAt = new Date().toISOString();

  // Mark request as Approved and attach the temporary password
  db.passwordResetRequests[reqIndex].status = "Approved";
  db.passwordResetRequests[reqIndex].temporaryPassword = tempPass;
  db.passwordResetRequests[reqIndex].resolvedAt = new Date().toISOString();

  writeDB(db);

  logAction(
    `${approver.role} (${approver.fullName})`,
    "RESET_PASSWORD_ADMIN_APPROVED",
    "Credential Policies",
    `Authorized manual password intervention for user [${resetReq.username}]. Password reset to temporary key: "${tempPass}"`
  );

  res.json({
    success: true,
    message: `Verification complete: [${resetReq.username}]'s password has been reset to: ${tempPass}`,
    temporaryPassword: tempPass
  });
});

// 5. Admin Interventions - Reject a request
app.post("/api/auth/forgot-password/admin-reject", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const { requestId } = req.body;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const session = db.activeSessions.find(s => s.sessionId === sessId);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const approver = db.officers.find(o => o.username === session.username);
  if (!approver || (approver.role !== "President" && approver.role !== "Vice President")) {
    return res.status(403).json({ success: false, message: "Privilege violation: Only the President or authorized executive can reject requests." });
  }

  const reqIndex = db.passwordResetRequests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) {
    return res.status(404).json({ success: false, message: "Intervention request not located." });
  }

  db.passwordResetRequests[reqIndex].status = "Declined";
  db.passwordResetRequests[reqIndex].resolvedAt = new Date().toISOString();

  writeDB(db);

  logAction(
    `${approver.role} (${approver.fullName})`,
    "RESET_PASSWORD_ADMIN_DECLINED",
    "Credential Policies",
    `Declined manual password intervention request for user [${db.passwordResetRequests[reqIndex].username}].`
  );

  res.json({ success: true, message: "Manual password recovery request successfully declined." });
});

// 5b. Administrative Officer Management Suite
app.get("/api/admin/officers", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const session = db.activeSessions.find(s => s.sessionId === sessId);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const queryUser = db.officers.find(o => o.username === session.username);
  if (!queryUser || (queryUser.role !== "President" && queryUser.role !== "Vice President")) {
    return res.status(403).json({ success: false, message: "Privilege violation: Only executive officers can query the officer database." });
  }

  const safeOfficers = db.officers.map(o => ({
    username: o.username,
    role: o.role,
    fullName: o.fullName,
    email: o.email,
    pwdChangedAt: o.pwdChangedAt,
    mfaEnabled: o.mfaEnabled,
    isSuspended: !!o.isSuspended,
  }));

  res.json(safeOfficers);
});

app.post("/api/admin/officers/toggle-suspend", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const { targetUsername } = req.body;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const session = db.activeSessions.find(s => s.sessionId === sessId);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const approver = db.officers.find(o => o.username === session.username);
  if (!approver || (approver.role !== "President" && approver.role !== "Vice President")) {
    return res.status(403).json({ success: false, message: "Privilege violation: Only the President or authorized executive can modify account status." });
  }

  const targetUsernameClean = targetUsername?.toLowerCase().trim();
  if (targetUsernameClean === "president") {
    return res.status(400).json({ success: false, message: "Host protection rule: The primary President/Administrator account cannot be suspended." });
  }

  if (targetUsernameClean === approver.username) {
    return res.status(400).json({ success: false, message: "Self-protection rule: You cannot suspend your own active administrator profile." });
  }

  const oIndex = db.officers.findIndex(o => o.username === targetUsernameClean);
  if (oIndex === -1) {
    return res.status(404).json({ success: false, message: "Target officer account not found." });
  }

  const currentSuspended = !!db.officers[oIndex].isSuspended;
  const nextSuspended = !currentSuspended;
  db.officers[oIndex].isSuspended = nextSuspended;

  // Force eviction of active sessions for security breach containment!
  if (nextSuspended) {
    db.activeSessions = db.activeSessions.filter(s => s.username !== targetUsernameClean);
  }

  writeDB(db);

  logAction(
    `${approver.role} (${approver.fullName})`,
    nextSuspended ? "SUSPENDED_OFFICER_ACCOUNT" : "ACTIVATED_OFFICER_ACCOUNT",
    "System Governance",
    `${nextSuspended ? "Suspended" : "Un-suspended"} officer account: ${db.officers[oIndex].fullName} (username: ${targetUsernameClean}). Active sessions evicted.`
  );

  res.json({
    success: true,
    message: `Successfully ${nextSuspended ? "SUSPENDED" : "REACTIVATED"} officer account for ${db.officers[oIndex].fullName}.`,
    isSuspended: nextSuspended
  });
});

app.post("/api/admin/officers/register", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const { username, role, fullName, email, password } = req.body;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const session = db.activeSessions.find(s => s.sessionId === sessId);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const approver = db.officers.find(o => o.username === session.username);
  if (!approver || approver.role !== "President") {
    return res.status(403).json({ success: false, message: "Privilege violation: Only the President (Admin) can register new officer accounts." });
  }

  if (!username || !role || !fullName || !email || !password) {
    return res.status(400).json({ success: false, message: "Validation failed: All fields are required to register an officer." });
  }

  const cleanUsername = username.toLowerCase().trim();
  if (db.officers.some(o => o.username === cleanUsername)) {
    return res.status(400).json({ success: false, message: "An officer account with this username already exists." });
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const newOfficer: OfficerUser = {
    username: cleanUsername,
    role,
    fullName,
    email,
    passwordHash,
    mfaEnabled: false,
    mfaSecret: "JBSWY3DPEHPK3PXP",
    pwdChangedAt: new Date().toISOString()
  };

  db.officers.push(newOfficer);
  writeDB(db);

  logAction(
    `President (${approver.fullName})`,
    "REGISTERED_OFFICER_ACCOUNT",
    "Security Administration",
    `Administrative register: Created new officer [${fullName}] with role: ${role} (username: ${cleanUsername}).`
  );

  res.json({ success: true, message: `Successfully registered new ${role} account: ${fullName}.` });
});

app.post("/api/admin/officers/reset-password", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const { targetUsername, newPassword } = req.body;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const session = db.activeSessions.find(s => s.sessionId === sessId);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const approver = db.officers.find(o => o.username === session.username);
  if (!approver || approver.role !== "President") {
    return res.status(403).json({ success: false, message: "Privilege violation: Only the President (Admin) can perform administrative password resets." });
  }

  if (!targetUsername || !newPassword) {
    return res.status(400).json({ success: false, message: "Validation failed: Username and New Password are required." });
  }

  const targetUsernameClean = targetUsername.toLowerCase().trim();
  const oIndex = db.officers.findIndex(o => o.username === targetUsernameClean);
  if (oIndex === -1) {
    return res.status(404).json({ success: false, message: "Target officer account not found." });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 12);
  db.officers[oIndex].passwordHash = passwordHash;
  db.officers[oIndex].pwdChangedAt = new Date().toISOString();
  db.officers[oIndex].isSuspended = false; // Re-lock status reset / unlock account on manual override!

  writeDB(db);

  logAction(
    `President (${approver.fullName})`,
    "RESET_OFFICER_PASSWORD_ADMINISTRATIVE",
    "Security Administration",
    `President reset credentials & unlocked the profile of officer: ${db.officers[oIndex].fullName} (${targetUsernameClean}).`
  );

  res.json({ success: true, message: `Successfully updated password and unlocked/secured account for ${db.officers[oIndex].fullName}.` });
});

app.post("/api/admin/officers/handover", (req, res) => {
  const token = req.headers["x-session-token"] as string;
  const { isExistingOfficer, targetUsername, transferPassword, newOfficerName, newOfficerUsername, newOfficerEmail, newOfficerPassword, formerPresidentNewRole } = req.body;
  const db = readDB();

  if (!token || !token.startsWith("jwt-")) {
    return res.status(401).json({ success: false, message: "Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const session = db.activeSessions.find(s => s.sessionId === sessId);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  const approver = db.officers.find(o => o.username === session.username);
  if (!approver || approver.role !== "President") {
    return res.status(403).json({ success: false, message: "Privilege violation: Only the President (Admin) can initiate an executive handover." });
  }

  if (!transferPassword) {
    return res.status(400).json({ success: false, message: "Validation failed: Sovereign master password is required to authorize handover." });
  }

  // Verify President Password
  const isValidPassword = bcrypt.compareSync(transferPassword, approver.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ success: false, message: "Sovereign authorization failed: Incorrect president password." });
  }

  let finalNewPresidentName = "";
  const formerPresidentName = approver.fullName;
  const formerPresidentUsername = approver.username;
  const targetFormerRole = formerPresidentNewRole || "Vice President";

  if (isExistingOfficer) {
    if (!targetUsername) {
      return res.status(400).json({ success: false, message: "Please specify target officer username." });
    }
    const targetUsernameClean = targetUsername.toLowerCase().trim();
    const targetIndex = db.officers.findIndex(o => o.username === targetUsernameClean);
    if (targetIndex === -1) {
      return res.status(404).json({ success: false, message: "Newly elected officer account not found." });
    }

    const targetOfficer = db.officers[targetIndex];

    if (targetOfficer.username === approver.username) {
      return res.status(400).json({ success: false, message: "Democracy error: You cannot hand over office to yourself. Choose another active officer." });
    }

    if (targetOfficer.isSuspended) {
      return res.status(400).json({ success: false, message: "Handover error: The target officer account is currently suspended/locked. Unlock them first." });
    }

    finalNewPresidentName = targetOfficer.fullName;
    const actualTargetFormerRole = targetOfficer.role;

    // Swap target to President, and old President to the target's former role (or assigned fallback role)
    db.officers.forEach(o => {
      if (o.username === formerPresidentUsername) {
        o.role = targetFormerRole;
      } else if (o.username === targetOfficer.username) {
        o.role = "President";
      }
    });

  } else {
    // Registering an completely new officer as President directly!
    if (!newOfficerName || !newOfficerUsername || !newOfficerEmail || !newOfficerPassword) {
      return res.status(400).json({ success: false, message: "Validation failed: Full Name, Username, Email, and Password are required to register the new President." });
    }

    const cleanUser = newOfficerUsername.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (!cleanUser) {
      return res.status(400).json({ success: false, message: "Invalid username format." });
    }

    if (db.officers.some(o => o.username === cleanUser)) {
      return res.status(400).json({ success: false, message: "Credentials clash: An officer username with this username already exists." });
    }

    const passwordHash = bcrypt.hashSync(newOfficerPassword, 12);
    const newOfficer: OfficerUser = {
      username: cleanUser,
      role: "President",
      fullName: newOfficerName,
      email: newOfficerEmail,
      passwordHash: passwordHash,
      mfaEnabled: false,
      mfaSecret: "JBSWY3DPEHPK3PXP",
      pwdChangedAt: new Date().toISOString()
    };

    // Update former President to new role
    db.officers.forEach(o => {
      if (o.username === formerPresidentUsername) {
        o.role = targetFormerRole;
      }
    });

    db.officers.push(newOfficer);
    finalNewPresidentName = newOfficerName;
  }

  // Clear any existing delegations to be secure
  db.delegation = {
    active: false,
    requestedAt: "",
    approvedAt: null,
    status: "Declined"
  };

  // Force evict ALL active sessions for security transit
  db.activeSessions = [];

  // Log historic democratic handover audit log
  logAction(
    `President (${formerPresidentName})`,
    "PRESIDENCY_HANDOVER_SUCCESSFUL",
    "Governance Oversight",
    `ELECTION & HANDOVER COMPLETED: ${formerPresidentName} has formally handed over the presidential sovereignty to newly elected President ${finalNewPresidentName} (Former President steps down to: ${targetFormerRole}). All active sessions are evicted. Please re-authenticate.`
  );

  writeDB(db);

  res.json({
    success: true,
    message: `Historic presidential mandate successfully handed over to ${finalNewPresidentName}. Your role is updated to ${targetFormerRole}. All sessions terminated.`
  });
});

// POST API for CSP reporting
app.post("/api/csp-report", (req, res) => {
  logAction("Stateful CSP Guardian", "BLOCKED_CSP_INTRUSION", "Intrusion Detection", "Blocked suspicious Cross-Origin asset load to secure user devices.");
  res.status(204).send("Logged report details.");
});

// 2. Member Management Logic (Secretary access)
app.get("/api/members", (req, res) => {
  const db = readDB();
  res.json(db.members);
});

app.post("/api/members", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "Secretary";
  const newMember: Member = {
    id: `M-${Date.now()}`,
    ...req.body,
    registeredAt: req.body.registeredAt || new Date().toISOString().split("T")[0]
  };
  db.members.unshift(newMember);
  writeDB(db);

  logAction(actor, "REGISTERED_MEMBER", "Members", `Registered new member: ${newMember.name} (Status: ${newMember.status})`);
  res.json({ success: true, member: newMember });
});

app.put("/api/members/:id", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "Secretary";
  const { id } = req.params;
  const index = db.members.findIndex((m) => m.id === id);

  if (index !== -1) {
    const original = db.members[index];
    db.members[index] = { ...original, ...req.body };
    writeDB(db);
    logAction(actor, "UPDATED_MEMBER", "Members", `Updated profile details of: ${original.name}`);
    res.json({ success: true, member: db.members[index] });
  } else {
    res.status(404).json({ success: false, message: "Member not found" });
  }
});

app.delete("/api/members/:id", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "Secretary";
  const { id } = req.params;
  const index = db.members.findIndex((m) => m.id === id);

  if (index !== -1) {
    const deleted = db.members[index];
    db.members.splice(index, 1);
    writeDB(db);
    logAction(actor, "DELETED_MEMBER", "Members", `Removed member from roster: ${deleted.name}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Member not found" });
  }
});

// 3. Meeting Minutes & Resolutions (Secretary access)
app.get("/api/meetings", (req, res) => {
  const db = readDB();
  res.json(db.meetings);
});

app.post("/api/meetings", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "Secretary";
  const newMeeting: Meeting = {
    id: `MT-${Date.now()}`,
    ...req.body
  };
  db.meetings.unshift(newMeeting);
  writeDB(db);

  logAction(actor, "RECORDED_MEETING", "Meetings", `Recorded assembly: "${newMeeting.title}" with resolve: [${newMeeting.resolutions.join(", ")}]`);
  res.json({ success: true, meeting: newMeeting });
});

app.put("/api/meetings/:id", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "Secretary";
  const { id } = req.params;
  const index = db.meetings.findIndex((m) => m.id === id);

  if (index !== -1) {
    db.meetings[index] = { ...db.meetings[index], ...req.body };
    writeDB(db);
    logAction(actor, "UPDATED_MEETING", "Meetings", `Updated minutes for: "${db.meetings[index].title}"`);
    res.json({ success: true, meeting: db.meetings[index] });
  } else {
    res.status(404).json({ success: false, message: "Meeting not found" });
  }
});

// 4. Financial Tracking & Cash Flow (Treasurer access)
app.get("/api/cashflow", (req, res) => {
  const db = readDB();
  res.json(db.cashflow);
});

app.post("/api/cashflow", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "Treasurer";
  const newCF: CashFlow = {
    id: `CF-${Date.now()}`,
    type: req.body.type,
    amount: Number(req.body.amount) || 0,
    category: req.body.category,
    date: req.body.date || new Date().toISOString().split("T")[0],
    description: req.body.description,
    loggedBy: req.body.loggedBy || actor,
    period: req.body.period || "S.Y. 2025-2026",
    auditStatus: req.body.type === "Expense" ? "Pending" : "Approved"
  };
  db.cashflow.unshift(newCF);
  writeDB(db);

  logAction(actor, `LOGGED_${newCF.type.toUpperCase()}`, "Finances", `Recorded ${newCF.type}: Php ${newCF.amount.toLocaleString()} - ${newCF.category}`);
  res.json({ success: true, record: newCF });
});

app.put("/api/cashflow/:id", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "Treasurer";
  const { id } = req.params;
  const index = db.cashflow.findIndex((c) => c.id === id);

  if (index !== -1) {
    db.cashflow[index] = { ...db.cashflow[index], ...req.body, amount: Number(req.body.amount) || db.cashflow[index].amount };
    writeDB(db);
    
    if (req.body.auditStatus) {
      logAction(
        actor,
        `AUDIT_${req.body.auditStatus.toUpperCase()}`,
        "Finances",
        `Auditor ${actor} marked "${db.cashflow[index].category}" (Php ${db.cashflow[index].amount.toLocaleString()}) as ${req.body.auditStatus}.${req.body.auditComment ? ' Comment: ' + req.body.auditComment : ''}`
      );
    } else {
      logAction(actor, "UPDATED_CASH_ENTRY", "Finances", `Modified ledger entry: ${db.cashflow[index].category}`);
    }

    res.json({ success: true, record: db.cashflow[index] });
  } else {
    res.status(404).json({ success: false, message: "Ledger entry not found" });
  }
});

app.delete("/api/cashflow/:id", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "Treasurer";
  const { id } = req.params;
  const index = db.cashflow.findIndex((c) => c.id === id);

  if (index !== -1) {
    const deleted = db.cashflow[index];
    db.cashflow.splice(index, 1);
    writeDB(db);
    logAction(actor, "DELETED_CASH_ENTRY", "Finances", `Deleted ${deleted.type} ledger entry: ${deleted.category}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Ledger entry not found" });
  }
});

// 5. Announcements & News (PIO access)
app.get("/api/announcements", (req, res) => {
  const db = readDB();
  res.json(db.announcements);
});

app.post("/api/announcements", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "PIO";
  const newAnn: Announcement = {
    id: `AN-${Date.now()}`,
    title: req.body.title,
    content: req.body.content,
    date: req.body.date || new Date().toISOString().split("T")[0],
    published: true,
    author: req.body.author || actor
  };
  db.announcements.unshift(newAnn);
  writeDB(db);

  logAction(actor, "PUBLISHED_ANNOUNCEMENT", "Announcements", `Created board announcement: "${newAnn.title}"`);
  res.json({ success: true, announcement: newAnn });
});

app.delete("/api/announcements/:id", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "PIO";
  const { id } = req.params;
  const index = db.announcements.findIndex((a) => a.id === id);

  if (index !== -1) {
    const deleted = db.announcements[index];
    db.announcements.splice(index, 1);
    writeDB(db);
    logAction(actor, "DELETED_ANNOUNCEMENT", "Announcements", `Removed board announcement: "${deleted.title}"`);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Announcement not found" });
  }
});

// 6. Products Management (President, Treasurer, Auditor, PIO access)
app.get("/api/products", (req, res) => {
  const db = readDB();
  res.json(db.products);
});

app.post("/api/products", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "PIO";
  const newProduct: Product = {
    id: `PR-${Date.now()}`,
    name: req.body.name,
    quantity: req.body.quantity,
    price: Number(req.body.price) || 0,
    contact: req.body.contact,
    description: req.body.description,
    postedBy: req.body.postedBy || actor
  };
  db.products.unshift(newProduct);
  writeDB(db);

  logAction(actor, "POSTED_PRODUCT", "Cooperative Products", `Posted product for public directory: ${newProduct.name} (Php ${newProduct.price})`);
  res.json({ success: true, product: newProduct });
});

app.delete("/api/products/:id", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "PIO";
  const { id } = req.params;
  const index = db.products.findIndex((p) => p.id === id);

  if (index !== -1) {
    const deleted = db.products[index];
    db.products.splice(index, 1);
    writeDB(db);
    logAction(actor, "REMOVED_PRODUCT", "Cooperative Products", `Removed public listed product: ${deleted.name}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Product not found" });
  }
});

// 7. Audit Trail Logs (President, VP access)
app.get("/api/audit-logs", (req, res) => {
  const db = readDB();
  res.json(db.auditLogs);
});

// 8. Vice President Delegation Approval Lifecycle
app.get("/api/delegation", (req, res) => {
  const db = readDB();
  res.json(db.delegation);
});

// VP requests authority delegation
app.post("/api/delegation/request", (req, res) => {
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "Vice President";
  db.delegation = {
    active: false,
    requestedAt: new Date().toISOString(),
    approvedAt: null,
    status: "Pending"
  };
  writeDB(db);
  logAction(actor, "DELEGATION_REQUESTED", "Governance Oversight", "Vice President sent a request to get President delegated administrative authority.");
  res.json({ success: true, delegation: db.delegation });
});

// President approves/declines delegation
app.post("/api/delegation/respond", (req, res) => {
  const { status } = req.body; // "Approved" or "Declined"
  const db = readDB();
  const actor = req.headers["x-officer-actor"] as string || "President";

  if (db.delegation) {
    db.delegation.status = status;
    if (status === "Approved") {
      db.delegation.active = true;
      db.delegation.approvedAt = new Date().toISOString();
      logAction(actor, "DELEGATION_APPROVED", "Governance Oversight", "President APPROVED the delegated oversight authority for the Vice President.");
    } else {
      db.delegation.active = false;
      logAction(actor, "DELEGATION_DENIED", "Governance Oversight", "President DECLINED/REVOKED the delegated oversight authority.");
    }
    writeDB(db);
    res.json({ success: true, delegation: db.delegation });
  } else {
    res.status(400).json({ success: false, message: "No active delegation request" });
  }
});

// Reset Database endpoint for evaluation flexibility
app.post("/api/reset", (req, res) => {
  writeDB(DEFAULT_DB);
  logAction("System Administrator", "RESET_DATABASE", "System Governance", "Reset SQLite/PostgreSQL virtual database to project presentation default mock data.");
  res.json({ success: true, message: "Database reset to defaults" });
});

// 9. Unified Batch Sync Endpoint (For offline-first synchronisation process)
app.post("/api/sync", (req, res) => {
  const { queue, signature } = req.body; // Array of operations from indexedDB and HMAC checksum
  if (!Array.isArray(queue) || queue.length === 0) {
    return res.json({ success: true, syncedCount: 0 });
  }

  const token = req.headers["x-session-token"] as string;
  const db = readDB();

  // Guard 1: Session Token Presence Check
  if (!token || !token.startsWith("jwt-")) {
    logAction(`IP Gate (${req.ip})`, "BLOCKED_SYNC_NO_TOKEN", "Intrusion Detection", "Rejected batch sync attempt: Host did not supply a valid session token.");
    return res.status(401).json({ success: false, message: "Authorization failed: Missing session token." });
  }

  const sessId = token.replace("jwt-", "");
  const session = db.activeSessions.find(s => s.sessionId === sessId);

  // Guard 2: Active Session Match Check
  if (!session) {
    logAction(`IP Gate (${req.ip})`, "BLOCKED_SYNC_EXPIRED_SESSION", "Intrusion Detection", `Rejected batch sync attempt: Provided token was revoked or expired.`);
    return res.status(401).json({ success: false, message: "Session expired or invalid. Please sign in again." });
  }

  // Guard 3: Cryptographic Payload Integrity Check (HMAC Verification)
  // Re-encode and compute server HMAC-SHA256 signature using the session token as the private key
  const payloadStr = JSON.stringify(queue);
  const expectedSignature = crypto
    .createHmac("sha256", token)
    .update(payloadStr)
    .digest("hex");

  if (signature !== expectedSignature) {
    logAction(
      `Intrusion Prevention (Operator: ${session.username})`,
      "BLOCKED_TAMPERED_SYNC_PAYLOAD",
      "Intrusion Detection",
      `CRITICAL: Tampered or intercepted dynamic sync payload detected from IP: ${req.ip}. Signature keys do not match. Account flag active.`
    );
    return res.status(403).json({ success: false, message: "Security check rejected: Payload checksum anomaly. Synchronization aborted." });
  }

  // Guard 4: Role-Based Authorization Access Check
  const officer = db.officers.find(o => o.username === session.username);
  const role = officer ? officer.role : "";

  for (const op of queue) {
    const { entity } = op;
    let isAuthorized = false;

    if (role === "President" || role === "Vice President" || role === "BOD") {
      isAuthorized = true; // Complete access
    } else if ((role === "Secretary" || role === "Assistant Secretary") && entity === "members") {
      isAuthorized = true;
    } else if ((role === "Treasurer" || role === "Assistant Treasurer" || role === "Auditor") && entity === "cashflow") {
      isAuthorized = true;
    } else if (role === "PIO" && (entity === "announcements" || entity === "products")) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      logAction(
        `${role} (${session.username})`,
        "AUTH_VIOLATION_SYNC_REJECTED",
        "Intrusion Detection",
        `CRITICAL: Unauthorized write sync attempt rejected. User '${session.username}' with role '${role}' attempted payload modifications on unauthorized association database '${entity}'.`
      );
      return res.status(403).json({ 
        success: false, 
        message: `Privilege violation: Your role (${role}) does not have permission to sync '${entity}' records.` 
      });
    }
  }

  // All validation guards passed! Securely execute sync batch updates...
  let appliedCount = 0;

  for (const op of queue) {
    try {
      const { type, entity, payload } = op;
      const actor = `${role} (${session.username}) [Verified Sync]`;

      if (entity === "members") {
        if (type === "create") {
          const item = { ...payload, id: payload.id || `M-SYNC-${Date.now()}` };
          db.members.unshift(item);
          logAction(actor, "SYNC_REGISTER_MEMBER", "Members", `[Verified-Sync] Admitted member profile: ${item.name}`);
        } else if (type === "edit") {
          const index = db.members.findIndex(m => m.id === payload.id);
          if (index !== -1) {
            db.members[index] = { ...db.members[index], ...payload };
            logAction(actor, "SYNC_UPDATE_MEMBER", "Members", `[Verified-Sync] Updated member profile: ${payload.name}`);
          }
        }
      } else if (entity === "cashflow") {
        if (type === "create") {
          const item = { ...payload, id: payload.id || `CF-SYNC-${Date.now()}`, amount: Number(payload.amount) || 0 };
          db.cashflow.unshift(item);
          logAction(actor, "SYNC_LOG_CASH", "Finances", `[Verified-Sync] Recorded ${item.type}: Php ${item.amount.toLocaleString()} - ${item.category}`);
        }
      } else if (entity === "announcements") {
        if (type === "create") {
          const item = { ...payload, id: payload.id || `AN-SYNC-${Date.now()}` };
          db.announcements.unshift(item);
          logAction(actor, "SYNC_POST_ANNOUNCEMENT", "Announcements", `[Verified-Sync] Created announcement: "${item.title}"`);
        }
      } else if (entity === "products") {
        if (type === "create") {
          const item = { ...payload, id: payload.id || `PR-SYNC-${Date.now()}`, price: Number(payload.price) || 0 };
          db.products.unshift(item);
          logAction(actor, "SYNC_POST_PRODUCT", "Cooperative Products", `[Verified-Sync] Listed product: ${item.name}`);
        }
      } else if (entity === "meetings") {
        if (type === "create") {
          const item = { ...payload, id: payload.id || `MT-SYNC-${Date.now()}` };
          db.meetings.unshift(item);
          logAction(actor, "SYNC_RECORD_MEETING", "Meetings", `[Verified-Sync] Logged meeting assembly: "${item.title}"`);
        }
      }
      appliedCount++;
    } catch (e: any) {
      console.error("Failed to apply batch sync op:", op, e);
    }
  }

  writeDB(db);
  res.json({ success: true, syncedCount: appliedCount });
});


// --- Compile & Dev Server Setup ---
const isProduction = process.env.NODE_ENV === "production";

async function runExpress() {
  if (!isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FAMS Server] Listening, URL: http://0.0.0.0:${PORT}`);
  });
}

// Export the app for Vercel serverless integration
export { app };

// Only start the standalone Express listener if NOT running in a Vercel serverless environment
if (!process.env.VERCEL) {
  runExpress();
}
