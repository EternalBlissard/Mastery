// Demo seed: populate a complete, judge-ready demo account so the landing hero shows LIVE stats and
// study/dashboard are alive on a cold open — without generating on camera (no Bedrock call here).
//
// Idempotent: fixed UUIDs + upserts. Re-running re-stamps review timing relative to now() so the
// streak/due counts stay fresh. The demo user is keyed by email; when the Clerk demo account signs
// in with the SAME email, lib/auth.ts links clerk_id to this row (ON CONFLICT email) and the hero
// reads this data. Set DEMO_USER_EMAIL to your Clerk demo account email before recording.
//
//   npm run seed:demo
//
// Requires the same env as `npm run migrate` (RDS_RESOURCE_ARN, RDS_SECRET_ARN, RDS_DATABASE,
// AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) and that migrations have been applied.

import crypto from "node:crypto";
import https from "node:https";

const SERVICE = "rds-data";
const DATA_API_PATH = "/Execute";

const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@mastery.local";

// Fixed UUIDs (align with db/migrations/0006_clf_demo_seed.sql).
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CERT_ID = "00000000-0000-4000-8000-000000000010";
const GOAL_ID = "00000000-0000-4000-8000-000000000002";
const DOC_ID = "00000000-0000-4000-8000-000000000020";
const JOB_ID = "00000000-0000-4000-8000-000000000021";
const OBJ = {
  D1: "00000000-0000-4000-8000-000000000011", // Cloud Concepts (weight 24)
  D2: "00000000-0000-4000-8000-000000000012", // Security & Compliance (30)
  D3: "00000000-0000-4000-8000-000000000013", // Cloud Technology & Services (34)
  D4: "00000000-0000-4000-8000-000000000014", // Billing, Pricing, Support (12)
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function hmac(key, data, encoding) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest(encoding);
}

function hash(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function signRequest(body) {
  const region = requireEnv("AWS_REGION");
  const host = `${SERVICE}.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = [
    "POST",
    DATA_API_PATH,
    "",
    canonicalHeaders,
    signedHeaders,
    hash(body),
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hash(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${requireEnv("AWS_SECRET_ACCESS_KEY")}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign, "hex");

  return {
    host,
    amzDate,
    authorization: `AWS4-HMAC-SHA256 Credential=${requireEnv("AWS_ACCESS_KEY_ID")}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function executeStatement(sql) {
  const body = JSON.stringify({
    resourceArn: requireEnv("RDS_RESOURCE_ARN"),
    secretArn: requireEnv("RDS_SECRET_ARN"),
    database: requireEnv("RDS_DATABASE"),
    sql,
  });
  const { host, amzDate, authorization } = signRequest(body);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        method: "POST",
        path: DATA_API_PATH,
        headers: {
          "Content-Type": "application/json",
          "X-Amz-Date": amzDate,
          Authorization: authorization,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
            return;
          }
          reject(new Error(parsed.message || parsed.Message || data || `Data API status ${res.statusCode}`));
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// SQL string literal (single-quote escaped).
function q(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Page-level chunks (embeddings left NULL — runtime study/dashboard never re-embed these).
const chunks = [
  {
    id: "00000000-0000-4000-8000-000000000031",
    page: 4,
    heading: "Cloud Value Proposition",
    content:
      "The AWS Cloud trades capital expense for variable expense — you pay only for what you use. Benefits include economies of scale, elasticity, agility, and global reach: resources can be provisioned in minutes across AWS Regions worldwide.",
  },
  {
    id: "00000000-0000-4000-8000-000000000032",
    page: 7,
    heading: "Shared Responsibility Model",
    content:
      "Under the AWS Shared Responsibility Model, AWS is responsible for security OF the cloud (the physical data centers, hardware, and global infrastructure). The customer is responsible for security IN the cloud, including their data, IAM configuration, and guest operating system patching.",
  },
  {
    id: "00000000-0000-4000-8000-000000000033",
    page: 12,
    heading: "Identity and Access Management",
    content:
      "IAM identities are users, groups, and roles. Apply the principle of least privilege — grant only the permissions required for a task. Roles provide temporary credentials and avoid long-lived access keys. Multi-factor authentication (MFA) adds a second authentication factor.",
  },
  {
    id: "00000000-0000-4000-8000-000000000034",
    page: 15,
    heading: "Encryption and Compliance",
    content:
      "Data can be encrypted at rest using AWS KMS and in transit using TLS. AWS Artifact provides on-demand access to AWS compliance reports. Customers always own and control their own data.",
  },
  {
    id: "00000000-0000-4000-8000-000000000035",
    page: 19,
    heading: "Core AWS Services",
    content:
      "Amazon EC2 provides resizable compute capacity. Amazon S3 provides object storage with classes such as S3 Standard, S3 Standard-IA, and S3 Glacier for low-cost long-term archival. Amazon RDS is a managed relational database service.",
  },
];

const CHUNK = Object.fromEntries(chunks.map((c) => [c.page, c]));

// 11 grounded MCQs. D1/D2/D3 covered; D4 intentionally left uncovered → coverage = 3/4 = 75%.
// answerKey letter maps to the option index (A=0, B=1, C=2, D=3).
const itemDefs = [
  { obj: OBJ.D1, page: 4, stem: "Which statement best describes the AWS Cloud economic model?",
    options: ["Trades variable expense for capital expense", "Trades capital expense for variable expense", "Eliminates all costs after setup", "Requires a fixed three-year commitment"],
    answer: "B", explanation: "AWS converts large up-front capital expense into pay-as-you-go variable expense (p.4)." },
  { obj: OBJ.D1, page: 4, stem: "Which AWS Cloud benefit lets you provision resources in minutes across the globe?",
    options: ["Global reach and agility", "Manual data-center builds", "Long procurement cycles", "Fixed regional capacity"],
    answer: "A", explanation: "Global reach and agility let you deploy across Regions in minutes (p.4)." },
  { obj: OBJ.D1, page: 7, stem: "Under the shared responsibility model, who is responsible for the physical data centers?",
    options: ["The customer", "AWS", "A third-party auditor", "Responsibility is split per resource"],
    answer: "B", explanation: "AWS secures the cloud infrastructure, including physical data centers (p.7)." },
  { obj: OBJ.D2, page: 7, stem: "Patching the guest operating system on an EC2 instance is whose responsibility?",
    options: ["AWS", "The customer", "The hypervisor vendor", "No one — it is automatic"],
    answer: "B", explanation: "Guest OS patching is the customer's responsibility (security IN the cloud, p.7)." },
  { obj: OBJ.D2, page: 12, stem: "Which IAM practice grants only the permissions required to perform a task?",
    options: ["Least privilege", "Root access for all users", "Shared administrator keys", "Wildcard allow-all policies"],
    answer: "A", explanation: "Least privilege grants the minimum permissions needed (p.12)." },
  { obj: OBJ.D2, page: 12, stem: "What does enabling multi-factor authentication (MFA) provide?",
    options: ["A second authentication factor", "Encryption of data at rest", "An automatic backup Region", "A lower service price"],
    answer: "A", explanation: "MFA adds a second factor beyond the password (p.12)." },
  { obj: OBJ.D2, page: 15, stem: "Which service provides on-demand access to AWS compliance reports?",
    options: ["AWS Artifact", "AWS Shield", "Amazon Inspector", "AWS Config"],
    answer: "A", explanation: "AWS Artifact is the portal for compliance reports (p.15)." },
  { obj: OBJ.D3, page: 19, stem: "Which AWS service provides resizable compute capacity?",
    options: ["Amazon S3", "Amazon EC2", "AWS IAM", "Amazon RDS"],
    answer: "B", explanation: "Amazon EC2 provides resizable virtual compute (p.19)." },
  { obj: OBJ.D3, page: 19, stem: "Which S3 storage class is designed for low-cost long-term archival?",
    options: ["S3 Standard", "S3 Standard-IA", "S3 Glacier", "S3 Intelligent-Tiering"],
    answer: "C", explanation: "S3 Glacier targets archival at the lowest cost (p.19)." },
  { obj: OBJ.D3, page: 19, stem: "Amazon RDS is best described as which of the following?",
    options: ["Object storage", "A managed relational database", "A serverless function service", "A content delivery network"],
    answer: "B", explanation: "Amazon RDS is a managed relational database service (p.19)." },
  { obj: OBJ.D3, page: 15, stem: "Encrypting data in transit between a client and AWS typically uses which protocol?",
    options: ["TLS", "FTP", "Plaintext HTTP", "SMTP"],
    answer: "A", explanation: "TLS encrypts data in transit (p.15)." },
];

// review_state: first 5 items due now (drives "due today"), the rest scheduled later.
// review_log: spread across the last 5 days so the streak and questions-completed look real.
const STATE_STABILITY = 4.0;
const STATE_DIFFICULTY = 5.5;

function buildStatements() {
  const statements = [];

  // Certification + objectives (self-contained; matches 0006 seed).
  statements.push(`
    INSERT INTO certifications (id, name, code, provider)
    VALUES (${q(CERT_ID)}::uuid, 'AWS Certified Cloud Practitioner', 'CLF-C02', 'AWS')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, provider = EXCLUDED.provider
  `);

  const objRows = [
    [OBJ.D1, "CLF-C02-D1", "Cloud Concepts", 24, 1],
    [OBJ.D2, "CLF-C02-D2", "Security and Compliance", 30, 2],
    [OBJ.D3, "CLF-C02-D3", "Cloud Technology and Services", 34, 3],
    [OBJ.D4, "CLF-C02-D4", "Billing, Pricing, and Support", 12, 4],
  ];
  for (const [id, code, title, weight, seq] of objRows) {
    statements.push(`
      INSERT INTO objectives (id, certification_id, code, title, weight_pct, sequence)
      VALUES (${q(id)}::uuid, ${q(CERT_ID)}::uuid, ${q(code)}, ${q(title)}, ${weight}, ${seq})
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, weight_pct = EXCLUDED.weight_pct, sequence = EXCLUDED.sequence
    `);
  }

  // Demo user (linked to Clerk by email on first sign-in).
  statements.push(`
    INSERT INTO users (id, email, name)
    VALUES (${q(USER_ID)}::uuid, ${q(DEMO_USER_EMAIL)}, 'Demo User')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
  `);

  // Goal.
  statements.push(`
    INSERT INTO goals (id, user_id, certification_id, title, mode)
    VALUES (${q(GOAL_ID)}::uuid, ${q(USER_ID)}::uuid, ${q(CERT_ID)}::uuid, 'AWS Certified Cloud Practitioner', 'combined')
    ON CONFLICT (id) DO UPDATE SET certification_id = EXCLUDED.certification_id, title = EXCLUDED.title, mode = EXCLUDED.mode
  `);

  // Document + completed ingestion job.
  statements.push(`
    INSERT INTO documents (id, user_id, goal_id, filename, s3_key, status, page_count)
    VALUES (${q(DOC_ID)}::uuid, ${q(USER_ID)}::uuid, ${q(GOAL_ID)}::uuid, 'clf-c02-exam-guide.pdf', 'demo/clf-c02-exam-guide.pdf', 'done', 30)
    ON CONFLICT (id) DO UPDATE SET status = 'done', page_count = 30
  `);
  statements.push(`
    INSERT INTO ingestion_jobs (id, document_id, status, step, progress_pct)
    VALUES (${q(JOB_ID)}::uuid, ${q(DOC_ID)}::uuid, 'done', 'complete', 100)
    ON CONFLICT (id) DO UPDATE SET status = 'done', step = 'complete', progress_pct = 100
  `);

  // Chunks.
  for (const c of chunks) {
    statements.push(`
      INSERT INTO chunks (id, document_id, page_number, section_heading, content, token_count)
      VALUES (${q(c.id)}::uuid, ${q(DOC_ID)}::uuid, ${c.page}, ${q(c.heading)}, ${q(c.content)}, ${Math.ceil(c.content.length / 4)})
      ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, page_number = EXCLUDED.page_number
    `);
  }

  // Items + per-item review_state.
  const itemIds = [];
  itemDefs.forEach((it, idx) => {
    const itemId = `00000000-0000-4000-8000-0000000004${String(idx).padStart(2, "0")}`;
    itemIds.push(itemId);
    const chunk = CHUNK[it.page];
    const contentHash = hash(`${it.stem}\n${it.options.join("\n")}`);
    statements.push(`
      INSERT INTO items (id, goal_id, objective_id, source_chunk_id, type, stem, answer_key, distractors, explanation, source_page, content_hash)
      VALUES (
        ${q(itemId)}::uuid, ${q(GOAL_ID)}::uuid, ${q(it.obj)}::uuid, ${q(chunk.id)}::uuid, 'mcq',
        ${q(it.stem)}, ${q(it.answer)}, ${q(JSON.stringify(it.options))}::jsonb, ${q(it.explanation)}, ${it.page}, ${q(contentHash)}
      )
      ON CONFLICT (id) DO UPDATE SET stem = EXCLUDED.stem, distractors = EXCLUDED.distractors, answer_key = EXCLUDED.answer_key
    `);

    // First 5 due now; the rest spread into the future.
    const dueExpr = idx < 5 ? `now() - interval '${idx + 1} hours'` : `now() + interval '${idx - 4} days'`;
    const stateRowId = `00000000-0000-4000-8000-0000000005${String(idx).padStart(2, "0")}`;
    statements.push(`
      INSERT INTO review_state (id, user_id, item_id, stability, difficulty, due, state, reps, lapses, last_review)
      VALUES (
        ${q(stateRowId)}::uuid, ${q(USER_ID)}::uuid, ${q(itemId)}::uuid, ${STATE_STABILITY}, ${STATE_DIFFICULTY},
        ${dueExpr}, 2, 2, 0, now() - interval '1 day'
      )
      ON CONFLICT (user_id, item_id) DO UPDATE SET due = EXCLUDED.due, stability = EXCLUDED.stability, difficulty = EXCLUDED.difficulty, last_review = EXCLUDED.last_review
    `);
  });

  // Review log: ~18 events over the last 5 days (today included) → 5-day streak.
  // Fixed ids, re-stamped relative to now() each run, so the activity always looks current.
  const perDay = [3, 3, 4, 4, 4]; // days ago: 0,1,2,3,4
  const ratings = [3, 4, 2, 3, 4, 3, 1, 3, 4, 2, 3, 3, 4, 3, 2, 4, 3, 3];
  const logIds = [];
  let logIdx = 0;
  perDay.forEach((count, daysAgo) => {
    for (let n = 0; n < count; n += 1) {
      const logId = `00000000-0000-4000-8000-0000000006${String(logIdx).padStart(2, "0")}`;
      logIds.push(logId);
      const itemId = itemIds[logIdx % itemIds.length];
      const rating = ratings[logIdx % ratings.length];
      // Offset within the day so timestamps differ.
      const reviewedAt = `now() - interval '${daysAgo} days' - interval '${n * 37} minutes'`;
      statements.push(`
        INSERT INTO review_log (id, user_id, item_id, rating, response_ms, state, stability, difficulty, elapsed_days, reviewed_at)
        VALUES (${q(logId)}::uuid, ${q(USER_ID)}::uuid, ${q(itemId)}::uuid, ${rating}, ${4000 + n * 250}, 2, ${STATE_STABILITY}, ${STATE_DIFFICULTY}, ${daysAgo}, ${reviewedAt})
        ON CONFLICT (id) DO NOTHING
      `);
      logIdx += 1;
    }
  });
  // Re-stamp on rerun: clear our own log rows first so reviewed_at tracks "now" again.
  statements.unshift(`DELETE FROM review_log WHERE id = ANY (ARRAY[${logIds.map((id) => `${q(id)}::uuid`).join(",")}])`);

  // Mastery per objective → weighted readiness ≈ 58%.
  const masteryRows = [
    [OBJ.D1, 0.72, 8, 6],
    [OBJ.D2, 0.55, 10, 6],
    [OBJ.D3, 0.61, 9, 6],
    [OBJ.D4, 0.3, 0, 0],
  ];
  for (const [objId, pKnown, attempts, correct] of masteryRows) {
    statements.push(`
      INSERT INTO mastery (user_id, objective_id, p_known, attempts, correct)
      VALUES (${q(USER_ID)}::uuid, ${q(objId)}::uuid, ${pKnown}, ${attempts}, ${correct})
      ON CONFLICT (user_id, objective_id) DO UPDATE SET p_known = EXCLUDED.p_known, attempts = EXCLUDED.attempts, correct = EXCLUDED.correct, updated_at = now()
    `);
  }

  return statements;
}

async function main() {
  const statements = buildStatements();
  console.log(`Seeding demo account (${statements.length} statements) for ${DEMO_USER_EMAIL}…`);
  for (let i = 0; i < statements.length; i += 1) {
    await executeStatement(statements[i].trim());
    process.stdout.write(`\r  ${i + 1}/${statements.length}`);
  }
  console.log("\nDemo seed complete.");
  console.log("Next: sign into the Clerk demo account using this email so the hero/dashboard link to the seeded data:");
  console.log(`  ${DEMO_USER_EMAIL}`);
  console.log("Goal:", GOAL_ID);
}

main().catch((error) => {
  console.error("\nSeed failed:", error);
  process.exit(1);
});
