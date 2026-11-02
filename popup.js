/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
const $=id=>document.getElementById(id);let records=[];
function relationshipState(record){const rel=Array.isArray(record.relationshipTypes)?record.relationshipTypes:[];if(["unfollowed","unfollowed_manually"].includes(record.followingStatus))return "unfollowed";if(["pending_verification","not_in_latest_snapshot"].includes(record.followingStatus))return "pending_verification";if(record.followingStatus==="following"||rel.includes("following"))return "following";return "pending_verification"}
function relationshipLabel(state){return state==="following"?"Following":state==="unfollowed"?"Unfollowed":"Pending verification"}
async function load(){const d=await browser.storage.local.get("accounts");records=Array.isArray(d.accounts)?d.accounts:[];render()}
browser.storage.onChanged?.addListener((changes,area)=>{if(area==="local"&&changes.accounts){records=Array.isArray(changes.accounts.newValue)?changes.accounts.newValue:[];render()}});
$("manageAccounts").onclick=()=>browser.tabs.create({url:browser.runtime.getURL("accounts.html")});
async function save(){await browser.storage.local.set({accounts:records});render()}
function status(t,err=false){$("status").textContent=t;$("status").style.color=err?"#ff9292":""}
async function send(msg){
 const [tab]=await browser.tabs.query({active:true,currentWindow:true});
 if(!tab?.id||!/^https:\/\/www\.instagram\.com\//i.test(tab.url||""))throw Error("Open instagram.com in the active tab first, then try again.");
 let firstError=null;
 try{return await browser.tabs.sendMessage(tab.id,msg)}catch(error){firstError=error}
 let injected=false,injectionError=null;
 try{
  if(browser.scripting?.executeScript){await browser.scripting.executeScript({target:{tabId:tab.id},files:["content.js"]});injected=true}
  else if(browser.tabs?.executeScript){await browser.tabs.executeScript(tab.id,{file:"content.js"});injected=true}
 }catch(error){injectionError=error}
 if(!injected){
  const detail=injectionError?.message||firstError?.message||"Content script could not be injected.";
  throw Error("InstaMind could not connect to this Instagram tab. Reload the Instagram page and try again. If this is a restricted page or browser profile, open a normal instagram.com tab. Details: "+detail)
 }
 await new Promise(resolve=>setTimeout(resolve,150));
 try{return await browser.tabs.sendMessage(tab.id,msg)}
 catch(error){throw Error("InstaMind was injected, but Instagram did not respond. Reload the Instagram tab and try again. Details: "+(error?.message||"No receiving listener."))}
}
function profileUrl(x){return "https://www.instagram.com/"+encodeURIComponent(x.username)+"/"}
function openReview(query){const url=browser.runtime.getURL("review.html"+query);browser.tabs.create({url})}
function render(){
 $("total").textContent=records.length;$("kept").textContent=records.filter(x=>x.status==="keep").length;$("review").textContent=records.filter(x=>x.status!=="keep").length;
 const counts={following:0,unfollowed:0,pending_verification:0};records.forEach(x=>counts[relationshipState(x)]++);
 $("followingCount").textContent=counts.following;$("unfollowedCount").textContent=counts.unfollowed;$("pendingCount").textContent=counts.pending_verification;
 const q=$("search").value.toLowerCase(),f=$("filter").value,root=$("accounts");root.textContent="";
 const list=records.filter(x=>(x.username+" "+(x.displayText||"")+" "+(x.analysis?.contentCategories||[]).join(" ")+" "+(x.analysis?.contentFlags||[]).join(" ")).toLowerCase().includes(q)&&(f==="all"||(f==="keep"&&x.status==="keep")||(f==="review"&&x.status!=="keep")||(f==="unreviewed"&&!x.analysis)||(f==="flagged"&&x.flaggedForReview)));
 if(!list.length){const e=document.createElement("div");e.className="empty";e.textContent=records.length?"No matches.":"No accounts yet. Open Following and collect visible accounts.";root.append(e)}
 list.slice(0,100).forEach(x=>{
  const row=document.createElement("div");row.className="account";
  if(x.avatarUrl?.startsWith("https://")){const im=document.createElement("img");im.className="avatar";im.src=x.avatarUrl;im.alt="";row.append(im)}else{const av=document.createElement("div");av.className="avatar";av.textContent=(x.username||"?")[0].toUpperCase();row.append(av)}
  const info=document.createElement("div");info.className="info";const n=document.createElement("strong");n.textContent="@"+x.username;const d=document.createElement("small");d.textContent=x.analysis?.contentFlags?.length?"Flagged: "+x.analysis.contentFlags.join(", "):(x.analysis?.contentCategories?.join(" · ")||x.displayText||"Not analyzed");info.append(n,d);row.append(info);
  const relState=relationshipState(x),tag=document.createElement("span");tag.className="tag relationship-state "+relState;tag.textContent=relationshipLabel(relState);tag.title=relState==="following"?"هنوز فالو می‌کنی.":relState==="unfollowed"?"آنفالو شده.":"هنوز وضعیت نهایی تأیید نشده.";row.append(tag);
  const open=document.createElement("button");open.className="mini";open.textContent="Open";open.title="Open profile without analyzing";open.onclick=()=>browser.tabs.create({url:profileUrl(x)});
  const review=document.createElement("button");review.className="mini review-mini";review.textContent="Review";review.title="Open this profile in a background tab and analyze it";review.onclick=()=>openReview("?username="+encodeURIComponent(x.username));
  const keep=document.createElement("button");keep.className="mini";keep.textContent=x.status==="keep"?"Undo":"Keep";keep.onclick=async()=>{x.status=x.status==="keep"?"review":"keep";await save()};row.append(open,review,keep);root.append(row);
 });
}
$("collect").onclick=async()=>{const b=$("collect");b.disabled=true;status("Reading visible account links…");try{const r=await send({type:"COLLECT_FOLLOWING"});const m=new Map(records.map(x=>[x.username.toLowerCase(),x]));(r.accounts||[]).forEach(x=>{const old=m.get(x.username.toLowerCase());m.set(x.username.toLowerCase(),{...old,...x,relationshipTypes:[...new Set([...(old?.relationshipTypes||[]),"following"])],followingStatus:"following",status:old?.status||"review",analysis:old?.analysis||null})});records=[...m.values()];await save();status((r.accounts||[]).length+" visible accounts collected. Scroll and collect again for more.")}catch(e){status(e.message,true)}finally{b.disabled=false}};
$("reviewAll").onclick=()=>{if(!records.length){status("Collect accounts from your Following page first.",true);return}openReview("?all=1")};
$("analyze").onclick=async()=>{const b=$("analyze");b.disabled=true;try{let consent=false;try{consent=await browser.permissions.request({data_collection:["websiteContent"]})}catch(_){consent=confirm("Visible Instagram profile text and metadata will be sent to Google Gemini for analysis. Continue?")}if(!consent){status("AI analysis cancelled. No profile data was sent.");return}status("Reading current profile…");const p=await send({type:"READ_PROFILE"});if(!p.profile)throw Error("Open an Instagram profile first.");if(p.profile.profileStatus==="not_found"){records=records.filter(v=>v.username.toLowerCase()!==p.profile.username.toLowerCase());await save();status("@"+p.profile.username+" does not exist. Removed from your local list; no AI tokens used.");return}if(p.profile.profileStatus==="unavailable"){const existing=records.find(v=>v.username.toLowerCase()===p.profile.username.toLowerCase());if(existing){existing.followingStatus="pending_verification";await save()}status("This profile could not be verified from the visible page. Skipped without AI analysis.");return}status("Sending visible profile details to Gemini…");const a=await browser.runtime.sendMessage({type:"AI_ANALYZE",profile:p.profile});if(!a?.ok)throw Error(a?.error||"Analysis failed.");const x=records.find(v=>v.username.toLowerCase()===p.profile.username.toLowerCase());if(x){x.analysis=a.result;x.followBackStatus=p.profile.followsYouEvidence?"follows_you":((p.profile.visibleText||"").length>20?"not_detected":"unknown");x.flaggedForReview=x.followBackStatus==="not_detected"&&(a.result.contentFlags||[]).length>0;x.lastReviewedAt=new Date().toISOString()}else records.unshift({username:p.profile.username,profileUrl:p.profile.profileUrl,displayText:p.profile.metaDescription,status:"review",analysis:a.result,followBackStatus:p.profile.followsYouEvidence?"follows_you":((p.profile.visibleText||"").length>20?"not_detected":"unknown"),flaggedForReview:!p.profile.followsYouEvidence&&(p.profile.visibleText||"").length>20&&(a.result.contentFlags||[]).length>0,collectedAt:p.profile.collectedAt,lastReviewedAt:new Date().toISOString()});await save();show(a.result);status("Analysis complete. AI flags are suggestions; verify the profile yourself.")}catch(e){status(e.message,true)}finally{b.disabled=false}};
function show(a){const box=$("analysis");box.textContent="";box.classList.remove("hidden");const h=document.createElement("h3");h.textContent="Profile analysis";const lines=["Account type: "+(a.accountType||"Unknown"),"Content: "+(a.contentCategories||[]).join(", "),"Text-based content flags: "+((a.contentFlags||[]).join(", ")||"None detected"),"Review evidence: "+((a.reviewSignals||[]).join(" · ")||"No explicit evidence returned"),"Self-described pronouns: "+(a.selfDescribedPronouns||"Not stated"),"Summary: "+(a.bioSummary||"No summary"),"Confidence: "+Math.round((Number(a.confidence)||0)*100)+"% (AI estimate; may be wrong)"];box.append(h,...lines.map(t=>{const p=document.createElement("p");p.textContent=t;return p}))}
async function dl(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);try{if(browser.downloads?.download){await browser.downloads.download({url,filename:name,saveAs:true});setTimeout(()=>URL.revokeObjectURL(url),60000);return}}catch(_){}const a=document.createElement("a");a.href=url;a.download=name;a.rel="noopener";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$("json").onclick=()=>dl("instamind-review.json",JSON.stringify(records,null,2),"application/json");
$("csv").onclick=()=>{const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"',rows=[["username","profileUrl","status","flaggedForReview","followBackStatus","contentFlags","categories","summary","collectedAt","lastReviewedAt"],...records.map(x=>[x.username,x.profileUrl,x.status,x.flaggedForReview,x.followBackStatus,(x.analysis?.contentFlags||[]).join("; "),(x.analysis?.contentCategories||[]).join("; "),x.analysis?.bioSummary||"",x.collectedAt,x.lastReviewedAt])];dl("instamind-review.csv",rows.map(r=>r.map(q).join(",")).join("\n"),"text/csv")};
$("clear").onclick=async()=>{if(confirm("Delete all local account data?")){records=[];await browser.storage.local.remove("aiReviewConsent");await save();$("analysis").classList.add("hidden");status("Local data and saved AI review consent cleared.")}};
$("settings").onclick=()=>browser.runtime.openOptionsPage();$("search").oninput=render;$("filter").onchange=render;load();
