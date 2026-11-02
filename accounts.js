/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
const $=id=>document.getElementById(id),PAGE_SIZE=25;
let records=[],page=1;
const reserved=new Set(["accounts","about","explore","direct","reels","stories","p","developer","legal","web","directory","challenge"]);
function usernameFromUrl(value){try{const u=new URL(value);if(u.protocol!=="https:"||!["instagram.com","www.instagram.com"].includes(u.hostname.toLowerCase()))return null;const parts=u.pathname.split("/").filter(Boolean);const candidate=parts.length===1?parts[0]:(parts.length===2&&parts[0].toLowerCase()==="_u"?parts[1]:null);return validUsername(candidate)}catch(_){return null}}
function validUsername(value){if(typeof value!=="string")return null;let v=value.trim().replace(/^@/,"");if(!/^[a-zA-Z0-9._]{1,30}$/.test(v)||reserved.has(v.toLowerCase()))return null;return v}
function relationFromName(name,fallback="unknown"){const s=String(name||"").toLowerCase();if(/followings?|relationships_following/.test(s))return "following";if(/followers?|relationships_followers/.test(s))return "followers";return fallback}
function entryUsername(entry){
 if(typeof entry==="string")return validUsername(entry)||usernameFromUrl(entry);
 if(!entry||typeof entry!=="object")return null;
 for(const item of (Array.isArray(entry.string_list_data)?entry.string_list_data:[])){
  const value=validUsername(item?.value);if(value)return value;
  const fromHref=usernameFromUrl(item?.href);if(fromHref)return fromHref;
 }
 for(const value of [entry.username,entry.user_name,entry.handle,entry.value]){const v=validUsername(value);if(v)return v}
 for(const value of [entry.profileUrl,entry.profile_url,entry.url,entry.href]){const v=usernameFromUrl(value);if(v)return v}
 return null;
}
function extractJsonAccounts(data,filename){
 const fallback=relationFromName(filename,"unknown"),foundByUsername=new Map();
 function add(entry,relation){const username=entryUsername(entry);if(!username)return;const key=username.toLowerCase(),old=foundByUsername.get(key);if(old){if(relation!=="unknown"&&!old.relationshipTypes.includes(relation))old.relationshipTypes.push(relation);return}
  const profileUrl="https://www.instagram.com/"+encodeURIComponent(username)+"/";
  foundByUsername.set(key,{username,profileUrl,status:entry?.status||"review",displayText:typeof entry?.displayText==="string"?entry.displayText:"",avatarUrl:typeof entry?.avatarUrl==="string"&&entry.avatarUrl.startsWith("https://")?entry.avatarUrl:"",relationshipTypes:[...new Set([...(Array.isArray(entry?.relationshipTypes)?entry.relationshipTypes:[]),...(relation==="unknown"?[]:[relation])])],importSources:[...new Set([...(Array.isArray(entry?.importSources)?entry.importSources:[]),filename])],importedAt:entry?.importedAt||new Date().toISOString(),collectedAt:entry?.collectedAt||new Date().toISOString(),analysis:entry?.analysis||null,flaggedForReview:!!entry?.flaggedForReview,followBackStatus:entry?.followBackStatus||"unknown",followingStatus:entry?.followingStatus||((relation==="following"||(entry?.relationshipTypes||[]).includes("following"))?"following":"pending_verification")});
 }
 function visit(node,relation="unknown",key=""){
  if(Array.isArray(node)){for(const item of node){if(item&&typeof item==="object"&&Array.isArray(item.string_list_data))add(item,relation);else if(typeof item==="string")add(item,relation);else if(item&&typeof item==="object"&&(item.username||item.user_name||item.handle||item.profileUrl))add(item,relation)}return}
  if(!node||typeof node!=="object")return;
  const rel=relationFromName(key,relation);
  if(Array.isArray(node.string_list_data)||node.username||node.user_name||node.handle||node.profileUrl||node.profile_url){add(node,rel);return}
  const recognized=Object.keys(node).filter(k=>/^(relationships_followers|relationships_following|followers|following|accounts|users|connections)$/i.test(k));
  for(const k of recognized)visit(node[k],relationFromName(k,rel),k);
 }
 if(Array.isArray(data))visit(data,fallback,filename);
 else if(data&&typeof data==="object"){
  const top=Object.keys(data).filter(k=>/^(relationships_followers|relationships_following|followers|following|accounts|users|connections)$/i.test(k));
  if(top.length){for(const k of top)visit(data[k],relationFromName(k,fallback),k)}
  else if(data.username||data.user_name||data.handle||data.profileUrl)visit([data],fallback,filename);
 }
 return [...foundByUsername.values()];
}
function reconcileFollowingSnapshot(existingRecords,incomingRecords,timestamp=new Date().toISOString()){
 const map=new Map((Array.isArray(existingRecords)?existingRecords:[]).map(x=>[String(x.username||"").toLowerCase(),x]));
 for(const [key,old] of map){const rel=Array.isArray(old.relationshipTypes)?old.relationshipTypes:[];if(rel.includes("following"))map.set(key,{...old,relationshipTypes:rel.filter(x=>x!=="following"),followingStatus:"pending_verification",followingSnapshotAt:timestamp})}
 let imported=0,duplicates=0;
 for(const incoming of (Array.isArray(incomingRecords)?incomingRecords:[])){
  const key=String(incoming.username||"").toLowerCase();if(!key)continue;const old=map.get(key);
  if(old){duplicates++;const rel=[...new Set([...(old.relationshipTypes||[]),...(incoming.relationshipTypes||[])])];const merged={...incoming,...old,relationshipTypes:rel,importSources:[...new Set([...(old.importSources||[]),...(incoming.importSources||[])])],avatarUrl:old.avatarUrl||incoming.avatarUrl,displayText:old.displayText||incoming.displayText};if(incoming.relationshipTypes?.includes("following")){merged.followingStatus="following";merged.followingSnapshotAt=timestamp}map.set(key,merged)}
  else{imported++;const created={...incoming};if(incoming.relationshipTypes?.includes("following")){created.followingStatus="following";created.followingSnapshotAt=timestamp}map.set(key,created)}
 }
 return {records:[...map.values()],imported,duplicates};
}
function relationshipState(x){const rel=Array.isArray(x.relationshipTypes)?x.relationshipTypes:[];if(["unfollowed","unfollowed_manually"].includes(x.followingStatus))return "unfollowed";if(x.followingStatus==="following"||rel.includes("following"))return "following";return "pending_verification"}
function relationshipLabel(state){return state==="following"?"Following":state==="unfollowed"?"Unfollowed":"Pending verification"}
function relationLabel(x){const a=Array.isArray(x.relationshipTypes)?x.relationshipTypes:[];if(x.followingStatus==="unfollowed"||x.followingStatus==="unfollowed_manually")return a.includes("followers")?"FOLLOWER · UNFOLLOWED":"UNFOLLOWED";if(x.followingStatus==="pending_verification"||x.followingStatus==="not_in_latest_snapshot")return a.includes("followers")?"FOLLOWER · PENDING":"PENDING VERIFICATION";if(a.includes("followers")&&a.includes("following"))return "FOLLOWER + FOLLOWING";if(a.includes("followers"))return "FOLLOWER";if(a.includes("following"))return "FOLLOWING";return "IMPORTED"}
function profileUrl(x){return "https://www.instagram.com/"+encodeURIComponent(x.username)+"/"}
function openReview(query){browser.tabs.create({url:browser.runtime.getURL("review.html"+query)})}
function status(message,error=false){$("status").textContent=message;$("status").classList.toggle("error",error)}
async function load(){const d=await browser.storage.local.get("accounts");records=Array.isArray(d.accounts)?d.accounts:[];render()}
browser.storage.onChanged?.addListener((changes,area)=>{if(area==="local"&&changes.accounts){records=Array.isArray(changes.accounts.newValue)?changes.accounts.newValue:[];render()}})
async function save(){await browser.storage.local.set({accounts:records});render()}
function filtered(){const q=$("search").value.trim().toLowerCase(),f=$("filter").value;return records.filter(x=>{
 const rel=Array.isArray(x.relationshipTypes)?x.relationshipTypes:[],text=[x.username,x.displayText,x.analysis?.bioSummary,(x.analysis?.contentCategories||[]).join(" "),(x.analysis?.contentFlags||[]).join(" ")].join(" ").toLowerCase();
 return (!q||text.includes(q))&&(f==="all"||(f==="followers"&&rel.includes("followers"))||(f==="following"&&relationshipState(x)==="following")||(f==="unfollowed"&&relationshipState(x)==="unfollowed")||(f==="pending"&&relationshipState(x)==="pending_verification")||(f==="both"&&rel.includes("followers")&&rel.includes("following"))||(f==="keep"&&x.status==="keep")||(f==="review"&&x.status!=="keep")||(f==="unreviewed"&&!x.analysis)||(f==="flagged"&&x.flaggedForReview));
})}
function makeButton(label,title,handler,extra=""){const b=document.createElement("button");b.className="mini "+extra;b.type="button";b.textContent=label;b.title=title;b.addEventListener("click",handler);return b}
function render(){
 const list=filtered(),pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));page=Math.min(Math.max(1,page),pages);const start=(page-1)*PAGE_SIZE,items=list.slice(start,start+PAGE_SIZE);
 $("total").textContent=records.length;$("followers").textContent=records.filter(x=>x.relationshipTypes?.includes("followers")).length;$("following").textContent=records.filter(x=>relationshipState(x)==="following").length;$("unfollowed").textContent=records.filter(x=>relationshipState(x)==="unfollowed").length;$("pending").textContent=records.filter(x=>relationshipState(x)==="pending_verification").length;$("kept").textContent=records.filter(x=>x.status==="keep").length;
 $("range").textContent=list.length?("Showing "+(start+1)+"–"+Math.min(start+PAGE_SIZE,list.length)+" of "+list.length):"0 accounts";$("pageSize").textContent=PAGE_SIZE+" per page";
 $("clearSearch").hidden=!$("search").value;$("accounts").textContent="";
 if(!items.length){const empty=document.createElement("div");empty.className="empty";empty.textContent=records.length?"No accounts match these filters. Import a JSON file or change the search.":"No accounts yet. Import your Instagram followers/following JSON or collect visible accounts from Instagram."; $("accounts").append(empty)}
 for(const x of items){
  const row=document.createElement("article");row.className="account";
  if(x.avatarUrl?.startsWith("https://")){const img=document.createElement("img");img.className="avatar";img.src=x.avatarUrl;img.alt="";img.loading="lazy";row.append(img)}else{const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=(x.username||"?")[0].toUpperCase();row.append(avatar)}
  const info=document.createElement("div");info.className="info";const name=document.createElement("strong");name.textContent="@"+x.username;const detail=document.createElement("small");detail.textContent=x.analysis?.contentFlags?.length?"Flagged: "+x.analysis.contentFlags.join(", "):(x.analysis?.contentCategories?.join(" · ")||x.displayText||"Not analyzed");info.append(name,detail);row.append(info);
  const rel=document.createElement("span");rel.className="relation";rel.textContent=relationLabel(x);row.append(rel);
  const relState=relationshipState(x),tag=document.createElement("span");tag.className="tag relationship-state "+relState;tag.textContent=relationshipLabel(relState);tag.title=relState==="following"?"هنوز فالو می‌کنی.":relState==="unfollowed"?"آنفالو شده.":"هنوز وضعیت نهایی تأیید نشده.";row.append(tag);
  row.append(makeButton("Open","Open Instagram profile",()=>browser.tabs.create({url:profileUrl(x),active:true})),makeButton("Review","Analyze this profile",()=>openReview("?username="+encodeURIComponent(x.username)),"review-mini"),makeButton(x.status==="keep"?"Undo":"Keep",x.status==="keep"?"Remove Keep status":"Keep this account",async()=>{x.status=x.status==="keep"?"review":"keep";await save()}));
  row.append(makeButton("×","Delete this account",async()=>{if(!confirm("Delete @"+x.username+" from your local account list?"))return;records=records.filter(a=>a.username.toLowerCase()!==x.username.toLowerCase());await save();status("@"+x.username+" deleted.")},"delete-one"));
  $("accounts").append(row);
 }
 $("firstPage").disabled=page===1;$("prevPage").disabled=page===1;$("nextPage").disabled=page===pages;$("lastPage").disabled=page===pages;
 const numbers=$("pageNumbers");numbers.textContent="";const lo=Math.max(1,Math.min(page-2,pages-4)),hi=Math.min(pages,lo+4);for(let n=lo;n<=hi;n++){const b=document.createElement("button");b.type="button";b.className="page-number";b.textContent=n;b.setAttribute("aria-label","Page "+n);if(n===page)b.setAttribute("aria-current","page");b.addEventListener("click",()=>{page=n;render();window.scrollTo({top:0,behavior:"smooth"})});numbers.append(b)}
}
async function importFiles(files){
 if(!files.length)return;
 let imported=0,duplicates=0,failed=[],syncFollowingSnapshot=false;const incomingAll=[];
 for(const file of files){
  if(!file.name.toLowerCase().endsWith(".json")&&![ "application/json","text/json"].includes(file.type)){failed.push(file.name+": not a JSON file");continue}
  if(file.size>50*1024*1024){failed.push(file.name+": file exceeds 50 MB");continue}
  try{
   const data=JSON.parse(await file.text()),parsed=extractJsonAccounts(data,file.name);if(!parsed.length){failed.push(file.name+": no Instagram accounts were recognized");continue}
   if($("followingSnapshot").checked&&relationFromName(file.name,"unknown")==="following")syncFollowingSnapshot=true;
   incomingAll.push(...parsed);
  }catch(e){failed.push(file.name+": "+(e.message||"invalid JSON"))}
 }
 let syncResult=null;
 if(syncFollowingSnapshot)syncResult=reconcileFollowingSnapshot(records,incomingAll);
 else{
  const map=new Map(records.map(x=>[x.username.toLowerCase(),x]));
  for(const incoming of incomingAll){
   const key=incoming.username.toLowerCase(),old=map.get(key);
   if(old){duplicates++;const rel=[...new Set([...(old.relationshipTypes||[]),...(incoming.relationshipTypes||[])])];const merged={...incoming,...old,relationshipTypes:rel,importSources:[...new Set([...(old.importSources||[]),...(incoming.importSources||[])])],avatarUrl:old.avatarUrl||incoming.avatarUrl,displayText:old.displayText||incoming.displayText};if(incoming.relationshipTypes?.includes("following"))merged.followingStatus="following";map.set(key,merged)}
   else{map.set(key,incoming);imported++}
  }
  syncResult={records:[...map.values()],imported,duplicates};
 }
 imported=syncResult.imported;duplicates=syncResult.duplicates;
 records=syncResult.records.sort((a,b)=>a.username.localeCompare(b.username));page=1;await browser.storage.local.set({accounts:records,...(syncFollowingSnapshot?{followingSnapshotImportedAt:new Date().toISOString()}: {})});render();
 const syncMsg=syncFollowingSnapshot?" Following snapshot synchronized. Accounts absent from this export are marked “Not in latest export”.":"";
 const msg="Imported "+imported+" new accounts; merged "+duplicates+" existing entries."+syncMsg+(failed.length?" Issues: "+failed.join(" | "):"");
 status(msg,failed.length>0);$("jsonFiles").value="";$("fileNames").textContent="No files selected";$("import").disabled=true;
}
async function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);try{if(browser.downloads?.download){await browser.downloads.download({url,filename:name,saveAs:true});setTimeout(()=>URL.revokeObjectURL(url),60000);return}}catch(_){}const a=document.createElement("a");a.href=url;a.download=name;a.rel="noopener";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$("jsonFiles").addEventListener("change",()=>{const files=[...$("jsonFiles").files];$("fileNames").textContent=files.length?files.map(f=>f.name).join(", "):"No files selected";$("import").disabled=!files.length});
$("import").addEventListener("click",async()=>{const b=$("import");b.disabled=true;b.textContent="Importing…";try{await importFiles([...$("jsonFiles").files])}finally{b.textContent="Import selected";b.disabled=!$("jsonFiles").files.length}});
$("search").addEventListener("input",()=>{page=1;render()});$("clearSearch").addEventListener("click",()=>{$("search").value="";page=1;render();$("search").focus()});$("filter").addEventListener("change",()=>{page=1;render()});
$("firstPage").addEventListener("click",()=>{page=1;render()});$("prevPage").addEventListener("click",()=>{page--;render()});$("nextPage").addEventListener("click",()=>{page++;render()});$("lastPage").addEventListener("click",()=>{page=Math.ceil(filtered().length/PAGE_SIZE);render()});
$("reviewAll").addEventListener("click",()=>{if(!records.length){status("Import or collect accounts first.",true);return}openReview("?all=1")});
$("deleteAll").addEventListener("click",async()=>{if(!records.length){status("The account list is already empty.");return}if(!confirm("Delete all "+records.length+" accounts and their saved review results from this browser? This cannot be undone."))return;const count=records.length;records=[];page=1;await browser.storage.local.set({accounts:[]});render();status(count+" accounts deleted. Your API keys and review-consent setting were not changed.")});
$("settings").addEventListener("click",()=>browser.runtime.openOptionsPage());$("back").addEventListener("click",()=>browser.tabs.create({url:browser.runtime.getURL("popup.html")}));
$("exportJson").addEventListener("click",()=>download("instamind-accounts.json",JSON.stringify({accounts:records},null,2),"application/json"));
$("exportCsv").addEventListener("click",()=>{const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"',rows=[["username","profileUrl","relationshipTypes","status","flaggedForReview","contentFlags","summary"],...records.map(x=>[x.username,profileUrl(x),(x.relationshipTypes||[]).join("; "),x.status,x.flaggedForReview,(x.analysis?.contentFlags||[]).join("; "),x.analysis?.bioSummary||""])];download("instamind-accounts.csv",rows.map(r=>r.map(q).join(",")).join("\n"),"text/csv")});
load();