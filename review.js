/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let cancelled=false, running=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function say(message,error=false){$("status").textContent=message;$("status").style.color=error?"#ff9292":""}
function safeProfileUrl(username){if(!/^[a-zA-Z0-9._]{1,30}$/.test(username||""))throw Error("Invalid Instagram username.");return "https://www.instagram.com/"+encodeURIComponent(username)+"/"}
function renderResult(record,state="Reviewed",error=false){
 const row=document.createElement("article");row.className="result";
 const main=document.createElement("div");main.className="result-main";
 const name=document.createElement("strong");name.textContent="@"+record.username;main.append(name);
 const summary=document.createElement("p");summary.textContent=record.analysis?.bioSummary||record.reviewError||"No summary available.";main.append(summary);
 const tags=document.createElement("div");tags.className="result-tags";
 const add=(label,neutral=false)=>{const t=document.createElement("span");t.className="result-tag"+(neutral?" neutral":"");t.textContent=label;tags.append(t)};
 if(record.flaggedForReview)add("Possible match — verify manually");
 if(record.followBackStatus==="follows_you")add("Follows you",true);
 else if(record.followBackStatus==="not_detected")add("No follow-back badge detected");
 else add("Follow-back unknown",true);
 (record.analysis?.contentFlags||[]).forEach(flag=>add("Content: "+flag));
 if(!(record.analysis?.contentFlags||[]).length)add("No text-based content flags",true);
 if(record.analysis?.selfDescribedPronouns)add("Self-described: "+record.analysis.selfDescribedPronouns,true);
 main.append(tags);
 const status=document.createElement("span");status.className="result-state"+(error?" error":"");status.textContent=state;
 row.append(main,status);$("results").prepend(row);
}
function progress(done,total,label){$("progressTitle").textContent=label;$("progressCount").textContent=done+" / "+total;$("progressBar").style.width=(total?Math.round(done/total*100):0)+"%"}
async function requestConsent(){
 if(!$("consent").checked){say("Tick the consent box before sending profile data to Gemini.",true);return false}
 try{return await browser.permissions.request({data_collection:["websiteContent"]})}
 catch(_){return true}
}
async function waitForTab(tabId){
 for(let i=0;i<100;i++){
  let tab;try{tab=await browser.tabs.get(tabId)}catch(_){throw Error("The profile tab was closed before it loaded.")}
  if(tab.status==="complete")return;
  await wait(400);
 }
 throw Error("Instagram took too long to load this profile.");
}
async function readProfile(tabId){
 for(let i=0;i<12;i++){
  try{const response=await browser.tabs.sendMessage(tabId,{type:"READ_PROFILE"});if(response?.profile&&response.profile.username&&(response.profile.visibleText||"").length>20)return response.profile}catch(_){}
  await wait(900);
 }
 throw Error("Profile content did not load. Check that Instagram is signed in and the account is available.");
}
async function persist(record){
 const current=await browser.storage.local.get("accounts");
 const list=Array.isArray(current.accounts)?current.accounts:[];
 const idx=list.findIndex(x=>x.username?.toLowerCase()===record.username.toLowerCase());
 if(idx>=0)list[idx]={...list[idx],...record};else list.unshift(record);
 await browser.storage.local.set({accounts:list});
}
async function reviewOne(record,index,total){
 let tab=null;
 try{
  say("Opening @"+record.username+" ("+(index+1)+" of "+total+")…");
  tab=await browser.tabs.create({url:safeProfileUrl(record.username),active:false});
  await waitForTab(tab.id);
  const profile=await readProfile(tab.id);
  say("Analyzing @"+record.username+" with Gemini…");
  const result=await browser.runtime.sendMessage({type:"AI_ANALYZE",profile});
  if(!result?.ok)throw Error(result?.error||"AI analysis failed.");
  const followBackStatus=profile.followsYouEvidence?"follows_you":((profile.visibleText||"").length>20?"not_detected":"unknown");
  const contentFlags=Array.isArray(result.result?.contentFlags)?result.result.contentFlags:[];
  const reviewed={...record,profileUrl:safeProfileUrl(record.username),analysis:result.result,followBackStatus,flaggedForReview:followBackStatus==="not_detected"&&contentFlags.length>0,followBackEvidence:profile.followsYouEvidence||null,lastReviewedAt:new Date().toISOString(),reviewError:null};
  await persist(reviewed);renderResult(reviewed,"Reviewed");return true;
 }catch(error){
  const failed={...record,reviewError:error.message,lastReviewedAt:new Date().toISOString()};
  await persist(failed);renderResult(failed,"Could not review",true);return false;
 }finally{if(tab?.id){try{await browser.tabs.remove(tab.id)}catch(_){}}}
}
async function start(){
 if(running)return;
 const cfg=await browser.storage.local.get(["apiKey","accounts"]);
 if(!cfg.apiKey){say("Add your Gemini API key in Settings before starting.",true);return}
 const records=Array.isArray(cfg.accounts)?cfg.accounts:[];
 const one=params.get("username");
 const queue=one?records.filter(x=>x.username?.toLowerCase()===one.toLowerCase()):records.slice();
 if(one&&!queue.length){say("This account is not in your collected list.",true);return}
 if(!queue.length){say("No accounts to review. Collect your Following list first.",true);return}
 const consent=await requestConsent();
 if(!consent){say("Review cancelled. No profile data was sent.");return}
 cancelled=false;running=true;$("start").disabled=true;$("cancel").disabled=false;
 $("heading").textContent=one?"Review @"+one:"Review all collected accounts";
 $("results").textContent="";progress(0,queue.length,"Starting review");
 let done=0,success=0;
 for(let i=0;i<queue.length;i++){
  if(cancelled)break;
  const ok=await reviewOne(queue[i],i,queue.length);if(ok)success++;done++;
  progress(done,queue.length,cancelled?"Stopping":"Reviewing accounts");
  if(i<queue.length-1&&!cancelled)await wait(3500);
 }
 running=false;$("start").disabled=false;$("cancel").disabled=true;
 progress(done,queue.length,cancelled?"Stopped":"Review complete");
 say((cancelled?"Stopped. ":"Finished. ")+success+" of "+done+" profiles reviewed successfully. Failed profiles are marked above.",success===0);
}
$("settings").addEventListener("click",()=>browser.runtime.openOptionsPage());
$("start").addEventListener("click",start);
$("cancel").addEventListener("click",()=>{cancelled=true;$("cancel").disabled=true;say("Stop requested. The current profile will finish first.")});
$("back").addEventListener("click",event=>{event.preventDefault();browser.tabs.create({url:browser.runtime.getURL("popup.html")})});
if(params.get("username"))$("heading").textContent="Review @"+params.get("username");else if(params.get("all"))$("heading").textContent="Review all collected accounts";
