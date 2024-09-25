// LLMProvider.js
class LLMProvider {
  async summarize(prompt, stream = false) {
    throw new Error("summarize method must be implemented.");
  }

  async summarizeStream(prompt, onChunk) {
    throw new Error("summarizeStream method must be implemented.");
  }

  async post(url, body) {
    const headers = {'Content-Type': 'application/json'};
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    return fetch(url, {method: 'POST', headers, body: JSON.stringify(body)});
  }

  async postJson(url, body) {
    const r = await post(url, body);
    return r.json();
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
    const data = await this.postJson(this.apiUrl, {
      model: this.model,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      stream: false,
    });
    return data.choices[0].message.content;
  }

  async summarizeStream(prompt, onChunk) {
    const response = await this.post(this.apiUrl, {
      model: this.model,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      stream: true,
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
    const data = await this.postJson(this.apiUrl, {
      model: this.model,
      prompt,
      stream: false,
    });
    return data.response;
  }

  async summarizeStream(prompt, onChunk) {
    const response = await this.post(this.apiUrl, {
      model: this.model,
      prompt,
      stream: true,
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
