declare module "pdf-parse" {
  interface PDFPageData {
    pageIndex: number;
    getTextContent: (options: {
      normalizeWhitespace: boolean;
      disableCombineTextItems: boolean;
    }) => Promise<{
      items: Array<{ str?: string; transform?: number[] }>;
    }>;
  }

  interface PDFParseOptions {
    pagerender?: (pageData: PDFPageData) => Promise<string>;
    max?: number;
    version?: string;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    version: string;
    text: string;
  }

  function pdfParse(data: Buffer, options?: PDFParseOptions): Promise<PDFData>;
  export = pdfParse;
}
