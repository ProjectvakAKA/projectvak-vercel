type EpcFieldValue = {
  value: string | number | null;
  confidence: number;
};

export type EpcExtraction = {
  fields: Record<string, EpcFieldValue>;
  overall_confidence: number;
  warnings: string[];
};

export async function extractEpcFields(text: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const systemPrompt =
    "You extract structured data from Flemish (NL) EPC certificates. " +
    "Return only JSON. Use null when a field is missing. " +
    "Confidence values are between 0 and 1.";

  const userPrompt = `
Extract EPC fields from the text below and return JSON in this schema:
{
  "fields": {
    "energy_class": {"value": "A+", "confidence": 0.0},
    "usable_floor_area_m2": {"value": 120, "confidence": 0.0},
    "year_of_construction": {"value": 1998, "confidence": 0.0},
    "certificate_id": {"value": "123456789", "confidence": 0.0},
    "certificate_date": {"value": "YYYY-MM-DD", "confidence": 0.0},
    "address": {"value": "Street 1", "confidence": 0.0},
    "postal_code": {"value": "2000", "confidence": 0.0},
    "municipality": {"value": "Antwerpen", "confidence": 0.0}
  },
  "overall_confidence": 0.0,
  "warnings": []
}

EPC TEXT:
${text}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const textResponse = await response.text();
    throw new Error(`OpenAI extraction failed: ${textResponse}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response missing content.");
  }

  return JSON.parse(content) as EpcExtraction;
}
