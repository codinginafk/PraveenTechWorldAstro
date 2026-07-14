import 'dotenv/config';

async function checkStats() {
    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
        console.error("DEVTO_API_KEY not found");
        return;
    }

    try {
        const res = await fetch("https://dev.to/api/articles/me", {
            headers: { "api-key": apiKey }
        });
        const articles = await res.json();
        
        console.log("=== DEV.TO STATS ===");
        for (const article of articles) {
            console.log(`Title: ${article.title}`);
            console.log(`Views: ${article.page_views_count}`);
            console.log(`Reactions: ${article.public_reactions_count}`);
            console.log(`Comments: ${article.comments_count}`);
            console.log(`URL: ${article.url}`);
            console.log("-------------------");
        }
    } catch (e) {
        console.error("Failed to fetch stats", e);
    }
}

checkStats();
