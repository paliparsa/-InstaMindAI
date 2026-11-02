/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const CHECKPOINT_KEY="reviewQueueCheckpointV1";
let pauseRequested=false,running=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function say(message,error=false){$("status").textContent=message;$("status").classList.toggle("status-error",error)}
function safeProfileUrl(username){if(!/^[a-zA-Z0-9._]{1,30}$/.test(username||""))throw Error("Invalid Instagram username.");return "https://www.instagram.com/"+encodeURIComponent(username)+"/"}
function addText(parent,tag,className,value){const node=document.createElement(tag);if(className)node.className=className;node.textContent=value??"";parent.append(node);return node}
function addTag(parent,label,kind="neutral"){return addText(parent,"span","result-tag "+kind,label)}
function relationshipState(record){const rel=Array.isArray(record.relationshipTypes)?record.relationshipTypes:[];if(["unfollowed","unfollowed_manually"].includes(record.followingStatus))return "unfollowed";if(["pending_verification","not_in_latest_snapshot"].includes(record.followingStatus))return "pending_verification";if(record.followingStatus==="following"||rel.includes("following"))return "following";return "pending_verification"}
function renderResult(record,state="Reviewed",error=false){
 const row=document.createElement("article");row.className="result-card";
 const top=document.createElement("div");top.className="result-top";
 const identity=document.createElement("div");identity.className="result-identity";
 addText(identity,"strong","result-username","@"+record.username);
 addText(identity,"span","result-date",record.lastReviewedAt?new Date(record.lastReviewedAt).toLocaleString():"");
 const status=addText(top,"span","result-state"+(error?" error":""),state);top.append(identity,status);row.append(top);
 const compact=document.createElement("details");compact.className="result-expanded";const compactSummary=document.createElement("summary");compactSummary.textContent="@"+record.username+" · Open review details";compact.append(compactSummary);row.append(compact);
 const analysis=record.analysis||{};
 if(analysis.bioSummary)addText(compact,"p","result-summary",analysis.bioSummary);
 else if(record.reviewError)addText(compact,"p","result-summary",record.reviewError);
 else addText(compact,"p","result-summary","No summary was returned for this profile.");
 const details=document.createElement("div");details.className="result-details";
 if(analysis.accountType)addTag(details,"Account: "+analysis.accountType);
 (analysis.contentCategories||[]).forEach(x=>addTag(details,x,"category"));
 if(analysis.confidence!=null)addTag(details,"Text confidence "+Math.round(Number(analysis.confidence)*100)+"%");
 if(record.followBackStatus==="follows_you")addTag(details,"Follows you","positive");
 else if(record.followBackStatus==="not_detected")addTag(details,"Follow-back badge not detected","warning");
 else addTag(details,"Follow-back status unknown");
 (analysis.contentFlags||[]).forEach(x=>addTag(details,"Flag: "+x,"warning"));
 if(record.flaggedForReview)addTag(details,"Manual review recommended","warning");
 if(record.analysisModel)addTag(details,"Text model · "+record.analysisModel);
 if(record.visionModel)addTag(details,"Image model · "+record.visionModel);
 if(record.modelFallbacks?.length)addTag(details,"Fallback · "+record.modelFallbacks.join(" → "));
 compact.append(details);
 if((analysis.reviewSignals||[]).length){const evidence=document.createElement("section");evidence.className="result-section";addText(evidence,"h4","","Text evidence");const ul=document.createElement("ul");(analysis.reviewSignals||[]).forEach(x=>addText(ul,"li","",x));evidence.append(ul);compact.append(evidence)}
 if((analysis.limitations||[]).length){const limitations=document.createElement("details");limitations.className="result-section";addText(limitations,"summary","","Analysis limitations");const ul=document.createElement("ul");analysis.limitations.forEach(x=>addText(ul,"li","",x));limitations.append(ul);compact.append(limitations)}
 const vision=record.visionAnalysis;
 if(vision?.result?.imageFindings?.length){const section=document.createElement("section");section.className="result-section";addText(section,"h4","","Sampled image findings");vision.result.imageFindings.forEach(f=>{const item=document.createElement("div");item.className="finding";addText(item,"strong","",String(f.classification||"Finding").replaceAll("_"," "));addText(item,"p","",f.evidence||"No visual evidence description was returned.");if(f.confidence!=null)addText(item,"small","","Confidence "+Math.round(Number(f.confidence)*100)+"%");section.append(item)});compact.append(section)}
 else if(vision?.skipped)addText(compact,"p","result-note","Image review skipped: "+(vision.reason||"not configured"));
 else if(vision?.error||vision?.ok===false)addText(compact,"p","result-note","Image review unavailable: "+(vision.error||"unknown error"));
 const relationship=relationshipState(record),relationshipTag=addTag(details,relationship==="following"?"Following":relationship==="unfollowed"?"Unfollowed":"Pending verification",relationship);relationshipTag.classList.add("relationship-state");relationshipTag.title=relationship==="following"?"هنوز فالو می‌کنی.":relationship==="unfollowed"?"آنفالو شده.":"هنوز وضعیت نهایی تأیید نشده.";
 const actions=document.createElement("div");actions.className="result-actions";
 const open=document.createElement("button");open.type="button";open.className="secondary";open.textContent="Open profile";open.addEventListener("click",()=>browser.tabs.create({url:safeProfileUrl(record.username),active:true}));actions.append(open);
 const marked=relationshipState(record)==="unfollowed";
 const mark=document.createElement("button");mark.type="button";mark.className="secondary"+(marked?" marked":"");mark.textContent=marked?"Marked unfollowed":"Mark as unfollowed";mark.title=marked?"This account is marked as manually unfollowed in your local list":"Use after you unfollow this account yourself on Instagram";mark.disabled=marked;mark.addEventListener("click",()=>markUnfollowed(record.username,mark,details));actions.append(mark);
 const keepFollowing=document.createElement("button");keepFollowing.type="button";keepFollowing.className="secondary";keepFollowing.textContent="Keep from Following";keepFollowing.title="Permanently exclude this account from future imports, collection, and review queues";keepFollowing.addEventListener("click",()=>excludeFromFollowing(record.username,keepFollowing));actions.append(keepFollowing);
 compact.append(actions);$("results").append(row);
}
function progress(done,total,label){const percent=total?Math.round(done/total*100):0;$("progressTitle").textContent=label;$("progressCount").textContent=done+" / "+total;$("progressBar").style.width=percent+"%";$("progressBar").setAttribute("aria-valuenow",String(done));$("progressBar").setAttribute("aria-valuemax",String(total));$("progressPercent").textContent=percent+"%"}
async function requestConsent(){const saved=await browser.storage.local.get("aiReviewConsentV2");if(saved.aiReviewConsentV2)return true;if(!$("consent").checked){say("Tick the consent box before sending profile text or sampled images to Gemini.",true);return false}let allowed=true;try{allowed=await browser.permissions.request({data_collection:["websiteContent"]})}catch(_){allowed=true}if(allowed)await browser.storage.local.set({aiReviewConsentV2:true});return allowed}
async function waitForTab(tabId){for(let i=0;i<100;i++){let tab;try{tab=await browser.tabs.get(tabId)}catch(_){throw Error("The profile tab was closed before it loaded.")}if(tab.status==="complete")return;await wait(400)}throw Error("Instagram took too long to load this profile.")}
async function injectProfileReader(tabId){try{if(browser.scripting?.executeScript){await browser.scripting.executeScript({target:{tabId},files:["content.js"]});return true}if(browser.tabs?.executeScript){await browser.tabs.executeScript(tabId,{file:"content.js"});return true}}catch(error){return {ok:false,error:error?.message||"Script injection failed."}}return false}
async function readProfile(tabId,expectedUsername){let injected=false;for(let i=0;i<25;i++){try{let response;try{response=await browser.tabs.sendMessage(tabId,{type:"READ_PROFILE"})}catch(_){if(!injected){const injection=await injectProfileReader(tabId);injected=injection===true;if(!injected&&injection?.error)throw Error("Could not inject the Instagram reader: "+injection.error);await wait(500)}response=await browser.tabs.sendMessage(tabId,{type:"READ_PROFILE"})}const profile=response?.profile;if(profile?.profileStatus==="not_found")return profile;if(profile?.username&&(!expectedUsername||profile.username.toLowerCase()===expectedUsername.toLowerCase())){if((profile.visibleText||"").length>20||i>=5)return profile}}catch(_){}await wait(800)}throw Error("Instagram profile did not become readable. Confirm you are signed in and the profile is accessible to your account.")}
async function persist(record){const current=await browser.storage.local.get("accounts"),list=Array.isArray(current.accounts)?current.accounts:[],idx=list.findIndex(x=>x.username?.toLowerCase()===record.username.toLowerCase());if(idx>=0)list[idx]={...list[idx],...record};else list.unshift(record);await browser.storage.local.set({accounts:list})}
async function markUnfollowed(username,button,details){
 const data=await browser.storage.local.get("accounts"),list=Array.isArray(data.accounts)?data.accounts:[],idx=list.findIndex(x=>String(x.username||"").toLowerCase()===username.toLowerCase());
 if(idx<0){say("This account is no longer in your local account list.",true);return}
 await browser.storage.local.set({accounts:list.filter(x=>String(x.username||"").toLowerCase()!==username.toLowerCase())});
 button.textContent="Marked unfollowed · Removed";button.disabled=true;button.classList.add("marked");
 say("@"+username+" marked as manually unfollowed and removed from Account Manager.");
}
async function excludeFromFollowing(username,button){
 const key=String(username||"").toLowerCase();if(!key)return;
 const saved=await browser.storage.local.get(["excludedFollowingAccounts","accounts"]),excluded=new Set((saved.excludedFollowingAccounts||[]).map(x=>String(x).toLowerCase()));excluded.add(key);
 const list=Array.isArray(saved.accounts)?saved.accounts:[],remaining=list.filter(x=>String(x.username||"").toLowerCase()!==key);
 await browser.storage.local.set({excludedFollowingAccounts:[...excluded],accounts:remaining});
 button.textContent="Kept out · Excluded";button.disabled=true;button.classList.add("marked");
 say("@"+username+" is permanently excluded from future imports, collection, and review queues.");
}
async function removeMissingProfile(username){const data=await browser.storage.local.get("accounts"),list=Array.isArray(data.accounts)?data.accounts:[];await browser.storage.local.set({accounts:list.filter(x=>String(x.username||"").toLowerCase()!==username.toLowerCase())})}
async function reviewOne(record,index,total){
 let tab=null;try{
  say("Opening @"+record.username+" ("+(index+1)+" of "+total+")…");tab=await browser.tabs.create({url:safeProfileUrl(record.username),active:false});await waitForTab(tab.id);const profile=await readProfile(tab.id,record.username);
  if(profile.profileStatus==="not_found"){await removeMissingProfile(record.username);say("@"+record.username+" does not exist. Removed from the account list; skipped without AI analysis.");return "not_found"}
  if(profile.profileStatus==="unavailable"){const pending={...record,followingStatus:"pending_verification",reviewError:"Instagram did not show enough profile content to verify this account. Skipped without AI analysis.",lastCheckedAt:new Date().toISOString()};await persist(pending);renderResult(pending,"Pending verification");say("@"+record.username+" could not be verified from the visible page. Skipped without AI analysis.");return "unavailable"}
  say("Analyzing profile text for @"+record.username+"…");const result=await browser.runtime.sendMessage({type:"AI_ANALYZE",profile});if(!result?.ok)throw Error(result?.error||"Text analysis failed.");
  let vision={skipped:true,reason:"Separate image model is not configured."};const cfg=await browser.storage.local.get(["visionApiKey","visionModel"]);if(cfg.visionApiKey&&profile.visiblePostImages?.length){say("Checking up to two sampled post images for @"+record.username+"…");vision=await browser.runtime.sendMessage({type:"AI_ANALYZE_IMAGES",profile})||{ok:false,error:"No response from image model"}}
  const followBackStatus=profile.followsYouEvidence?"follows_you":((profile.visibleText||"").length>20?"not_detected":"unknown"),contentFlags=Array.isArray(result.result?.contentFlags)?result.result.contentFlags:[],imageFindings=Array.isArray(vision?.result?.imageFindings)?vision.result.imageFindings:[],imageFlags=vision?.result?.overallFlag===true||vision?.result?.childSuitability==="potentially_not_child_suitable"||imageFindings.some(f=>["partial_exposure","visible_bare_legs","revealing_clothing","bikini_swimwear","cleavage_or_exposed_chest","exposed_upper_thighs","underwear_or_lingerie","nudity","explicit_sexual_activity","adult_promotion","needs_manual_review","explicit_nudity"].includes(f.classification)&&Number(f.confidence)>=0.5)||false;
  const reviewed={...record,profileUrl:safeProfileUrl(record.username),analysis:result.result,visionAnalysis:vision,analysisModel:result.model||null,visionModel:vision?.model||null,modelFallbacks:[...new Set([...(result.rateLimitedModels||[]),...(result.skippedModels||[]),...(vision?.rateLimitedModels||[]),...(vision?.skippedModels||[])])],followBackStatus,flaggedForReview:(followBackStatus==="not_detected"&&contentFlags.length>0)||imageFlags,followBackEvidence:profile.followsYouEvidence||null,sampledImageCount:vision?.sampledImages||0,lastReviewedAt:new Date().toISOString(),reviewError:null};
  await persist(reviewed);renderResult(reviewed,"Reviewed");return true;
 }catch(error){const failed={...record,reviewError:error.message,lastReviewedAt:new Date().toISOString()};await persist(failed);renderResult(failed,"Could not review",true);return false}
 finally{if(tab?.id){try{await browser.tabs.remove(tab.id)}catch(_){}}}
}
function scopeKey(one){return one?"one:"+one.toLowerCase():"all"}
async function setCheckpoint(value){await browser.storage.local.set({[CHECKPOINT_KEY]:value})}
browser.storage.onChanged?.addListener((changes,area)=>{if(area!=="local"||!changes.accounts||!Array.isArray(changes.accounts.newValue))return;const map=new Map(changes.accounts.newValue.map(x=>[String(x.username||"").toLowerCase(),x]));document.querySelectorAll(".result-card").forEach(card=>{const username=card.querySelector(".result-username")?.textContent?.replace(/^@/,"").toLowerCase();if(!username)return;const record=map.get(username);if(!record){card.remove();return}const state=relationshipState(record),tag=card.querySelector(".relationship-state");if(tag){tag.textContent=state==="following"?"Following":state==="unfollowed"?"Unfollowed":"Pending verification";tag.classList.remove("following","unfollowed","pending_verification");tag.classList.add(state)}const mark=card.querySelector(".result-actions button:nth-child(2)");if(mark){mark.textContent=state==="unfollowed"?"Marked unfollowed":"Mark as unfollowed";mark.disabled=state==="unfollowed";mark.classList.toggle("marked",state==="unfollowed")}})});
async function start(){
 if(running)return;
 const cfg=await browser.storage.local.get(["apiKey","accounts",CHECKPOINT_KEY]);if(!cfg.apiKey){say("Add your text-analysis Gemini API key in Settings before starting.",true);return}
 const records=Array.isArray(cfg.accounts)?cfg.accounts:[],one=params.get("username"),scope=scopeKey(one),checkpoint=cfg[CHECKPOINT_KEY];
 if(checkpoint&&checkpoint.scope!==scope){say("Another review queue is paused. Resume it from its original Review page before starting a different queue.",true);return}
 let queue=[],startAt=0;
 if(checkpoint&&checkpoint.scope===scope&&Array.isArray(checkpoint.queue)){
  const byName=new Map(records.map(x=>[String(x.username||"").toLowerCase(),x]));const checkpointIndex=Math.max(0,Number(checkpoint.nextIndex)||0);startAt=checkpoint.queue.slice(0,checkpointIndex).filter(name=>byName.has(String(name).toLowerCase())).length;queue=checkpoint.queue.map(name=>byName.get(String(name).toLowerCase())).filter(Boolean);startAt=Math.min(startAt,queue.length);
 }
 if(!queue.length){queue=one?records.filter(x=>x.username?.toLowerCase()===one.toLowerCase()):records.slice();startAt=0}
 if(one&&!queue.length){say("This account is not in your collected list.",true);return}if(!queue.length){say("No accounts to review. Collect your Following list first.",true);return}
 if(!await requestConsent()){say("Review cancelled. No profile data was sent.");return}
 const queueNames=queue.map(x=>x.username);pauseRequested=false;running=true;$("start").disabled=true;$("pause").disabled=false;$("heading").textContent=one?"Review @"+one:"Review all collected accounts";progress(startAt,queue.length,"Resuming review");
 if(startAt>0){const doneNames=new Set(queueNames.slice(0,startAt).map(x=>x.toLowerCase()));const latest=await browser.storage.local.get("accounts");for(const record of (latest.accounts||[])){if(doneNames.has(String(record.username||"").toLowerCase())&&(record.analysis||record.reviewError))renderResult(record,record.reviewError?"Could not review":"Reviewed",!!record.reviewError)}}
 let success=0,done=startAt;
 await setCheckpoint({scope,queue:queueNames,nextIndex:startAt,updatedAt:new Date().toISOString()});
 for(let i=startAt;i<queue.length;i++){
  if(pauseRequested)break;
  const latest=await browser.storage.local.get("accounts"),latestNames=new Set((Array.isArray(latest.accounts)?latest.accounts:[]).map(x=>String(x.username||"").toLowerCase()));
  if(!latestNames.has(String(queue[i].username||"").toLowerCase())){queue.splice(i,1);queueNames.splice(i,1);i--;await setCheckpoint({scope,queue:queueNames,nextIndex:done,updatedAt:new Date().toISOString()});progress(done,queue.length,"Removed unfollowed account — skipped");continue}
  const outcome=await reviewOne(queue[i],i,queue.length);
  if(outcome==="not_found"){
   queue.splice(i,1);queueNames.splice(i,1);i--;done=Math.max(startAt,i+1);
   await setCheckpoint({scope,queue:queueNames,nextIndex:done,updatedAt:new Date().toISOString()});
   progress(done,queue.length,"Missing profile removed — skipped");continue;
  }
  if(outcome===true)success++;done=i+1;
  await setCheckpoint({scope,queue:queueNames,nextIndex:done,updatedAt:new Date().toISOString()});
  progress(done,queue.length,pauseRequested?"Pausing":"Reviewing accounts");
  if(i<queue.length-1&&!pauseRequested)await wait(2500);
 }
 running=false;$("start").disabled=false;$("pause").disabled=true;
 if(pauseRequested&&done<queue.length){await setCheckpoint({scope,queue:queueNames,nextIndex:done,updatedAt:new Date().toISOString()});$("start").textContent="Resume review";say("Paused after "+done+" of "+queue.length+". Your place is saved; resume whenever you're ready.");progress(done,queue.length,"Paused");}
 else{await browser.storage.local.remove(CHECKPOINT_KEY);$("start").textContent="Start review";say("Finished. "+success+" of "+(done-startAt)+" profiles reviewed successfully. Verify AI findings manually.",success===0);progress(done,queue.length,"Review complete");}
}
$("settings").addEventListener("click",()=>browser.runtime.openOptionsPage());$("revoke").addEventListener("click",async()=>{pauseRequested=true;await browser.storage.local.remove("aiReviewConsentV2");say("Saved text-and-image review consent revoked. The next review will ask again.")});
$("start").addEventListener("click",start);$("pause").addEventListener("click",()=>{pauseRequested=true;$("pause").disabled=true;say("Pause requested. The current profile will finish, then progress will be saved.")});
$("back").addEventListener("click",event=>{event.preventDefault();browser.tabs.create({url:browser.runtime.getURL("popup.html")})});
(async()=>{const saved=await browser.storage.local.get([CHECKPOINT_KEY,"aiReviewConsentV2"]);const checkpoint=saved[CHECKPOINT_KEY];if(checkpoint&&checkpoint.scope===scopeKey(params.get("username"))){$("start").textContent="Resume review";progress(checkpoint.nextIndex||0,checkpoint.queue?.length||0,"Paused — ready to resume");say("Saved progress found. Resume to continue from the next unreviewed profile.")}else if(params.get("username"))$("heading").textContent="Review @"+params.get("username");else if(params.get("all"))$("heading").textContent="Review all collected accounts";})();
