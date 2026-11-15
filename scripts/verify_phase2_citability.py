import re
import yaml

files = [
    'src/content/articles/vmmemwsl-high-memory-cpu-usage-windows-11-fix.mdx',
    'src/content/articles/tmog-dave-plummer-cross-platform-task-manager-guide.mdx',
    'src/content/articles/windows-11-bluetooth-disappeared-not-working-fixes.mdx',
    'src/content/articles/how-to-fix-system-thread-exception-not-handled-0x7e.mdx',
    'src/content/articles/how-to-fix-windows-11-kb5121003-inpoutx64-crash.mdx',
    'src/content/articles/does-resetting-windows-remove-viruses-completely.mdx',
    'src/content/articles/degoogle-android-phone-grapheneos-aurora-store-complete-guide.mdx'
]

print("=== VERIFYING PHASE 2 CITABILITY CAPSULES ===")
all_passed = True
for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse YAML frontmatter
    fm_match = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not fm_match:
        print(f"ERROR: No frontmatter in {fpath}")
        all_passed = False
        continue
    
    fm = yaml.safe_load(fm_match.group(1))
    title = fm.get('title', 'MISSING')
    seo_title = fm.get('seoTitle', 'MISSING')
    updated_date = str(fm.get('updatedDate', 'MISSING'))
    qa = fm.get('quickAnswer', {})
    summary = qa.get('summary', '') if isinstance(qa, dict) else ''
    
    words = summary.split()
    word_count = len(words)
    valid_words = 134 <= word_count <= 167
    valid_date = updated_date == "2026-11-15"
    
    if not (valid_words and valid_date):
        all_passed = False
    
    print(f"\nFile: {fpath}")
    print(f"  Title: {title}")
    print(f"  seoTitle: {seo_title}")
    print(f"  updatedDate: {updated_date} (Valid 2026-11-15: {valid_date})")
    print(f"  Summary Word Count: {word_count} words (Valid [134-167]: {valid_words})")

print(f"\nAll Phase 2 articles passed: {all_passed}")
