/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
const allowedImageHost = host => host==="cdninstagram.com"||host.endsWith(".cdninstagram.com")||host==="fbcdn.net"||host.endsWith(".fbcdn.net");
function bytesToBase64(bytes){let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary)}
function normalizeModels(value,fallback){const source=Array.isArray(value)?value:fallback;return [...new Set(source.map(x=>String(x||"").trim()).filter(x=>/^[a-zA-Z0-9._-]{1,100}$/.test(x)))];}
async function getModelList(listKey,legacyKey,defaultModel){const cfg=await browser.storage.local.get([listKey,legacyKey]);return normalizeModels(cfg[listKey],[cfg[legacyKey]||defaultModel]);}
function isRateLimited(response,data){const status=String(data?.error?.status||"").toUpperCase(),message=String(data?.error?.message||"").toLowerCase();return response.status===429||status==="RESOURCE_EXHAUSTED"||/rate.?limit|quota exceeded|resource_exhausted|too many requests|requests per minute|tokens per minute|daily limit/.test(message);}
async function requestWithModelFallback(apiKey,models,parts,kind){
 if(!models.length)return {ok:false,error:"No models are configured. Add at least one model in Settings."};
 const rateLimited=[],now=Date.now(),saved=await browser.storage.local.get("modelCooldowns"),cooldowns={...(saved.modelCooldowns||{})},skipped=[];
 for(const model of models){
  const cooldownKey=kind+":"+model;
  if(Number(cooldowns[cooldownKey]||0)>now){skipped.push(model);continue;}

  const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(apiKey);
  let response,data;
  try{response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})});data=await response.json().catch(()=>({}));}
  catch(error){return {ok:false,error:error.message||"Gemini network request failed.",model,rateLimitedModels:rateLimited};}
  if(response.ok){delete cooldowns[cooldownKey];await browser.storage.local.set({modelCooldowns:cooldowns});const usage=data?.usageMetadata||{};const statsKey="geminiUsageStatsV1",stored=await browser.storage.local.get(statsKey),stats={...(stored[statsKey]||{})},key=kind+":"+model,prior=stats[key]||{requests:0,inputTokens:0,outputTokens:0,totalTokens:0,cachedTokens:0};prior.requests++;prior.inputTokens+=Number(usage.promptTokenCount||0);prior.outputTokens+=Number(usage.candidatesTokenCount||0);prior.totalTokens+=Number(usage.totalTokenCount||0);prior.cachedTokens+=Number(usage.cachedContentTokenCount||0);prior.lastUsedAt=new Date().toISOString();stats[key]=prior;await browser.storage.local.set({[statsKey]:stats});return {ok:true,data,model,usage:{inputTokens:Number(usage.promptTokenCount||0),outputTokens:Number(usage.candidatesTokenCount||0),totalTokens:Number(usage.totalTokenCount||0)},rateLimitedModels:rateLimited,skippedModels:skipped};}
  const message=data?.error?.message||"Gemini request failed.";
  if(isRateLimited(response,data)){rateLimited.push(model);cooldowns[cooldownKey]=Date.now()+60*1000;await browser.storage.local.set({modelCooldowns:cooldowns});continue;}
  return {ok:false,error:message,model,rateLimitedModels:rateLimited,status:response.status};
 }
 return {ok:false,error:"All available models are rate-limited or cooling down. Tried: "+[...rateLimited,...skipped].join(", "),rateLimitedModels:[...rateLimited,...skipped],rateLimited:true};
}
async function analyzeText(profile){
 const cfg=await browser.storage.local.get(["apiKey"]);if(!cfg.apiKey)return {ok:false,error:"Add your Gemini text-analysis API key in Settings first."};
 const models=await getModelList("textModels","model","gemini-2.0-flash");
 const {visiblePostImages,...textOnlyProfile}=profile||{};
 const prompt=[
  "Review this Instagram profile using only the supplied visible text and metadata.",
  "Never infer gender, sex, age, ethnicity, religion, sexual orientation, health, or any sensitive trait from a face, photo, name, username, or indirect clue. Never identify a person in an image.",
  "Only report pronouns when explicitly self-described in profile text.",
  "Classify public content themes and account type. Identify potentially adult or sexualized promotional content ONLY when explicitly indicated by supplied bio/caption/text. Do not infer from appearance, clothing, poses, or image descriptions. Do not flag ordinary fashion, fitness, swimwear, or beauty content.",
  "Return valid JSON only with keys: accountType (string), contentCategories (array), bioSummary (string), selfDescribedPronouns (string or null), contentFlags (array; text-evidence only), reviewSignals (array), confidence (number 0-1), limitations (array).",
  "Visible profile data: "+JSON.stringify(textOnlyProfile)
 ].join("\n");
 const request=await requestWithModelFallback(cfg.apiKey,models,[{text:prompt}],"text");
 if(!request.ok)return {ok:false,error:request.error,rateLimitedModels:request.rateLimitedModels||[]};
 const raw=request.data?.candidates?.[0]?.content?.parts?.[0]?.text;if(!raw)return {ok:false,error:"Empty text-analysis response.",model:request.model};
 try{return {ok:true,result:JSON.parse(raw),model:request.model,usage:request.usage||null,rateLimitedModels:request.rateLimitedModels,skippedModels:request.skippedModels}}catch(_){return {ok:false,error:"Text model returned invalid JSON.",model:request.model}}
}
async function analyzeImages(profile){
 const cfg=await browser.storage.local.get(["visionApiKey"]);if(!cfg.visionApiKey)return {ok:true,skipped:true,reason:"Vision API key not configured."};
 const posts=Array.isArray(profile?.visiblePostImages)?profile.visiblePostImages.slice(0,2):[];if(!posts.length)return {ok:true,skipped:true,reason:"No visible post thumbnails were available to sample."};
 const parts=[{text:"Apply a conservative child-suitability screen to these randomly sampled public Instagram post thumbnails. Flag content as potentially NOT suitable for children when any of these are clearly visible: full or partial nudity; exposed breasts, buttocks, or intimate areas; underwear or lingerie; bikinis or other revealing swimwear; visible cleavage or prominently exposed chest; bare torso; exposed upper thighs or substantial upper-leg skin presented as revealing content; sexually suggestive posing, framing, or focus on intimate body areas; or adult/sexual-service promotion. A clearly visible portion of bare leg skin, including a partial calf or thigh, should be flagged as potentially not child-suitable even when only part of the leg appears in the thumbnail. Visible chest or cleavage should also be flagged. Do not infer the person's gender. A small visible part of an arm, face, or hand alone is not a reason to flag. Ordinary everyday clothing and non-revealing beach or sports scenes should not be flagged unless one of the listed cues is visible. When a listed cue is visible but context is uncertain, flag as needs_manual_review with moderate confidence rather than calling it explicit. Distinguish categories: partial_exposure, visible_bare_legs, revealing_clothing, bikini_swimwear, cleavage_or_exposed_chest, exposed_upper_thighs, underwear_or_lingerie, nudity, explicit_sexual_activity, adult_promotion, needs_manual_review. Do not infer or report gender, sex, age, identity, ethnicity, religion, orientation, health, personality, or any other trait of depicted people. Do not describe faces or identify anyone. Return JSON with imageFindings (array of objects with postIndex, classification, evidence describing only the visible clothing/coverage/context, confidence), overallFlag (boolean), childSuitability (string: potentially_not_child_suitable or no_obvious_concern), and limitations (array). Account: @"+String(profile.username||"unknown")}];
 try{
  for(let i=0;i<posts.length;i++){
   const rawUrl=posts[i]?.url;if(!rawUrl)continue;let parsed;try{parsed=new URL(rawUrl)}catch(_){continue}if(parsed.protocol!=="https:"||!allowedImageHost(parsed.hostname))continue;
   const response=await fetch(rawUrl,{credentials:"omit",referrerPolicy:"no-referrer"});if(!response.ok)continue;const blob=await response.blob();if(!blob.type.startsWith("image/")||blob.size>4*1024*1024)continue;
   const bytes=new Uint8Array(await blob.arrayBuffer());parts.push({text:"Sampled post image "+i+" (thumbnail only):"});parts.push({inlineData:{mimeType:blob.type.split(";")[0],data:bytesToBase64(bytes)}});
  }
  if(parts.length===1)return {ok:true,skipped:true,reason:"Sampled thumbnails could not be fetched from Instagram CDN."};
  const models=await getModelList("visionModels","visionModel","gemini-2.5-flash"),request=await requestWithModelFallback(cfg.visionApiKey,models,parts,"vision");
  if(!request.ok)return {ok:false,error:request.error,rateLimitedModels:request.rateLimitedModels||[]};
  const raw=request.data?.candidates?.[0]?.content?.parts?.[0]?.text;if(!raw)return {ok:false,error:"Empty vision-analysis response.",model:request.model};
  try{return {ok:true,result:JSON.parse(raw),sampledImages:parts.filter(p=>p.inlineData).length,model:request.model,usage:request.usage||null,rateLimitedModels:request.rateLimitedModels,skippedModels:request.skippedModels}}catch(_){return {ok:false,error:"Vision model returned invalid JSON.",model:request.model}}
 }catch(e){return {ok:false,error:e.message||"Vision-analysis network error."}}
}
browser.runtime.onMessage.addListener(async msg=>{if(msg?.type==="AI_ANALYZE")return analyzeText(msg.profile);if(msg?.type==="AI_ANALYZE_IMAGES")return analyzeImages(msg.profile);return undefined});
