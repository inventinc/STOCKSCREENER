
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { StockDetails } from '../types';
import { formatMarketCap } from './stockService';

// IMPORTANT: The API key must be available as process.env.API_KEY in the execution environment.
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

const getAIInstance = (): GoogleGenAI => {
  if (!API_KEY) {
    console.error("Gemini API Key (process.env.API_KEY) is missing.");
    throw new Error("Gemini API Key is not configured. AI features are unavailable.");
  }
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
};

export const generateInvestmentThesis = async (stockDetails: StockDetails): Promise<string> => {
  const genAI = getAIInstance();

  const prompt = `Generate a concise investment thesis for the stock ${stockDetails.name} (${stockDetails.symbol}).
Consider the following information:
Company Name: ${stockDetails.name || "N/A"}
Symbol: ${stockDetails.symbol || "N/A"}
Company Description: ${stockDetails.description ? stockDetails.description.substring(0, 1000) + (stockDetails.description.length > 1000 ? "..." : "") : "N/A"}
Sector: ${stockDetails.sector || "N/A"}
Industry: ${stockDetails.industry || "N/A"}

Key Financials & Metrics:
- Current Price: ${stockDetails.price ? `$${stockDetails.price.toFixed(2)}` : 'N/A'}
- Market Capitalization: ${formatMarketCap(stockDetails.marketCap)}
- P/E Ratio (TTM): ${stockDetails.peRatioTTM?.toFixed(2) ?? 'N/A'}
- Return on Equity (ROE TTM): ${stockDetails.rotce ?? 'N/A'}
- Debt/Equity Ratio (TTM): ${stockDetails.debtEquityRatioTTM?.toFixed(2) ?? 'N/A'}
- Debt/EBITDA (TTM): ${stockDetails.debtEbitda ?? 'N/A'}
- EV/EBITDA (TTM): ${stockDetails.evEbit ?? 'N/A'}
- FCF/Net Income (TTM): ${stockDetails.fcfNi ?? 'N/A'}
- Dividend Yield: ${stockDetails.dividendYield ?? 'N/A'}
- 52 Week Range: ${stockDetails['52WeekLow'] || 'N/A'} - ${stockDetails['52WeekHigh'] || 'N/A'}
- CEO: ${stockDetails.ceo || "N/A"}

Focus on:
1.  Core Business & Competitive Advantages (Moat): What does the company do and what makes it strong?
2.  Financial Health & Valuation: Key strengths or weaknesses in its financials. Is it fairly valued, undervalued, or overvalued based on the provided metrics?
3.  Growth Prospects & Catalysts: What are the opportunities for growth? Any specific catalysts?
4.  Potential Risks & Concerns: What are the main risks or challenges the company faces?
5.  Overall Outlook: A brief summary of the investment potential.

The thesis should be approximately 150-250 words, well-structured, and provide a balanced overview suitable for an initial investment assessment.
Start with a clear title: "Investment Thesis for [Company Name] ([Symbol]):"
Format the output for good readability, possibly using bullet points for key areas.
Avoid making definitive buy/sell recommendations.
`;

  try {
    const response: GenerateContentResponse = await genAI.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
    });

    const text = response.text;

    if (!text) {
        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
            console.warn(`AI thesis generation blocked. Reason: ${blockReason}`, response.promptFeedback);
            throw new Error(`AI thesis generation was blocked due to: ${blockReason}. The content might be sensitive or violate safety policies.`);
        }
        console.warn("AI thesis generation returned an empty response. Response object:", response);
        throw new Error("AI engine returned an empty response. The content might have been filtered or an unknown issue occurred.");
    }
    
    return text;

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    if (error.message && (error.message.includes("API Key not valid") || error.message.includes("API key not valid"))) {
        throw new Error("Invalid Gemini API Key. Please ensure it's configured correctly (typically via process.env.API_KEY).");
    }
    if (error.message && error.message.toLowerCase().includes("quota")) {
        throw new Error("Gemini API quota exceeded. Please check your usage limits or try again later.");
    }
    // Check for network-like errors or service unavailable
    if (error.message && (error.message.toLowerCase().includes("fetch failed") || error.message.toLowerCase().includes("network error"))) {
      throw new Error("Network error connecting to Gemini API. Please check your internet connection.");
    }
    throw new Error(error.message || "An unexpected error occurred while generating the AI thesis.");
  }
};
