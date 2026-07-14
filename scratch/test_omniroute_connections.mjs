async function run() {
  console.log("Fetching active OmniRoute connections...");
  try {
    const res = await fetch("http://localhost:20128/v1/connections");
    if (!res.ok) {
      console.error(`Failed: ${res.status} - ${await res.text()}`);
      return;
    }
    const data = await res.json();
    console.log("=== Active Connections ===");
    for (const conn of data) {
      console.log(`- Connection ID: ${conn.id}`);
      console.log(`  Provider: ${conn.provider}`);
      console.log(`  Model mapping:`, conn.modelMapping);
      console.log(`  Status: ${conn.status}`);
      console.log(`  Models:`, conn.models);
    }
  } catch (err) {
    console.error("Error connecting to OmniRoute:", err.message);
  }
}

run();
