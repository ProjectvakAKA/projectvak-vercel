import pdf from "pdf-parse";

export async function extractPdfText(buffer: Buffer) {
  const result = await pdf(buffer);
  return {
    text: result.text ?? "",
    pageCount: result.numpages ?? 0,
  };
}
