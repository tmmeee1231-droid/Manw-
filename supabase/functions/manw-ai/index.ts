// Supabase Edge Function: manw-ai
// Add GEMINI_API_KEY as a Supabase Edge Function secret before invoking.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured on the server" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    if (!message || message.length > 12000) {
      return new Response(JSON.stringify({ error: "اكتب سؤالك أولاً (بحد أقصى 12000 حرف)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contents = [
      ...history
        .filter((item: any) => item && ["user", "model"].includes(item.role) && typeof item.text === "string")
        .map((item: any) => ({ role: item.role, parts: [{ text: item.text.slice(0, 6000) }] })),
      { role: "user", parts: [{ text: message }] },
    ];

    const systemInstruction = {
      parts: [{
        text: "أنت مساعد تعليمي داخل منصة MANW لطلاب الصف الثالث الإعدادي والثالث الثانوي في مصر. أجب بالعربية المصرية الواضحة، واشرح خطوة بخطوة وبأسلوب مناسب للطالب. في المسائل وضح القانون والتعويض والحل، ولا تخترع معلومات أو إجابات. إذا لم تعرف فقل ذلك. اجعل الإجابة منظمة ومباشرة."
      }]
    };

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction,
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 1800 },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini request failed:", response.status, data?.error?.status || "API_ERROR");
      return new Response(JSON.stringify({ error: "تعذر الحصول على رد الآن. حاول مرة أخرى." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return new Response(JSON.stringify({ error: "لم يصل رد من المساعد. جرّب صياغة السؤال مرة أخرى." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MANW AI error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "حصل خطأ أثناء معالجة السؤال." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
