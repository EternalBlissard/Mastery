import crypto from "node:crypto";
import https from "node:https";

type DataApiField = {
  stringValue?: string;
  longValue?: number;
  doubleValue?: number;
  booleanValue?: boolean;
  isNull?: boolean;
};

type ExecuteStatementResponse = {
  records?: DataApiField[][];
  numberOfRecordsUpdated?: number;
};

const SERVICE = "rds-data";
const PATH = "/Execute";
const VECTOR_DIM = 512;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function hmac(key: crypto.BinaryLike, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function hmacHex(key: crypto.BinaryLike, data: string): string {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest("hex");
}

function hash(data: string) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function signRequest(body: string) {
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
  const signature = hmacHex(kSigning, stringToSign);

  return {
    host,
    amzDate,
    authorization: `AWS4-HMAC-SHA256 Credential=${requireEnv("AWS_ACCESS_KEY_ID")}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export function executeDataStatement(sql: string): Promise<ExecuteStatementResponse> {
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
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
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

export async function runDataApiHealthCheck() {
  const result = await executeDataStatement("select 1 as ok");
  return {
    ok: result.records?.[0]?.[0]?.longValue === 1,
    records: result.records,
  };
}

function vectorLiteral(first: number, second: number): string {
  const components = Array.from({ length: VECTOR_DIM }, () => 0);
  components[0] = first;
  components[1] = second;
  return `[${components.join(",")}]`;
}

export async function runDataApiVectorHealthCheck() {
  const queryVector = vectorLiteral(1, 0);
  const sameVector = vectorLiteral(1, 0);
  const result = await executeDataStatement(`
    SELECT
      vector_dims('${queryVector}'::vector) AS dimensions,
      '${queryVector}'::vector <=> '${sameVector}'::vector AS nearest_distance
  `);
  const row = result.records?.[0];
  const dimensions = row?.[0]?.longValue;
  const nearestDistance = row?.[1]?.doubleValue ?? row?.[1]?.longValue;

  return {
    ok: dimensions === VECTOR_DIM && nearestDistance === 0,
    dimensions,
    nearestDistance,
    operator: "<=>",
  };
}
