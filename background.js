/* global browser */
browser.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type !== "AI_ANALYZE") return undefined;
  const cfg = await browser.storage.local.get(["provider","apiKey","model"]);
  if (!cfg.apiKey) return {ok:false,error:"Add your Gemini API key in Settings first."};
  const model = cfg.model || "gemini-2.0-flash";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(cfg.apiKey);
  const prompt = [
    "Review an Instagram account using only supplied visible profile text and metadata.",
    "Do not infer gender, sex, age, ethnicity, religion, sexual orientation, health, or other sensitive traits from faces, photos, names or indirect clues. Do not identify people in images.",
    "You may report pronouns only if explicitly self-described in text, as unverified self-description.",
    "Classify public content themes and account type. Do not recommend actions based on identity. Return JSON only with keys accountType, contentCategories (array), bioSummary, selfDescribedPronouns (string or null), reviewSignals (array), confidence (0-1), limitations (array).",
    "Visible profile data: "+JSON.stringify(msg.profile || {})
  ].join("\n");
  try {
    const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2,responseMimeType:"application/json"}})});
    const data=await res.json();
    if(!res.ok) return {ok:false,error:data?.error?.message || "Gemini request failed."};
    const raw=data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!raw) return {ok:false,error:"Empty AI response."};
    try{return {ok:true,result:JSON.parse(raw)}}catch(_){return {ok:false,error:"AI returned invalid JSON."}}
  } catch(e){return {ok:false,error:e.message || "Network error."}}
});
