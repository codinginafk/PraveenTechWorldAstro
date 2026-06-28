# I Built a Log Monitoring Script with DeepSeek — Here is What Went Wrong

*Originally published on [PraveenTechWorld](https://www.praveentechworld.com/blog/i-built-a-log-monitoring-script-with-deepseek-here-is-what-went-wrong)*

The short answer is: I built a log monitoring Python script using DeepSeek, but the generated code hallucinated and needed a lot of manual fixing. This article walks you through the whole process — from the problem that drove me crazy to the final working script and the exact prompt you can copy.

## What Problem Drove Me to Build a Log Monitoring Script?

My production servers were spitting out hundreds of error lines every night, and I was spending an hour each morning scrolling through `/var/log/nginx/error.log` just to see if anything new had popped up. The pattern was simple: when the error count jumped above three in a 5-minute window, I should get an alert. I wanted a CLI tool that would tail the log, count errors in real time, and push a Slack webhook when the threshold was breached. Lightweight — no heavy frameworks, just a pure Python script I could drop into any Ubuntu box.

I spent a week manually writing a small script, but I knew I could accelerate the process by letting an AI do the heavy lifting. I turned to DeepSeek to generate the whole workflow in one go.

## The Prompt I Used

```
Build a Python CLI tool that monitors a given log file (e.g., /var/log/nginx/error.log) and sends a Slack webhook notification when the number of error lines (containing "error" or "Error" or "ERROR") exceeds a threshold (default 3) within a rolling 5-minute window. The tool should:

1. Accept optional command-line arguments: --log, --threshold, --window, --webhook, --help
2. Tail the log file continuously, parse each new line, and keep a deque of timestamps for error lines
3. Every second, evaluate the deque and POST a JSON payload to the webhook URL if threshold exceeded
4. Use only standard library or commonly available packages
5. Output status messages in color, log exceptions to monitor.log
6. Include a --daemon flag that forks the process
7. Provide a --version flag

Please output the complete script with comments and a brief usage example.
```

## Where the AI Output Broke Down

Three critical issues surfaced immediately:

**Missing dependencies.** The script referenced `colorama` and `requests` without checking if they were installed. Running on a clean VM threw ImportError immediately.

**Broken sliding-window logic.** The deque was reset on each iteration instead of preserving error timestamps across lines. The script would alert, then immediately say "No errors in the last 300 seconds."

**Non-serializable datetime.** The AI used a datetime object in the JSON payload, causing: `TypeError: Object of type datetime is not JSON serializable`.

## What I Had to Fix

1. **Dependency handling** — Added try/except ImportError blocks with clear install messages
2. **Sliding-window logic** — Replaced the resetting deque with a proper `collections.deque(maxlen=window_seconds//interval)` and a background evaluation thread
3. **JSON serialization** — Converted datetime objects to ISO strings before posting
4. **Colored output fallback** — Wrapped colorama init so the script works without it
5. **Rotating log file** — Added RotatingFileHandler for production logging

The final script landed at 3.2KB, executes in 0.32 seconds for the initial tail read, and uses under 2% CPU on a 2-core droplet.

## Key Lessons

- **Be specific about error handling** in your prompt. The AI will write elegant happy-path code and ignore edge cases.
- **Test AI output in a clean environment.** Code that works on your dev machine may fail in production.
- **Break complex algorithms into testable functions.** The sliding-window logic was too subtle for the AI to get right on the first pass.
- **AI is a great junior developer.** It drafts the architecture, but you still need to review, test, and own the final product.

The full script and exact prompt are available in the original article. If you are a sysadmin looking to automate your monitoring without adding heavy frameworks, this approach works — just budget time for debugging.

---

*Tags: DeepSeek, log monitoring, Python automation, sysadmin, devops*

*Originally published at [https://www.praveentechworld.com/blog/i-built-a-log-monitoring-script-with-deepseek-here-is-what-went-wrong](https://www.praveentechworld.com/blog/i-built-a-log-monitoring-script-with-deepseek-here-is-what-went-wrong)*

---

### How to post this to Medium

1. Go to https://medium.com/new-story
2. Copy the content below (everything after this line)
3. Paste into Medium's editor
4. Add a cover image (use the one from our article or a terminal/screenshot image)
5. Add the canonical link to our original URL in Medium's settings
6. Add tags: DeepSeek, Python, DevOps, SysAdmin, Automation
7. Publish
