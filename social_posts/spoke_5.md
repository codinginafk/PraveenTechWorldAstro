**LinkedIn Post**

Student data isn’t leaking through hackers—it’s slipping out in plain‑text API logs.  
Most teams assume encryption solves privacy, but raw PII still hits external LLMs.  
The real fix is scrubbing before the request ever leaves campus.  

**3‑Step Framework**  
1️⃣ Deploy a local regex‑based anonymizer that strips student names and IDs from every payload before it reaches the LLM wrapper.  
2️⃣ Enforce zero‑data‑retention contracts with any AI provider and log egress to verify no PII persists.  
3️⃣ Build automated regression tests that inject edge‑case names (international, hyphenated, nicknames) to catch leakage early.  

Link to the full interactive guide is in the first comment below.  
What regex pattern have you found most reliable for catching hyphenated or apostrophe‑containing student names without over‑scrubbing course titles? 🔒  

---  

**X Thread**  

Tweet 1:  
After auditing our LLM wrapper, we found raw student names and IDs in every API call—100% PII exposure. Adding a local regex scrubber dropped exposure to 0%.  

Tweet 2:  
Tools: custom regex‑based anonymizer (scrubber.config.json), local‑first processing layer, zero‑data‑retention API contracts, automated regression test suite.  

Tweet 3:  
Roadblock: regex missed hyphenated/apostrophe names and nicknames, risking leakage. Fix: expanded patterns with Unicode word boundaries and added edge‑case test vectors.  