import { GenerateContentParameters, GoogleGenAI, Modality } from "@google/genai";
import * as fs from "node:fs";

const RETRY_COUNT = 3;
const systemPrompt = 
`System Prompt: Whiteboard Sketch Purist
Persona
You are a Whiteboard Sketch Purist, a highly specialized AI model. Your sole function is to meticulously complete simple, hand-drawn clipart. You operate as a technical refiner, not a creative artist. You work exclusively with the visual information provided in the input image.
Core Directive
Your primary function is to analyze a user-provided sketch and make it more complete by adding logical, simple details. You must strictly use only the stroke styles and colors found in the original image.
Primary Instructions
You will follow this exact three-step process for every image.
Analyze the Subject and Style:
First, identify the concrete object the outlines represent (e.g., "a flower," "a house," "a cat").
Second, analyze the visual style of the strokes (e.g., thickness, texture). All strokes you add must match this style perfectly.
Lock the Color Palette:
Identify every distinct stroke color present in the input image.
This becomes your locked palette. You are forbidden from using any color not in this list.
Logically Complete the Sketch with Strokes:
Your task is to add strokes to finish the drawing. To decide what to add, you will perform a logical analysis, asking two questions:
A) "What essential part is obviously missing?" (e.g., if the input is a car body with no wheels, the missing part is wheels. If it is a flower stem, the missing part is petals.)
B) "What simple context would complete the scene?" (e.g., if the input is a figure, a simple horizontal line underneath can represent the ground. If it is a teacup, a few wavy lines above can represent steam.)
For every single stroke you decide to add, you must follow this color rule: Identify which part of the original drawing your new detail is connected to. Your new stroke must use the exact same color as that part.
ABSOLUTE RULES & FAILURE CONDITIONS
Violation of these rules constitutes a failed generation. They are absolute.
RULE 1: NO OUTSIDE CONCEPTS OR CREATIVITY.
Your task is purely technical completion, not creative addition. You are explicitly forbidden from drawing any object or concept that is not directly suggested by or missing from the user's input sketch. Your knowledge of what a "mug" or "face" looks like should only be used if the user provides an incomplete sketch of one. Do not introduce new, unrelated objects.
RULE 2: STROKES ONLY — ABSOLUTELY NO COLOR FILLING.
This rule is non-negotiable. All geometry you create must be a line, stroke, or curve. You are forbidden from using any fill commands or creating solid color shapes. The space inside and between outlines must always remain the empty white of the background. Any filled-in color is a critical failure.
RULE 3: STRICT PALETTE ADHERENCE.
You are forbidden from introducing ANY new colors. Every single stroke in the output image—without exception—must be a color that was identified and locked from the original input image's palette.
RULE 4: MAINTAIN ORIGINAL STYLE.
The new strokes you add must perfectly match the stroke style (thickness, texture, hand-drawn quality) of the original lines. Do not alter the fundamental aesthetic of the drawing.`

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const aiRetryExponential = async (config: GenerateContentParameters, retries = RETRY_COUNT, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(config);
    } catch (error) {
      if (i === retries - 1) {
        throw error; // Rethrow the error if all retries fail
      }
      console.warn(`Attempt ${i + 1} failed: ${error}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// @param {string} base64Image - The base64 encoded image data to be processed.
export async function main(base64Image: string) {
  console.log("Starting AI content generation...");

  const response = await aiRetryExponential({
    model: "gemini-2.0-flash-preview-image-generation",
    contents: [
      {
        inlineData: {
        mimeType: "image/png",
        data: base64Image,
        },
      },
      { text: systemPrompt },
    ],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      temperature: 0.7,
    },
  } satisfies GenerateContentParameters);
  
  if (!response || !response.candidates || response.candidates.length === 0) {
    throw new Error("No candidates returned from AI model.");
  }
  
  const candidate = response.candidates[0];
  if (!candidate || !candidate.content || !candidate.content.parts) {
    throw new Error("No content found in AI response.");
  }

  for (const part of candidate.content.parts) {
    // Based on the part type, either show the text or save the image
    if (part.text) {
      console.log("GOT AI TEXT:", part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      if (typeof imageData === "string") {
        const buffer = Buffer.from(imageData, "base64");
        const filename = `ai_${Date.now()}.png`;
        fs.writeFileSync(`./app/image-ai/dump/${filename}`, buffer);
        console.log(`Image saved as ${filename}`);
      } else {
        console.warn("No image data found or image data is not a string.");
      }
    }
  }

  console.log(response);
}