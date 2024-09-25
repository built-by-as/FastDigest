// LLMProvider.js
class LLMProvider {
  async summarize(prompt, stream = false) {
    throw new Error("summarize method must be implemented.");
  }

  async summarizeStream(prompt, onChunk) {
    throw new Error("summarizeStream method must be implemented.");
  }
}

// OpenAIProvider.js
export class OpenAIProvider extends LLMProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.apiUrl = "https://api.openai.com/v1/chat/completions";
    this.model = "gpt-4o";
  }

  async summarize(prompt) {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async summarizeStream(prompt, onChunk) {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonData = line.replace(/^data: /, "");
        if (jsonData && jsonData !== "[DONE]") {
          const parsed = JSON.parse(jsonData);
          const content = parsed.choices[0]?.delta?.content || "";
          text += content;
          onChunk(content);
        }
      }
    }

    return text;
  }
}

// OllamaProvider.js
export class OllamaProvider extends LLMProvider {
  constructor() {
    super();
    this.apiUrl = "http://localhost:11434/api/generate";
    this.model = "llama3.1";
  }

  async summarize(prompt) {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
      }),
    });

    const data = await response.json();
    return data.response;
  }

  async summarizeStream(prompt, onChunk) {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: true,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");
      for (const line of lines) {
        const jsonData = JSON.parse(line);
        const content = jsonData.response;
        if (content) {
          text += content;
          onChunk(content);
        }
      }
    }

    return text;
  }
}
