// sidepanel.js
const summaryDiv = document.getElementById("summary");
const spinner = document.getElementById("spinner");
const loadingText = document.getElementById("loading-text");
let summaryContent = "";

// Function to show the loading spinner and text
function showLoading() {
  spinner.style.display = "block";
  loadingText.style.display = "block";
}

// Function to hide the loading spinner and text
function hideLoading() {
  spinner.style.display = "none";
  loadingText.style.display = "none";
}

// Function to format text
function formatText(text) {
  const formattedText = text
    .replace(/\n/g, "<br>") // Convert newlines to <br>
    .replace(/(?:\r\n|\r|\n){2,}/g, "</p><p>") // Convert multiple newlines to paragraphs
    .replace(/\s+/g, " ") // Ensure there are no extra spaces between words
    .trim(); // Remove leading and trailing whitespace
  return `<p>${formattedText}</p>`;
}

// Add message listener
chrome.runtime.onMessage.addListener((message) => {
  console.log("Received message:", message);

  if (message.action === "stream_chunk") {
    // Show loading when the first chunk is received
    showLoading();

    summaryContent += message.chunk;
    summaryDiv.innerHTML = formatText(summaryContent);
  } else if (message.action === "stream_complete") {
    console.log("Stream complete, final summary:", message.summary);
    summaryContent = message.summary;
    summaryDiv.innerHTML = `<p><strong>Summary Complete:</strong> ${formatText(
      summaryContent
    )}</p>`;
    hideLoading(); // Hide loading once streaming is complete
  } else if (message.action === "stream_error") {
    summaryDiv.innerHTML =
      "<p><strong>Error summarizing comments.</strong></p>";
    hideLoading(); // Hide loading if an error occurs
  } else if (message.action === "start_summary") {
    console.log("received start summary");
    summaryContent = ""; // Reset the summary content
    summaryDiv.innerHTML = ""; // Clear the summary div
    showLoading();
  }
});

// Ensure the listener is set up before sending messages from the background
console.log("Side panel script loaded and listener set up.");

chrome.runtime.sendMessage({ action: "sidepanel_ready" });
