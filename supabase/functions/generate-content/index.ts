// Generate dyslexia-friendly study content for an arbitrary topic
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, scheduleId } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys =
      "You write short reading passages for dyslexic learners. " +
      "Use plain everyday words. Short sentences (max 15 words). " +
      "Warm, clear, concrete. No jargon, no lists, no markdown.";
    const user =
      `Write 4 short paragraphs (about 50-65 words each) explaining "${topic}" to a curious learner. ` +
      `Return via the write_passage tool.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        tools: [{
          type: "function",
          function: {
            name: "write_passage",
            description: "Return the study passage.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                paragraphs: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
              },
              required: ["title", "paragraphs"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "write_passage" } },
      }),
    });

    if (aiRes.status === 429)
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (aiRes.status === 402)
      return new Response(JSON.stringify({ error: "no_credits" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("ai gateway", aiRes.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let content: { title: string; paragraphs: string[] } | null = null;
    try {
      content = JSON.parse(call?.function?.arguments ?? "null");
    } catch (e) {
      console.error("parse tool args", e);
    }
    if (!content?.paragraphs?.length) {
      return new Response(JSON.stringify({ error: "bad_ai_output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist to schedules.content if scheduleId + auth provided
    if (scheduleId) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { error: upErr } = await sb
          .from("schedules")
          .update({ content })
          .eq("id", scheduleId);
        if (upErr) console.error("persist content", upErr);
      }
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
