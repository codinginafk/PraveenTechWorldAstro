import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def add_hyperlink(paragraph, url, text, color="0066CC", underline=True):
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)
    new_run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    if color:
        c = OxmlElement('w:color')
        c.set(qn('w:val'), color)
        rPr.append(c)
    if underline:
        u = OxmlElement('w:u')
        u.set(qn('w:val'), 'single')
        rPr.append(u)
    new_run.append(rPr)
    new_run.text = text
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)

def create_document():
    doc = docx.Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Document Header Title
    title = doc.add_heading("What Students Should Know About Their Digital Footprint Before Job Hunting", level=1)
    title.style.font.color.rgb = RGBColor(15, 23, 42)

    # Publication Metadata
    meta_p = doc.add_paragraph()
    meta_p.paragraph_format.space_after = Pt(12)
    meta_p.paragraph_format.line_spacing = 1.15

    def add_meta_field(label, val):
        r = meta_p.add_run(label)
        r.bold = True
        meta_p.add_run(val + "\n")

    add_meta_field("Target Publication: ", "SIIT (Scholars International Institute of Technology - siit.co)")
    add_meta_field("Recommended Category: ", "Career / IT & Technology / Student Guides")
    add_meta_field("Target Audience: ", "IT students, computing diploma learners, and certification graduates entering the tech workforce")
    add_meta_field("Suggested Meta Title: ", "What Students Should Know About Their Digital Footprint | SIIT")
    add_meta_field("Suggested Meta Description: ", "Recruiters search candidates before interviews. A practical student guide to auditing search results, tightening app permissions, and reducing digital data exposure.")
    
    r_bio = meta_p.add_run("Author Bio: ")
    r_bio.bold = True
    meta_p.add_run("Praveen Kumar is an IT Operations Lead and founder of ")
    add_hyperlink(meta_p, "https://www.praveentechworld.com", "PraveenTechWorld")
    meta_p.add_run(", where he documents field-tested Windows troubleshooting, Docker, and privacy architecture guides.")

    doc.add_paragraph("—" * 45)

    # Body Content
    doc.add_paragraph(
        "Recruiters look candidates up before interviews. That is not an urban myth from career services — "
        "hiring surveys have documented it for over a decade, and anyone who has sat on an engineering interview "
        "panel has watched it happen in real time. What surfaces when an employer searches your name is now an "
        "unfiltered extension of your CV, whether you curated it or not."
    )

    doc.add_paragraph(
        "The good news: auditing that footprint does not require deleting all your accounts or becoming a digital ghost. "
        "It takes a single focused afternoon, and the vast majority of effective fixes are permission and visibility "
        "settings rather than drastic deletions. Here is the practical step-by-step checklist."
    )

    # Step 1
    doc.add_heading("Step 1: Search Yourself the Way a Technical Recruiter Would", level=2)
    doc.add_paragraph(
        "Open an incognito or private browsing window (to bypass your personal search history bubbles) and query three variations: "
        "your full name, your name plus your college or institute, and your name plus your target job title or city."
    )
    doc.add_paragraph(
        "Audit the first three pages of results closely. Old forum discussions, forgotten GitHub repositories with hardcoded tokens, "
        "public photo albums, and old comments surface here. For accounts you control, tighten visibility to private or delete them. "
        "For third-party sites hosting outdated or sensitive personal details (such as leaked contact information), submit a removal "
        "request using Google's official Personal Information Removal tool."
    )

    # Step 2
    doc.add_heading("Step 2: Audit App Permissions and Background Telemetry on Your Phone", level=2)
    doc.add_paragraph(
        "This is where tech students and junior developers leak the most behavioral data without realizing it. "
        "Mobile apps bundle third-party analytics and advertising SDKs that harvest background location, WiFi identifiers, and contact lists."
    )
    doc.add_paragraph(
        "Open your device settings and navigate to the Permission Manager. Filter by the most sensitive access vectors: "
        "Location, Microphone, Camera, and Photos. Any utility app (such as a calculator or wallpaper app) requesting location access "
        "should have its permission revoked immediately. On Android, change permissions from 'Always Allow' to 'Only while using app' "
        "or 'Ask every time.'"
    )

    # Step 3
    doc.add_heading("Step 3: Establish Strict Digital Compartments", level=2)
    doc.add_paragraph(
        "You do not need to abandon personal social platforms to land a technical job. You simply need compartments: "
        "one professional identity (LinkedIn, GitHub, technical blog, professional portfolio) that is thoroughly public, polished, "
        "and linked on your resume, and one private personal life with locked-down visibility."
    )
    doc.add_paragraph(
        "Never use the same avatar photo across professional and personal platforms, as reverse-image searches easily connect them. "
        "Most importantly, keep the primary email address on your job applications strictly isolated from the accounts you use for "
        "gaming, retail logins, and public discussion boards."
    )

    # Step 4
    doc.add_heading("Step 4: Reduce Your Telemetry Broadcast Going Forward", level=2)
    doc.add_paragraph(
        "Every single online service where you tap 'Sign in with Google' or 'Sign in with Facebook' shares user authentication tokens "
        "and tracking identifiers across data brokers. Before signing up for another testing tool or student discount, ask whether "
        "it truly requires an account."
    )
    doc.add_paragraph(
        "When registration is mandatory, practice data minimization: do not volunteer real birthdates when a placeholder year suffices, "
        "and use unique aliases or privacy-focused forwarding relays. Free consumer platforms treat telemetry and user profiling as their "
        "core commercial inventory."
    )

    # In-text Link Paragraph
    p_link = doc.add_paragraph(
        "Students who want to conduct a full, forensic audit of their devices — including inspecting exactly what cloud services log "
        "and how to replace high-telemetry defaults with privacy-respecting open-source alternatives — can follow our step-by-step lab benchmark: "
    )
    add_hyperlink(p_link, "https://www.praveentechworld.com/blog/degoogle-starter-pack-complete-guide", "DeGoogle Starter Pack: 2026 Migration and Telemetry Audit")
    p_link.add_run(", which includes real network packet captures and device testing procedures.")

    # Conclusion
    doc.add_heading("The Career Habit That Pays Off", level=2)
    doc.add_paragraph(
        "Make this footprint audit an annual ritual, scheduled on the exact same weekend you update your CV and portfolio. "
        "Digital footprints accumulate quietly in the background; a yearly review keeps your online profile deliberate, clean, and professional. "
        "Your future self — sitting across from a hiring manager who has already reviewed your online footprint — will be very glad you took the time."
    )

    doc.add_paragraph("—" * 45)

    # Editorial Notice Box for SIIT
    p_note = doc.add_paragraph()
    r_n = p_note.add_run("Editorial & Publishing Note for SIIT Editors:\n")
    r_n.bold = True
    r_n.font.color.rgb = RGBColor(180, 83, 9)
    p_note.add_run(
        "This article includes exactly one relevant, non-commercial educational resource link to the "
        "DeGoogle Starter Pack technical guide on PraveenTechWorld. Please ensure the link is published "
        "as a standard in-content dofollow reference as agreed in our content partnership. "
        "No changes to the anchor text or additional commercial links should be inserted."
    )

    out_dir = os.path.join("research", "outreach")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "What-Students-Should-Know-About-Their-Digital-Footprint.docx")
    doc.save(out_path)
    print("Successfully generated Word Document at:", out_path)

if __name__ == "__main__":
    create_document()
