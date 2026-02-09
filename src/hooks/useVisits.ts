import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useVisits() {
    const [count, setCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function trackVisit() {
            // Check if already counted in this session
            const lastVisit = sessionStorage.getItem("site-visited");

            try {
                if (!lastVisit) {
                    // Increment and get new count
                    const { data, error } = await supabase.rpc("increment_site_visits");
                    if (error) throw error;
                    setCount(Number(data));
                    sessionStorage.setItem("site-visited", "true");
                } else {
                    // Just fetch the current count
                    const { data, error } = await supabase
                        .from("site_stats")
                        .select("value")
                        .eq("name", "visits")
                        .single();

                    if (error) throw error;
                    setCount(Number(data.value));
                }
            } catch (err) {
                console.error("Error tracking visits:", err);
            } finally {
                setLoading(false);
            }
        }

        trackVisit();
    }, []);

    return { count, loading };
}
