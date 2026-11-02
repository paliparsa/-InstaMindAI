/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;

browser.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type !== "AI_ANALYZE") return undefined;
  const cfg = await browser.storage.local.get(["provider","apiKey","model"]);
  if (!cfg.apiKey) return {ok:false,error:"Add your Gemini API key in Settings first."};
  const model = cfg.model || "gemini-2.0-flash";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(cfg.apiKey);
  const prompt = [
    "Review this Instagram profile using only the supplied visible text and metadata.",
    "Never infer gender, sex, age, ethnicity, religion, sexual orientation, health, or any sensitive trait from a face, photo, name, username, or indirect clue. Never identify a person in an image.",
    "Only report pronouns when explicitly self-described in the profile text. Return them as a quoted self-description, not an identity inference.",
    "Classify public content themes and account type. Identify potentially adult or sexualized promotional content ONLY when it is explicitly indicated by supplied bio/caption/text. Do not infer it from appearance, clothing, poses, or image descriptions. Do not flag ordinary fashion, fitness, swimwear, or beauty content.",
    "Return valid JSON only with keys: accountType (string), contentCategories (array of strings), bioSummary (string), selfDescribedPronouns (string or null), contentFlags (array of strings; only evidence-based text flags), reviewSignals (array of short evidence-based strings), confidence (number 0-1), limitations (array of strings).",
    "If there is no explicit textual evidence for a content flag, return an empty contentFlags array. Do not make up evidence.",
    "Visible profile data: "+JSON.stringify(msg.profile || {})
  ].join("\n");
  try {
    const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})});
    const data=await res.json();
    if(!res.ok) return {ok:false,error:data?.error?.message || "Gemini request failed."};
    const raw=data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!raw) return {ok:false,error:"Empty AI response."};
    try{return {ok:true,result:JSON.parse(raw)}}catch(_){return {ok:false,error:"AI returned invalid JSON."}}
  } catch(e){return {ok:false,error:e.message || "Network error."}}
});
