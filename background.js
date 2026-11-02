/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
const allowedImageHost = host => host==="cdninstagram.com"||host.endsWith(".cdninstagram.com")||host==="fbcdn.net"||host.endsWith(".fbcdn.net");
function bytesToBase64(bytes){let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary)}
async function analyzeText(profile){
  const cfg=await browser.storage.local.get(["apiKey","model"]);if(!cfg.apiKey)return {ok:false,error:"Add your Gemini text-analysis API key in Settings first."};
  const model=cfg.model||"gemini-2.0-flash",url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(cfg.apiKey);
  const {visiblePostImages,...textOnlyProfile}=profile||{};\n  const prompt=[
    "Review this Instagram profile using only the supplied visible text and metadata.",
    "Never infer gender, sex, age, ethnicity, religion, sexual orientation, health, or any sensitive trait from a face, photo, name, username, or indirect clue. Never identify a person in an image.",
    "Only report pronouns when explicitly self-described in profile text.",
    "Classify public content themes and account type. Identify potentially adult or sexualized promotional content ONLY when explicitly indicated by supplied bio/caption/text. Do not infer from appearance, clothing, poses, or image descriptions. Do not flag ordinary fashion, fitness, swimwear, or beauty content.",
    "Return valid JSON only with keys: accountType (string), contentCategories (array), bioSummary (string), selfDescribedPronouns (string or null), contentFlags (array; text-evidence only), reviewSignals (array), confidence (number 0-1), limitations (array).",
    "Visible profile data: "+JSON.stringify(textOnlyProfile)
  ].join("\n");
  try{const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})}),data=await res.json();if(!res.ok)return {ok:false,error:data?.error?.message||"Gemini text request failed."};const raw=data?.candidates?.[0]?.content?.parts?.[0]?.text;if(!raw)return {ok:false,error:"Empty text-analysis response."};try{return {ok:true,result:JSON.parse(raw)}}catch(_){return {ok:false,error:"Text model returned invalid JSON."}}}catch(e){return {ok:false,error:e.message||"Text-analysis network error."}}
}
async function analyzeImages(profile){
  const cfg=await browser.storage.local.get(["visionApiKey","visionModel"]);if(!cfg.visionApiKey)return {ok:true,skipped:true,reason:"Vision API key not configured."};
  const posts=Array.isArray(profile?.visiblePostImages)?profile.visiblePostImages.slice(0,2):[];if(!posts.length)return {ok:true,skipped:true,reason:"No visible post thumbnails were available to sample."};
  const parts=[{text:"Inspect these randomly sampled public Instagram post thumbnails ONLY for potentially explicit or sexually suggestive content. Do not infer or report gender, sex, age, identity, ethnicity, religion, orientation, health, personality, or any other trait of depicted people. Do not describe faces or identify anyone. Do not treat ordinary clothing, swimwear, fitness, fashion, beauty, dancing, or non-explicit poses as inappropriate. Only flag clearly visible nudity, explicit sexual activity, or overt sexual-service/adult-content promotion. If uncertain, mark uncertain and do not flag. Return JSON only: {\\"imageFindings\\":[{\\"postIndex\\":number,\\"classification\\":\\"explicit_nudity|explicit_sexual_activity|adult_promotion|non_explicit|uncertain\\",\\"evidence\\":string,\\"confidence\\":number}],\\"overallFlag\\":boolean,\\"limitations\\":[string]}. Account: @"+String(profile.username||"unknown")}];
  try{
    for(let i=0;i<posts.length;i++){
      const rawUrl=posts[i]?.url;if(!rawUrl)continue;let parsed;try{parsed=new URL(rawUrl)}catch(_){continue}if(parsed.protocol!=="https:"||!allowedImageHost(parsed.hostname))continue;
      const response=await fetch(rawUrl,{credentials:"omit",referrerPolicy:"no-referrer"});if(!response.ok)continue;const blob=await response.blob();if(!blob.type.startsWith("image/")||blob.size>4*1024*1024)continue;
      const bytes=new Uint8Array(await blob.arrayBuffer());parts.push({text:"Sampled post image "+i+" (thumbnail only):"});parts.push({inlineData:{mimeType:blob.type.split(";")[0],data:bytesToBase64(bytes)}});
    }
    if(parts.length===1)return {ok:true,skipped:true,reason:"Sampled thumbnails could not be fetched from Instagram CDN."};
    const model=cfg.visionModel||"gemini-2.5-flash",url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(cfg.visionApiKey);
    const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})}),data=await res.json();if(!res.ok)return {ok:false,error:data?.error?.message||"Gemini Vision request failed."};
    const raw=data?.candidates?.[0]?.content?.parts?.[0]?.text;if(!raw)return {ok:false,error:"Empty vision-analysis response."};try{return {ok:true,result:JSON.parse(raw),sampledImages:parts.filter(p=>p.inlineData).length}}catch(_){return {ok:false,error:"Vision model returned invalid JSON."}}
  }catch(e){return {ok:false,error:e.message||"Vision-analysis network error."}}
}
browser.runtime.onMessage.addListener(async msg=>{if(msg?.type==="AI_ANALYZE")return analyzeText(msg.profile);if(msg?.type==="AI_ANALYZE_IMAGES")return analyzeImages(msg.profile);return undefined});
