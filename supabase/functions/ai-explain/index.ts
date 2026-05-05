// AI-powered warm explanation of why the schedule was adapted
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { difficulty, topic, fallback } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys =
      "You are ReadRight, a warm calm study coach for dyslexic learners. " +
      "Reply in ONE short sentence (max 18 words), no emoji, no jargon. " +
      "Explain how the plan was adapted based on how the last block felt.";
    const user = `Topic: ${topic ?? "the topic"}. Learner felt the last block was: ${difficulty}. Plan change summary: ${fallback ?? ""}.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });

    if (r.status === 429)
      return new Response(JSON.stringify({ explanation: fallback, error: "rate_limited" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (r.status === 402)
      return new Response(JSON.stringify({ explanation: fallback, error: "no_credits" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (!r.ok) {
      const t = await r.text();
      console.error("ai gateway", r.status, t);
      return new Response(JSON.stringify({ explanation: fallback }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    const explanation = data?.choices?.[0]?.message?.content?.trim() || fallback;
    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-explain", e);
    return new Response(JSON.stringify({ explanation: null, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
