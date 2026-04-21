import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { word, meaning, example, collocations, phrases, nounPhrases, sentences, synonyms, antonyms } = await req.json();

    if (!word || !meaning) {
      return Response.json({ error: "Missing word or meaning" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Translate the following English vocabulary elements to Vietnamese. Return ONLY valid JSON with no markdown formatting.

Word: "${word}"
Meaning: "${meaning}"
${example ? `Example: "${example}"` : ""}
${collocations && collocations.length > 0 ? `Collocations: ${JSON.stringify(collocations)}` : ""}
${phrases && phrases.length > 0 ? `Phrases: ${JSON.stringify(phrases)}` : ""}
${nounPhrases && nounPhrases.length > 0 ? `Noun Phrases: ${JSON.stringify(nounPhrases)}` : ""}
${sentences && sentences.length > 0 ? `Sentences: ${JSON.stringify(sentences)}` : ""}
${synonyms && synonyms.length > 0 ? `Synonyms: ${JSON.stringify(synonyms)}` : ""}
${antonyms && antonyms.length > 0 ? `Antonyms: ${JSON.stringify(antonyms)}` : ""}

Return JSON with these exact keys (use empty arrays/strings if not provided):
{
  "meaningVi": "Vietnamese translation of meaning",
  "exampleVi": "Vietnamese translation of example",
  "collocationsVi": ["Vietnamese translation 1", "Vietnamese translation 2"],
  "phrasesVi": ["Vietnamese translation 1", "Vietnamese translation 2"],
  "nounPhrasesVi": ["Vietnamese translation 1", "Vietnamese translation 2"],
  "sentencesVi": ["Vietnamese translation 1", "Vietnamese translation 2"],
  "synonymsVi": ["Vietnamese translation 1", "Vietnamese translation 2"],
  "antonymsVi": ["Vietnamese translation 1", "Vietnamese translation 2"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    if (text.includes("```json")) {
      jsonStr = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      jsonStr = text.split("```")[1].split("```")[0].trim();
    }

    const data = JSON.parse(jsonStr);

    return Response.json({
      success: true,
      data: {
        meaningVi: data.meaningVi || "",
        exampleVi: data.exampleVi || "",
        collocationsVi: data.collocationsVi || [],
        phrasesVi: data.phrasesVi || [],
        nounPhrasesVi: data.nounPhrasesVi || [],
        sentencesVi: data.sentencesVi || [],
        synonymsVi: data.synonymsVi || [],
        antonymsVi: data.antonymsVi || []
      }
    });
  } catch (error: any) {
    console.error("Translation error:", error);
    return Response.json(
      { error: error.message || "Translation failed" },
      { status: 500 }
    );
  }
}
