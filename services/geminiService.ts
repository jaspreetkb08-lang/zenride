import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getRouteInsights = async (pickup: string, dropoff: string): Promise<string> => {
  const client = getClient();
  if (!client) return "Enjoy your ride! Traffic looks clear.";

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Give me a very short, chill, and friendly one-sentence traffic update or fun fact for a trip from ${pickup} to ${dropoff} in India. Keep it under 15 words.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Smooth roads ahead! Relax and enjoy the view.";
  }
};

export const getDriverMessage = async (driverName: string): Promise<string> => {
    const client = getClient();
    if (!client) return "I'm on my way!";

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a short, polite text message from a cab driver named ${driverName} saying they are arriving in 2 minutes. Use Indian English style. No quotes.`,
        });
        return response.text.trim();
    } catch (error) {
        return "I am reaching your location in 2 mins.";
    }
}

export const getChatResponse = async (userMessage: string, driverName: string): Promise<string> => {
    const client = getClient();
    if (!client) return "Ok sir, I am coming.";

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an Indian cab driver named ${driverName}. The passenger sent you this message: "${userMessage}". Reply briefly, politely, and naturally in Indian English. Do not use quotes. Keep it under 20 words.`,
        });
        return response.text.trim();
    } catch (error) {
        return "Ok, noted.";
    }
};