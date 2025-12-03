import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import { GeminiModel } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// System instructions for different contexts
const WRITER_SYSTEM_INSTRUCTION = `You are a world-class editor and writing partner. 
Your goal is to help the user write clear, compelling, and high-quality content. 
You can draft new content, rewrite existing text, and provide proactive feedback.
Adopt a supportive, professional, and slightly creative tone.
When asked to rewrite, maintain the user's voice unless asked to change it.`;

export const generateDraft = async (
  prompt: string, 
  context?: string, 
  files?: { name: string, content: string }[]
): Promise<string> => {
  try {
    const parts: any[] = [];
    
    // Add file context if any
    if (files && files.length > 0) {
      parts.push({ text: "Here are the attached reference files:\n" });
      files.forEach(f => {
        parts.push({ text: `--- FILE: ${f.name} ---\n${f.content}\n---\n` });
      });
    }

    // Add current document context if explicitly provided (or part of prompt)
    if (context) {
      parts.push({ text: `--- CURRENT DOCUMENT CONTEXT ---\n${context}\n---\n` });
    }

    parts.push({ text: prompt });

    // Use Pro model for drafting with high thinking budget for quality
    const response = await ai.models.generateContent({
      model: GeminiModel.PRO,
      contents: { parts },
      config: {
        systemInstruction: WRITER_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 2048 }, // Moderate thinking for drafts
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Draft generation failed:", error);
    throw error;
  }
};

export const inlineEdit = async (
  selection: string, 
  instruction: string, 
  surroundingContext: string
): Promise<string> => {
  try {
    const prompt = `
    I need you to rewrite the following text selection based on my instruction.
    
    CONTEXT (Surrounding text):
    "...${surroundingContext.slice(-500)}..."
    
    SELECTION TO REWRITE:
    "${selection}"
    
    INSTRUCTION:
    ${instruction}
    
    Return ONLY the rewritten text. Do not add quotes or explanations.
    `;

    // Use Flash for speed in inline edits
    const response = await ai.models.generateContent({
      model: GeminiModel.FLASH,
      contents: prompt,
      config: {
        systemInstruction: "You are a precise text editor. Output only the replacement text.",
      }
    });

    return response.text || selection;
  } catch (error) {
    console.error("Inline edit failed:", error);
    throw error;
  }
};

export const proactiveReview = async (text: string): Promise<{ hasSuggestion: boolean, explanation?: string, suggestion?: string }> => {
  try {
    const prompt = `
    Analyze the following paragraph for improvements in clarity, tone, or grammar. 
    If it is already good, return hasSuggestion: false.
    If it can be significantly improved, return hasSuggestion: true with a brief explanation and a rewritten version.
    
    TEXT:
    "${text}"
    `;

    const response = await ai.models.generateContent({
      model: GeminiModel.FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasSuggestion: { type: Type.BOOLEAN },
            explanation: { type: Type.STRING },
            suggestion: { type: Type.STRING }
          },
          required: ["hasSuggestion"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return { hasSuggestion: false };
  } catch (error) {
    console.error("Review failed:", error);
    return { hasSuggestion: false };
  }
};

export const factCheck = async (query: string): Promise<{ text: string, sources: any[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: GeminiModel.FLASH,
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return {
      text: response.text || "Could not verify.",
      sources: groundingChunks
    };
  } catch (error) {
    console.error("Fact check failed:", error);
    throw error;
  }
};
