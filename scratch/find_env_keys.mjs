console.log("Searching process.env for Gemini/Google API keys...");
for (const [key, value] of Object.entries(process.env)) {
  if (value.startsWith("AIzaSy")) {
    console.log(`Found candidate API key in env variable: ${key}`);
  }
}
