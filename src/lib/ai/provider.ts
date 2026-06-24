export type AIProvider = "groq" | "ollama" | "rules";

export interface AIResponse {
  text: string;
  provider: AIProvider;
}

export async function detectProvider(): Promise<AIProvider> {
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here") return "groq";
  try {
    const res = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return "ollama";
  } catch {}
  return "rules";
}

export async function callAI(prompt: string, systemPrompt?: string): Promise<AIResponse> {
  const provider = await detectProvider();

  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
        max_tokens: 2048,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const detail = data?.error?.message || JSON.stringify(data);
      if (res.status === 401) {
        throw new Error(`Invalid GROQ_API_KEY: ${detail}`);
      }
      throw new Error(`Groq API error ${res.status}: ${detail}`);
    }
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("Groq API returned empty response.");
    }
    return { text, provider: "groq" };
  }

  if (provider === "ollama") {
    const model = process.env.OLLAMA_MODEL || "llama3.3";
    const res = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt, stream: false }),
    });
    const data = await res.json();
    if (!res.ok || !data?.response) {
      throw new Error(`Ollama API error ${res.status}: ${JSON.stringify(data)}`);
    }
    return { text: data.response, provider: "ollama" };
  }

  return { text: "", provider: "rules" };
}
