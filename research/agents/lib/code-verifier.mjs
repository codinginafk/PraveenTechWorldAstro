import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import os from "os";

// Helper to extract code blocks
export function extractCodeBlocks(fileContent) {
  const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  while ((match = codeBlockRegex.exec(fileContent)) !== null) {
    blocks.push({
      language: match[1].toLowerCase(),
      code: match[2]
    });
  }
  return blocks;
}

// Function to verify code syntax
export function verifyCodeBlocks(filePath) {
  if (!fs.existsSync(filePath)) {
    return { passed: false, errors: [{ error: `File does not exist: ${filePath}` }] };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const blocks = extractCodeBlocks(content);
  const errors = [];

  const tempDir = os.tmpdir();

  for (let i = 0; i < blocks.length; i++) {
    const { language, code } = blocks[i];

    if (language === "python" || language === "py") {
      const tempFile = path.join(tempDir, `verify_py_${Date.now()}_${i}.py`);
      try {
        fs.writeFileSync(tempFile, code, "utf-8");
        // Run compilation check: python -m py_compile tempFile
        execSync(`python -m py_compile "${tempFile}"`, { stdio: "pipe" });
      } catch (err) {
        let errMsg = err.stderr ? err.stderr.toString() : err.message;
        // Clean up the temp path from error message
        errMsg = errMsg.replace(new RegExp(tempFile.replace(/\\/g, "\\\\"), "g"), "snippet.py");
        errors.push({
          language,
          index: i + 1,
          codeSnippet: code.slice(0, 200) + (code.length > 200 ? "..." : ""),
          error: errMsg
        });
      } finally {
        try { fs.unlinkSync(tempFile); } catch {}
      }
    } else if (language === "javascript" || language === "js" || language === "mjs" || language === "cjs") {
      const tempFile = path.join(tempDir, `verify_js_${Date.now()}_${i}.js`);
      try {
        fs.writeFileSync(tempFile, code, "utf-8");
        // Run syntax check: node --check tempFile
        execSync(`node --check "${tempFile}"`, { stdio: "pipe" });
      } catch (err) {
        let errMsg = err.stderr ? err.stderr.toString() : err.message;
        errMsg = errMsg.replace(new RegExp(tempFile.replace(/\\/g, "\\\\"), "g"), "snippet.js");
        errors.push({
          language,
          index: i + 1,
          codeSnippet: code.slice(0, 200) + (code.length > 200 ? "..." : ""),
          error: errMsg
        });
      } finally {
        try { fs.unlinkSync(tempFile); } catch {}
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors
  };
}

// Support direct script execution for manual testing
if (process.argv[1] && (process.argv[1].endsWith("code-verifier.mjs") || process.argv[1].endsWith("code-verifier"))) {
  const target = process.argv[2];
  if (!target) {
    console.log("Usage: node code-verifier.mjs <file_path>");
    process.exit(1);
  }
  console.log(`Verifying code blocks in: ${target}`);
  const result = verifyCodeBlocks(target);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}
