import { readdir, readFile } from "node:fs/promises";
import crypto from "node:crypto";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "db", "migrations");
const SERVICE = "rds-data";
const DATA_API_PATH = "/Execute";

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

function splitSqlStatements(sql) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function listMigrationFiles() {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function applyMigration(filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = await readFile(filePath, "utf8");
  const statements = splitSqlStatements(sql);

  for (let index = 0; index < statements.length; index += 1) {
    await executeStatement(statements[index]);
    console.log(`Applied ${filename} statement ${index + 1}/${statements.length}`);
  }
}

async function main() {
  const files = await listMigrationFiles();

  if (files.length === 0) {
    console.log("No migration files found in db/migrations/");
    return;
  }

  for (const filename of files) {
    await applyMigration(filename);
    console.log(`Applied migration: ${filename}`);
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
