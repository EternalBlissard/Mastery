import { executeDataStatement } from "../db/data-api";
import { embedText } from "./bedrock";

export type RetrievedChunk = {
  id: string;
  content: string;
  pageNumber: number | null;
};

export type RetrieveTopChunksParams = {
  goalId: string;
  objectiveId?: string;
  query?: string;
  k: number;
};

type DataApiField = {
  stringValue?: string;
  longValue?: number;
  doubleValue?: number;
  booleanValue?: boolean;
  isNull?: boolean;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function fieldString(field: DataApiField | undefined): string | null {
  if (!field || field.isNull) {
    return null;
  }
  return field.stringValue ?? null;
}

function fieldInt(field: DataApiField | undefined): number | null {
  if (!field || field.isNull) {
    return null;
  }
  if (field.longValue != null) {
    return field.longValue;
  }
  if (field.doubleValue != null) {
    return Math.trunc(field.doubleValue);
  }
  return null;
}

async function loadObjectiveQueryText(objectiveId: string): Promise<string> {
  const result = await executeDataStatement(`
    SELECT title, description
    FROM objectives
    WHERE id = '${objectiveId}'::uuid
    LIMIT 1
  `);

  const row = result.records?.[0];
  const title = fieldString(row?.[0]);
  if (!title) {
    throw new Error(`Objective not found: ${objectiveId}`);
  }

  const description = fieldString(row?.[1]);
  return description ? `${title}\n${description}` : title;
}

async function resolveQueryText(params: RetrieveTopChunksParams): Promise<string> {
  const explicitQuery = params.query?.trim();
  if (explicitQuery) {
    return explicitQuery;
  }

  if (params.objectiveId) {
    if (!isUuid(params.objectiveId)) {
      throw new Error("objectiveId must be a valid UUID");
    }
    return loadObjectiveQueryText(params.objectiveId);
  }

  throw new Error("Either query or objectiveId is required for retrieval");
}

export async function retrieveTopChunks(params: RetrieveTopChunksParams): Promise<RetrievedChunk[]> {
  const goalId = String(params.goalId ?? "").trim();
  if (!goalId || !isUuid(goalId)) {
    throw new Error("goalId must be a valid UUID");
  }

  const k = Math.max(1, Math.floor(params.k));
  const queryText = await resolveQueryText(params);
  const queryVector = vectorLiteral(await embedText(queryText));

  const result = await executeDataStatement(`
    SELECT c.id, c.content, c.page_number
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE d.goal_id = '${goalId}'::uuid
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> '${queryVector}'::vector
    LIMIT ${k}
  `);

  const rows = result.records ?? [];
  const chunks: RetrievedChunk[] = [];

  for (const row of rows) {
    const id = fieldString(row[0]);
    const content = fieldString(row[1]);
    if (!id || !content) {
      continue;
    }

    chunks.push({
      id,
      content,
      pageNumber: fieldInt(row[2]),
    });
  }

  return chunks;
}
