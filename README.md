# FastDigest

## Description

FastDigest is a Chrome extension designed to summarize Hacker News comments using OpenAI's GPT-4 model. The extension provides a "Summarize" button for individual comments and a "Summarize All" button to summarize all comments on a page. The summaries are generated in real-time and displayed in the Chrome side panel.

## Features

- Adds a "Summarize" button to each comment on Hacker News.
  ![summarize button](summarize.png)
- Adds a "Summarize All" button to summarize all comments on a page.
  ![summarize all button](summarize_all.png)
- Supports both OpenAI and Ollama.
- Displays summaries in the Chrome side panel.

## Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/yourusername/fastdigest.git
   cd fastdigest
   ```

2. **Configure LLM Provider**

   - Go to background.js. At the top, you will see a variable to set your OpenAI API Key.
   - FastDigest also supports Ollama(llama3.1) for using local LLMs. To use Ollama, you will need to do the following:
     - shut down Ollama if it is currently running
     - run `launchctl setenv OLLAMA_ORIGINS "*"`
     - restart Ollama

3. **Load the extension in Chrome**:
   - Open Chrome and navigate to chrome://extensions/.
   - Enable "Developer mode" by toggling the switch in the top right corner.
   - Click on "Load unpacked" and select the directory where you cloned the repository.

## Usage

Visit any Hacker News item page (e.g., https://news.ycombinator.com/item?id=123456).
The extension will add "Summarize" and "Summarize All" buttons to the comments.
Click the "Summarize" button:

Click the "Summarize" button next to a comment to generate a summary for that comment.
Click the "Summarize All" button:

Click the "Summarize All" button to generate summaries for all comments on the page.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
