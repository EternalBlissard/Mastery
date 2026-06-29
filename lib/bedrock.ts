import crypto from "node:crypto";
import https from "node:https";

const SERVICE = "bedrock";
const EMBEDDING_DIM = 512;

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

function signInvokeRequest(path: string, body: string) {
  const region = requireEnv("AWS_REGION");
  const host = `bedrock-runtime.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const payloadHash = hashHex(body);
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["POST", path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
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

type InvokeModelResponse = {
  embedding?: number[];
};

export async function embedText(text: string): Promise<number[]> {
  const modelId = requireEnv("BEDROCK_EMBEDDING_MODEL");
  const body = JSON.stringify({
    inputText: text,
    dimensions: EMBEDDING_DIM,
    normalize: true,
  });
  const path = `/model/${encodeURIComponent(modelId)}/invoke`;
  const { host, amzDate, payloadHash, authorization } = signInvokeRequest(path, body);

  const responseBody = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        method: "POST",
        path,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
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
            resolve(data);
            return;
          }

          let message = data;
          try {
            const parsed = JSON.parse(data) as { message?: string; Message?: string };
            message = parsed.message || parsed.Message || data;
          } catch {
            // keep raw body
          }
          reject(new Error(message || `Bedrock invoke status ${res.statusCode}`));
        });
      },
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });

  const parsed = JSON.parse(responseBody) as InvokeModelResponse;
  const embedding = parsed.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Bedrock response missing embedding array");
  }
  if (embedding.length !== EMBEDDING_DIM) {
    throw new Error(`Expected ${EMBEDDING_DIM}-dim embedding, got ${embedding.length}`);
  }

  return embedding;
}
