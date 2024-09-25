// Function to add the summarize button
function addSummarizeButtons() {
  // get the subline from hacker news submission
  const sublines = document.querySelectorAll(".subline");
  // add a summarize all link to the subline
  sublines.forEach((subline) => {
    if (!subline.querySelector(".summarize-all-btn")) {
      const summarizeAllLink = document.createElement("a");
      summarizeAllLink.classList.add("summarize-all-btn");
      summarizeAllLink.href = "#";
      summarizeAllLink.innerText = "summarize all";
      // add a text node with a pipe character
      const pipe = document.createTextNode(" | ");
      subline.appendChild(pipe);
      subline.appendChild(summarizeAllLink);

      // Add click event listener to the summarize all button
      summarizeAllLink.addEventListener("click", async (event) => {
        event.preventDefault();
        await summarizeAllComments();
      });
    }
  });

  // get all hacker news comment elements
  const comments = document.querySelectorAll(".comtr");
  comments.forEach((comment) => {
    // get hacker news comment header
    const header = comment.querySelector(".comhead");
    if (!header.querySelector(".summarize-btn")) {
      // get the navs element with class navs
      const navs = header.querySelector(".navs");

      if (!navs) {
        return;
      }

      // create a link for summarizing and add it to the existing links
      const summarizeLink = document.createElement("a");
      summarizeLink.classList.add("summarize-btn");
      summarizeLink.href = "#";
      summarizeLink.innerText = "summarize";
      navs.appendChild(summarizeLink);

      // Add click event listener to the summarize button
      summarizeLink.addEventListener("click", async (event) => {
        event.preventDefault();
        await summarizeComment(comment);
      });
    }
  });
}

async function summarizeComment(commentElement) {
  let nextElement = commentElement.nextElementSibling;
  const currentIndentLevel = parseInt(
    commentElement.querySelector(".ind").getAttribute("indent"),
    10
  );

  const commentsArray = [];
  let currentChunk = [];
  let currentChunkLength = 0;
  const maxChunkSize = 50000;

  // Extract the original parent comment
  const parentCommentTextElement = commentElement.querySelector(".commtext");
  const parentCommentText = parentCommentTextElement
    ? parentCommentTextElement.innerText
    : "";
  const parentAuthorElement = commentElement.querySelector(".hnuser");
  const parentAuthor = parentAuthorElement
    ? parentAuthorElement.innerText
    : "Unknown";
  const parentId = commentElement.id;

  const parentComment = {
    id: parentId,
    author: parentAuthor,
    text: parentCommentText,
    parent: null, // Parent has no parent
  };

  // Function to add a comment to the current chunk or create a new one if necessary
  function addCommentToChunk(comment) {
    const commentLength = comment.text.length;

    // Check if adding the current comment would exceed the chunk size limit
    if (currentChunkLength + commentLength > maxChunkSize) {
      // Push the current chunk (with the parent comment) to commentsArray
      commentsArray.push([parentComment, ...currentChunk]);
      // Start a new chunk
      currentChunk = [];
      currentChunkLength = 0;
    }

    // Add the comment to the current chunk
    currentChunk.push(comment);
    currentChunkLength += commentLength;
  }

  // Iterate over the sibling comments until the indent level changes or comments run out
  while (nextElement) {
    const commentTextElement = nextElement.querySelector(".commtext");
    const commentText = commentTextElement ? commentTextElement.innerText : "";

    const authorElement = nextElement.querySelector(".hnuser");
    const author = authorElement ? authorElement.innerText : "Unknown";

    const commentId = nextElement.id;

    // Check for the parent (reply) by looking for 'par' class
    const parentElement = nextElement.querySelector(".par a");
    const parentId = parentElement
      ? parentElement.getAttribute("href").replace("#", "")
      : null;

    if (commentText) {
      const comment = {
        id: commentId,
        author: author,
        text: commentText,
        parent: parentId, // The parent comment ID, or null if it's a top-level comment
      };

      // Add the comment to the chunk
      addCommentToChunk(comment);
    }

    // Check the indent level of the next comment
    const indentElement = nextElement.querySelector(".ind");
    if (indentElement) {
      const nextIndentLevel = parseInt(
        indentElement.getAttribute("indent"),
        10
      );
      if (nextIndentLevel <= currentIndentLevel) {
        break;
      }
    }

    nextElement = nextElement.nextElementSibling;
  }

  // If there are any remaining comments in the current chunk, add them to the array
  if (currentChunk.length > 0) {
    commentsArray.push([parentComment, ...currentChunk]);
  }

  // Send the array of chunks to the background script in one message
  try {
    await chrome.runtime.sendMessage({
      action: "summarize_comments",
      commentsChunks: commentsArray,
    });
  } catch (error) {
    console.error("Error sending comments for summarization:", error);
  }
}

// Function to summarize all comments (stub for now)
async function summarizeAllComments() {
  const topLevelComments = document.querySelectorAll(".comtr");

  const commentsArray = [];
  let currentChunk = [];
  let currentChunkLength = 0;
  const maxChunkSize = 50000;

  // Function to add a comment to the current chunk or create a new one if necessary
  function addCommentToChunk(comment) {
    const commentLength = comment.text.length;

    // Check if adding the current comment would exceed the chunk size limit
    if (currentChunkLength + commentLength > maxChunkSize) {
      // Push the current chunk to commentsArray
      commentsArray.push([...currentChunk]);
      // Start a new chunk
      currentChunk = [];
      currentChunkLength = 0;
    }

    // Add the comment to the current chunk
    currentChunk.push(comment);
    currentChunkLength += commentLength;
  }

  // Process each top-level comment and its replies
  topLevelComments.forEach((commentElement) => {
    const indentLevel = parseInt(
      commentElement.querySelector(".ind").getAttribute("indent"),
      10
    );

    // Skip comments that aren't top-level (indent level 0)
    if (indentLevel !== 0) return;

    let nextElement = commentElement.nextElementSibling;
    const currentIndentLevel = parseInt(
      commentElement.querySelector(".ind").getAttribute("indent"),
      10
    );

    const parentCommentTextElement = commentElement.querySelector(".commtext");
    const parentCommentText = parentCommentTextElement
      ? parentCommentTextElement.innerText
      : "";
    const parentAuthorElement = commentElement.querySelector(".hnuser");
    const parentAuthor = parentAuthorElement
      ? parentAuthorElement.innerText
      : "Unknown";
    const parentId = commentElement.id;

    const parentComment = {
      id: parentId,
      author: parentAuthor,
      text: parentCommentText,
      parent: null, // Parent has no parent
    };

    addCommentToChunk(parentComment);

    // Process replies (immediate children, indent level 1)
    while (nextElement) {
      const commentTextElement = nextElement.querySelector(".commtext");
      const commentText = commentTextElement
        ? commentTextElement.innerText
        : "";

      const authorElement = nextElement.querySelector(".hnuser");
      const author = authorElement ? authorElement.innerText : "Unknown";

      const commentId = nextElement.id;

      const indentElement = nextElement.querySelector(".ind");
      if (indentElement) {
        const nextIndentLevel = parseInt(
          indentElement.getAttribute("indent"),
          10
        );
        if (nextIndentLevel <= currentIndentLevel) {
          break; // Stop if the next comment is not a direct reply
        } else if (nextIndentLevel === currentIndentLevel + 1) {
          // Process immediate replies (indent level 1)
          const replyComment = {
            id: commentId,
            author: author,
            text: commentText,
            parent: parentId,
          };
          addCommentToChunk(replyComment);
        }
      }

      nextElement = nextElement.nextElementSibling;
    }
  });

  // If there are any remaining comments in the current chunk, add them to the array
  if (currentChunk.length > 0) {
    commentsArray.push([...currentChunk]);
  }

  // Send the array of chunks to the background script
  try {
    await chrome.runtime.sendMessage({
      action: "summarize_comments",
      commentsChunks: commentsArray,
    });
  } catch (error) {
    console.error("Error sending comments for summarization:", error);
  }
}

// Function to send the request to OpenAI
async function sendSummarizationRequest(commentsText, accumulatedSummary) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "summarize_comments",
        commentsText,
        accumulatedSummary,
      },
      (response) => {
        if (response && response.summary) {
          resolve(response.summary); // Return the new summary
        } else {
          reject("Summarization failed");
        }
      }
    );
  });
}

// Run the function when the page loads
window.addEventListener("load", () => {
  addSummarizeButtons();

  // listen for alert messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "alert") {
      alert(message.message);
    }
  });
});
