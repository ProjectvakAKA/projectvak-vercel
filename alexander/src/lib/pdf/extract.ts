// pdf-parse is CommonJS and has no ES default export
const pdfParse = require("pdf-parse");

export async function extractPdfText(buffer: Buffer) {
  const result = await pdfParse(buffer);
  return {
    text: result.text ?? "",
    pageCount: result.numpages ?? 0,
  };
}
