import pdfParse from "pdf-parse";

export type DocumentChunk = {
  pageNumber: number;
  sectionHeading: string;
  content: string;
  tokenCount: number;
};

const MIN_TOKENS = 400;
const MAX_TOKENS = 800;
const TARGET_TOKENS = 600;
/** ~10% overlap between consecutive chunks for context continuity. */
const OVERLAP_RATIO = 0.1;

function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function isLikelyHeading(line: string): boolean {
  if (line.length > 100 || line.length < 3) {
    return false;
  }
  if (/^\d+(\.\d+)*\s+\S/.test(line)) {
    return true;
  }
  if (line === line.toUpperCase() && /[A-Z]/.test(line) && line.length <= 80) {
    return true;
  }
  if (!line.endsWith(".") && line.length <= 60 && /^[A-Z]/.test(line)) {
    return true;
  }
  return false;
}

function detectSectionHeading(pageText: string, fallback: string): string {
  const lines = pageText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (isLikelyHeading(line)) {
      return line;
    }
  }
  return fallback;
}

function chunkPageText(
  pageText: string,
  pageNumber: number,
  sectionHeading: string,
): DocumentChunk[] {
  const words = pageText.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const overlapWords = Math.max(1, Math.floor(TARGET_TOKENS * OVERLAP_RATIO));
  const chunks: DocumentChunk[] = [];
  let start = 0;

  while (start < words.length) {
    let end = Math.min(start + MAX_TOKENS, words.length);
    if (end - start < MIN_TOKENS && end < words.length) {
      end = Math.min(start + MIN_TOKENS, words.length);
    }

    const content = words.slice(start, end).join(" ");
    chunks.push({
      pageNumber,
      sectionHeading,
      content,
      tokenCount: estimateTokens(content),
    });

    if (end >= words.length) {
      break;
    }

    const nextStart = end - overlapWords;
    if (nextStart <= start) {
      break;
    }
    start = nextStart;
  }

  return chunks;
}

type PdfPageData = {
  pageIndex: number;
  getTextContent: (options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }) => Promise<{
    items: Array<{ str?: string; transform?: number[] }>;
  }>;
};

async function parsePdfPages(buffer: Buffer): Promise<Array<{ pageNumber: number; text: string }>> {
  const pages: Array<{ pageNumber: number; text: string }> = [];

  const renderPage = (pageData: PdfPageData) => {
    const pageNumber = pageData.pageIndex + 1;
    return pageData
      .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
      .then((textContent) => {
        let lastY: number | undefined;
        let text = "";
        for (const item of textContent.items) {
          const str = item.str ?? "";
          const y = item.transform?.[5];
          if (lastY === y || lastY === undefined) {
            text += str;
          } else {
            text += `\n${str}`;
          }
          lastY = y;
        }
        pages.push({ pageNumber, text });
        return text;
      });
  };

  await pdfParse(buffer, { pagerender: renderPage });
  pages.sort((a, b) => a.pageNumber - b.pageNumber);
  return pages;
}

export async function chunkDocument(buffer: Buffer): Promise<DocumentChunk[]> {
  const pdfPages = await parsePdfPages(buffer);
  const chunks: DocumentChunk[] = [];
  let currentHeading = "";

  for (const { pageNumber, text } of pdfPages) {
    currentHeading = detectSectionHeading(text, currentHeading);
    chunks.push(...chunkPageText(text, pageNumber, currentHeading));
  }

  return chunks;
}
