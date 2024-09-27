import { OpenAIProvider } from "./llm.js";

const OPENAI_API_KEY = "YOUR_OPEN_AI_API_KEY";
// Configure the LLMProvider of your choice, see llm.js for more details
// OpenAI: const llmProvider = new OpenAIProvider(OPENAI_API_KEY);
// Ollama: const llmProvider = new OllamaProvider();
const llmProvider = new OpenAIProvider(OPENAI_API_KEY);
const ALLOWED_ORIGIN = "https://news.ycombinator.com";

var isSummarizing = false;
var sidePanelReady = false;

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);

  // Enables the side panel on google.com
  if (url.origin === ALLOWED_ORIGIN) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
  } else {
    // Disables the side panel on all other sites
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false,
    });
  }
});

// service_worker.js
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "summarize_comments") {
    if (isSummarizing) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "alert",
        message: "Summarization in progress, you can summarize after",
      });
      return;
    }
    isSummarizing = true;
    await chrome.sidePanel.open({ tabId: sender.tab.id });
    if (sidePanelReady) {
      await chrome.runtime.sendMessage({ action: "start_summary" });
    }
    await streamSummarizedComments(message.commentsChunks, sender.tab.id);
  } else if (message.action === "sidepanel_ready") {
    sidePanelReady = true;
    if (isSummarizing) {
      await chrome.runtime.sendMessage({ action: "start_summary" });
    }
  } else if (message.action === "sidepanel_closed") {
    sidePanelReady = false;
  }
});

async function fetchFinalSummary(combinedSummaries, tabId) {
  const finalPrompt = `Summarize the following summaries, be concise and focus on the recurring thoughts and overall sentiment. Have a section with the key points made in the discussions. Don't include a title.: ${combinedSummaries}`;

  // Use streaming summarization for the final summary
  return await llmProvider.summarizeStream(finalPrompt, (chunkText) => {
    chrome.runtime.sendMessage({
      action: "stream_chunk",
      chunk: chunkText,
      tabId,
    });
  });
}

async function summarizeAndStreamChunk(chunk, tabId) {
  const prompt = `Summarize the following Hacker News comments focusing on the key points and recurring thoughts: ${JSON.stringify(
    chunk
  )}`;

  // Use streaming summarization via provider
  return await llmProvider.summarizeStream(prompt, (chunkText) => {
    chrome.runtime.sendMessage({
      action: "stream_chunk",
      chunk: chunkText,
      tabId,
    });
  });
}

async function streamSummarizedComments(commentsChunks, tabId) {
  if (commentsChunks.length === 1) {
    const summary = await summarizeAndStreamChunk(commentsChunks[0], tabId);
    isSummarizing = false;
    chrome.runtime.sendMessage({
      action: "stream_complete",
      summary,
      tabId,
    });
    return;
  }
  try {
    // Create an array of promises to call the LLM provider for each chunk
    const summaries = await Promise.all(
      commentsChunks.map(async (chunk) => {
        const prompt = `Summarize the following Hacker News comments focusing on the key points and recurring thoughts: ${JSON.stringify(
          chunk
        )}`;

        // Use provider summarization for each chunk
        return await llmProvider.summarize(prompt);
      })
    );

    isSummarizing = false;

    // Combine the summaries for the final summarization
    const combinedSummaries = summaries.join("\n");
    const finalSummary = await fetchFinalSummary(combinedSummaries, tabId);

    chrome.runtime.sendMessage({
      action: "stream_complete",
      summary: finalSummary,
      tabId,
    });
  } catch (error) {
    console.error("Error in streamSummarizedComments:", error.message);
    chrome.runtime.sendMessage({
      action: "stream_error",
      error: error.message,
      tabId,
    });
  }
}
