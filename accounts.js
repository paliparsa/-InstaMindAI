/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
const $=id=>document.getElementById(id),PAGE_SIZE=25;
let records=[],page=1;
const reserved=new Set(["accounts","about","explore","direct","reels","stories","p","developer","legal","web","directory","challenge"]);
function usernameFromUrl(value){try{const u=new URL(value);if(u.protocol!=="https:"||!["instagram.com","www.instagram.com"].includes(u.hostname.toLowerCase()))return null;const parts=u.pathname.split("/").filter(Boolean);if(parts.length!==1)return null;return validUsername(parts[0])}catch(_){return null}}
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
 const fallback=relationFromName(filename,"unknown"),found=[];
 function add(entry,relation){const username=entryUsername(entry);if(!username)return;const old=found.find(x=>x.username.toLowerCase()===username.toLowerCase());if(old){if(!old.relationshipTypes.includes(relation))old.relationshipTypes.push(relation);return}
  const profileUrl="https://www.instagram.com/"+encodeURIComponent(username)+"/";
  found.push({username,profileUrl,status:entry?.status||"review",displayText:typeof entry?.displayText==="string"?entry.displayText:"",avatarUrl:typeof entry?.avatarUrl==="string"&&entry.avatarUrl.startsWith("https://")?entry.avatarUrl:"",relationshipTypes:[relation],importSources:[filename],importedAt:new Date().toISOString(),collectedAt:entry?.collectedAt||new Date().toISOString(),analysis:entry?.analysis||null,flaggedForReview:!!entry?.flaggedForReview,followBackStatus:entry?.followBackStatus||"unknown"});
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
 return found;
}
function relationLabel(x){const a=Array.isArray(x.relationshipTypes)?x.relationshipTypes:[];if(a.includes("followers")&&a.includes("following"))return "FOLLOWER + FOLLOWING";if(a.includes("followers"))return "FOLLOWER";if(a.includes("following"))return "FOLLOWING";return "IMPORTED"}
function profileUrl(x){return "https://www.instagram.com/"+encodeURIComponent(x.username)+"/"}
function openReview(query){browser.tabs.create({url:browser.runtime.getURL("review.html"+query)})}
function status(message,error=false){$("status").textContent=message;$("status").classList.toggle("error",error)}
async function load(){const d=await browser.storage.local.get("accounts");records=Array.isArray(d.accounts)?d.accounts:[];render()}
async function save(){await browser.storage.local.set({accounts:records});render()}
function filtered(){const q=$("search").value.trim().toLowerCase(),f=$("filter").value;return records.filter(x=>{
 const rel=Array.isArray(x.relationshipTypes)?x.relationshipTypes:[],text=[x.username,x.displayText,x.analysis?.bioSummary,(x.analysis?.contentCategories||[]).join(" "),(x.analysis?.contentFlags||[]).join(" ")].join(" ").toLowerCase();
 return (!q||text.includes(q))&&(f==="all"||(f==="followers"&&rel.includes("followers"))||(f==="following"&&rel.includes("following"))||(f==="both"&&rel.includes("followers")&&rel.includes("following"))||(f==="keep"&&x.status==="keep")||(f==="review"&&x.status!=="keep")||(f==="unreviewed"&&!x.analysis)||(f==="flagged"&&x.flaggedForReview));
})}
function makeButton(label,title,handler,extra=""){const b=document.createElement("button");b.className="mini "+extra;b.type="button";b.textContent=label;b.title=title;b.addEventListener("click",handler);return b}
function render(){
 const list=filtered(),pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));page=Math.min(Math.max(1,page),pages);const start=(page-1)*PAGE_SIZE,items=list.slice(start,start+PAGE_SIZE);
 $("total").textContent=records.length;$("followers").textContent=records.filter(x=>x.relationshipTypes?.includes("followers")).length;$("following").textContent=records.filter(x=>x.relationshipTypes?.includes("following")).length;$("kept").textContent=records.filter(x=>x.status==="keep").length;
 $("range").textContent=list.length?("Showing "+(start+1)+"–"+Math.min(start+PAGE_SIZE,list.length)+" of "+list.length):"0 accounts";$("pageSize").textContent=PAGE_SIZE+" per page";
 $("clearSearch").hidden=!$("search").value;$("accounts").textContent="";
 if(!items.length){const empty=document.createElement("div");empty.className="empty";empty.textContent=records.length?"No accounts match these filters. Import a JSON file or change the search.":"No accounts yet. Import your Instagram followers/following JSON or collect visible accounts from Instagram."; $("accounts").append(empty)}
 for(const x of items){
  const row=document.createElement("article");row.className="account";
  if(x.avatarUrl?.startsWith("https://")){const img=document.createElement("img");img.className="avatar";img.src=x.avatarUrl;img.alt="";img.loading="lazy";row.append(img)}else{const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=(x.username||"?")[0].toUpperCase();row.append(avatar)}
  const info=document.createElement("div");info.className="info";const name=document.createElement("strong");name.textContent="@"+x.username;const detail=document.createElement("small");detail.textContent=x.analysis?.contentFlags?.length?"Flagged: "+x.analysis.contentFlags.join(", "):(x.analysis?.contentCategories?.join(" · ")||x.displayText||"Not analyzed");info.append(name,detail);row.append(info);
  const rel=document.createElement("span");rel.className="relation";rel.textContent=relationLabel(x);row.append(rel);
  const tag=document.createElement("span");tag.className="tag "+(x.status==="keep"?"keep":"")+(x.flaggedForReview?" flagged":"");tag.textContent=x.status==="keep"?"KEEP":(x.flaggedForReview?"FLAGGED":(x.analysis?"REVIEWED":"REVIEW"));row.append(tag);
  row.append(makeButton("Open","Open profile without analyzing",()=>browser.tabs.create({url:profileUrl(x)})),makeButton("Review","Analyze this profile",()=>openReview("?username="+encodeURIComponent(x.username)),"review-mini"),makeButton(x.status==="keep"?"Undo":"Keep",x.status==="keep"?"Remove Keep status":"Keep this account",async()=>{x.status=x.status==="keep"?"review":"keep";await save()}));
  $("accounts").append(row);
 }
 $("firstPage").disabled=page===1;$("prevPage").disabled=page===1;$("nextPage").disabled=page===pages;$("lastPage").disabled=page===pages;
 const numbers=$("pageNumbers");numbers.textContent="";const lo=Math.max(1,Math.min(page-2,pages-4)),hi=Math.min(pages,lo+4);for(let n=lo;n<=hi;n++){const b=document.createElement("button");b.type="button";b.className="page-number";b.textContent=n;b.setAttribute("aria-label","Page "+n);if(n===page)b.setAttribute("aria-current","page");b.addEventListener("click",()=>{page=n;render();window.scrollTo({top:0,behavior:"smooth"})});numbers.append(b)}
}
async function importFiles(files){
 if(!files.length)return;let imported=0,duplicates=0,failed=[];const map=new Map(records.map(x=>[x.username.toLowerCase(),x]));
 for(const file of files){
  if(!file.name.toLowerCase().endsWith(".json")&&!["application/json","text/json"].includes(file.type)){failed.push(file.name+": not a JSON file");continue}
  if(file.size>20*1024*1024){failed.push(file.name+": file exceeds 20 MB");continue}
  try{
   const data=JSON.parse(await file.text()),parsed=extractJsonAccounts(data,file.name);if(!parsed.length){failed.push(file.name+": no Instagram accounts were recognized");continue}
   for(const incoming of parsed){const key=incoming.username.toLowerCase(),old=map.get(key);if(old){duplicates++;const merged={...incoming,...old,relationshipTypes:[...new Set([...(old.relationshipTypes||[]),...(incoming.relationshipTypes||[])])],importSources:[...new Set([...(old.importSources||[]),...(incoming.importSources||[])])],avatarUrl:old.avatarUrl||incoming.avatarUrl,displayText:old.displayText||incoming.displayText};map.set(key,merged)}else{map.set(key,incoming);imported++}}
  }catch(e){failed.push(file.name+": "+(e.message||"invalid JSON"))}
 }
 records=[...map.values()].sort((a,b)=>a.username.localeCompare(b.username));page=1;await browser.storage.local.set({accounts:records});render();
 const msg="Imported "+imported+" new accounts; merged "+duplicates+" existing entries."+ (failed.length?" Issues: "+failed.join(" | "):"");
 status(msg,failed.length>0);$("jsonFiles").value="";$("fileNames").textContent="No files selected";$("import").disabled=true;
}
async function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);try{if(browser.downloads?.download){await browser.downloads.download({url,filename:name,saveAs:true});setTimeout(()=>URL.revokeObjectURL(url),60000);return}}catch(_){}const a=document.createElement("a");a.href=url;a.download=name;a.rel="noopener";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$("jsonFiles").addEventListener("change",()=>{const files=[...$("jsonFiles").files];$("fileNames").textContent=files.length?files.map(f=>f.name).join(", "):"No files selected";$("import").disabled=!files.length});
$("import").addEventListener("click",async()=>{const b=$("import");b.disabled=true;b.textContent="Importing…";try{await importFiles([...$("jsonFiles").files])}finally{b.textContent="Import selected";b.disabled=!$("jsonFiles").files.length}});
$("search").addEventListener("input",()=>{page=1;render()});$("clearSearch").addEventListener("click",()=>{$("search").value="";page=1;render();$("search").focus()});$("filter").addEventListener("change",()=>{page=1;render()});
$("firstPage").addEventListener("click",()=>{page=1;render()});$("prevPage").addEventListener("click",()=>{page--;render()});$("nextPage").addEventListener("click",()=>{page++;render()});$("lastPage").addEventListener("click",()=>{page=Math.ceil(filtered().length/PAGE_SIZE);render()});
$("reviewAll").addEventListener("click",()=>{if(!records.length){status("Import or collect accounts first.",true);return}openReview("?all=1")});
$("settings").addEventListener("click",()=>browser.runtime.openOptionsPage());$("back").addEventListener("click",()=>browser.tabs.create({url:browser.runtime.getURL("popup.html")}));
$("exportJson").addEventListener("click",()=>download("instamind-accounts.json",JSON.stringify({accounts:records},null,2),"application/json"));
$("exportCsv").addEventListener("click",()=>{const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"',rows=[["username","profileUrl","relationshipTypes","status","flaggedForReview","contentFlags","summary"],...records.map(x=>[x.username,profileUrl(x),(x.relationshipTypes||[]).join("; "),x.status,x.flaggedForReview,(x.analysis?.contentFlags||[]).join("; "),x.analysis?.bioSummary||""])];download("instamind-accounts.csv",rows.map(r=>r.map(q).join(",")).join("\n"),"text/csv")});
load();