import crypto from "node:crypto";
import https from "node:https";

const SERVICE = "s3";

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

function hashHex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function hashPayload(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function encodeS3Key(key: string): string {
  return key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function signPutRequest(path: string, body: Buffer, contentType: string) {
  const region = requireEnv("AWS_REGION");
  const host = `${SERVICE}.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const payloadHash = hashPayload(body);
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashHex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${requireEnv("AWS_SECRET_ACCESS_KEY")}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmacHex(kSigning, stringToSign);

  return {
    host,
    amzDate,
    payloadHash,
    authorization: `AWS4-HMAC-SHA256 Credential=${requireEnv("AWS_ACCESS_KEY_ID")}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export function putDocumentObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const bucket = requireEnv("AWS_S3_BUCKET");
  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const path = `/${bucket}/${encodeS3Key(key)}`;
  const { host, amzDate, payloadHash, authorization } = signPutRequest(path, bodyBuffer, contentType);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        method: "PUT",
        path,
        headers: {
          "Content-Type": contentType,
          "Content-Length": bodyBuffer.length,
          "X-Amz-Date": amzDate,
          "X-Amz-Content-Sha256": payloadHash,
          Authorization: authorization,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
            return;
          }

          reject(new Error(data || `S3 PUT status ${res.statusCode}`));
        });
      },
    );

    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
}
