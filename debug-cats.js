const url = "https://cjvughrptxecgvvrcjlf.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqdnVnaHJwdHhlY2d2dnJjamxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5Mjk5NzUsImV4cCI6MjA4MjUwNTk3NX0.17BvVPPPPWW0mAKZrEApyevbtFKOPkVizRKEuyiRuSw";

async function check() {
    const headers = {
        "apikey": key,
        "Authorization": `Bearer ${key}`
    };

    console.log("--- CATEGORIAS ---");
    const cats = await fetch(`${url}/rest/v1/categories?select=id,name,slug`, { headers }).then(r => r.json());
    console.log(JSON.stringify(cats, null, 2));

    console.log("\n--- DOWNLOADS (Skins) ---");
    // Buscando downloads que tenham category_id das categorias de skin encontradas
    const skinCatIds = cats.filter(c => c.slug.includes('skin')).map(c => c.id);

    const downloads = await fetch(`${url}/rest/v1/downloads?select=id,title,category_id`, { headers }).then(r => r.json());

    // Filtrando manualmente para ver o que tem
    const skinsDownloads = downloads.filter(d => skinCatIds.includes(d.category_id));
    console.log("Downloads nas categorias de skin:", JSON.stringify(skinsDownloads, null, 2));

    if (skinsDownloads.length === 0) {
        console.log("\nAVISO: Nenhum download encontrado vinculado aos IDs de categorias de skin.");
        console.log("Listando alguns downloads para ver seus category_ids:");
        console.log(JSON.stringify(downloads.slice(0, 5), null, 2));
    }
}

check();
