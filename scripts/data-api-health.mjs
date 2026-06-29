import crypto from "node:crypto";
import https from "node:https";

const SERVICE = "rds-data";
const PATH = "/Execute";
const VECTOR_DIM = 512;

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
  const canonicalRequest = ["POST", PATH, "", canonicalHeaders, signedHeaders, hash(body)].join("\n");
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
        path: PATH,
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

function vectorLiteral(first, second) {
  const components = Array.from({ length: VECTOR_DIM }, () => 0);
  components[0] = first;
  components[1] = second;
  return `[${components.join(",")}]`;
}

const databaseResult = await executeStatement("select 1 as ok");
const queryVector = vectorLiteral(1, 0);
const vectorResult = await executeStatement(`
  SELECT
    vector_dims('${queryVector}'::vector) AS dimensions,
    '${queryVector}'::vector <=> '${queryVector}'::vector AS nearest_distance
`);
const dimensions = vectorResult.records?.[0]?.[0]?.longValue;
const nearestDistance = vectorResult.records?.[0]?.[1]?.doubleValue ?? vectorResult.records?.[0]?.[1]?.longValue;

console.log(
  JSON.stringify({
    ok: databaseResult.records?.[0]?.[0]?.longValue === 1 && dimensions === VECTOR_DIM && nearestDistance === 0,
    database: { ok: databaseResult.records?.[0]?.[0]?.longValue === 1, records: databaseResult.records },
    vector: { ok: dimensions === VECTOR_DIM && nearestDistance === 0, dimensions, nearestDistance, operator: "<=>" },
  }),
);
