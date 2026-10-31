/* global browser */
const $=id=>document.getElementById(id);let records=[];
async function load(){const d=await browser.storage.local.get("accounts");records=Array.isArray(d.accounts)?d.accounts:[];render()}
async function save(){await browser.storage.local.set({accounts:records});render()}
function status(t,err=false){$("status").textContent=t;$("status").style.color=err?"#ff9292":""}
async function send(msg){const [tab]=await browser.tabs.query({active:true,currentWindow:true});if(!tab?.id||!tab.url?.startsWith("https://www.instagram.com/"))throw Error("Open Instagram in the active tab first.");return browser.tabs.sendMessage(tab.id,msg)}
function render(){
 $("total").textContent=records.length;$("kept").textContent=records.filter(x=>x.status==="keep").length;$("review").textContent=records.filter(x=>x.status!=="keep").length;
 const q=$("search").value.toLowerCase(),f=$("filter").value,root=$("accounts");root.textContent="";
 const list=records.filter(x=>(x.username+" "+(x.displayText||"")+" "+(x.analysis?.contentCategories||[]).join(" ")).toLowerCase().includes(q)&&(f==="all"||(f==="keep"&&x.status==="keep")||(f==="review"&&x.status!=="keep")||(f==="unreviewed"&&!x.analysis)));
 if(!list.length){const e=document.createElement("div");e.className="empty";e.textContent=records.length?"No matches.":"No accounts yet. Open Following and collect visible accounts.";root.append(e)}
 list.slice(0,80).forEach(x=>{
  const row=document.createElement("div");row.className="account";
  if(x.avatarUrl?.startsWith("https://")){const im=document.createElement("img");im.className="avatar";im.src=x.avatarUrl;im.alt="";row.append(im)}else{const av=document.createElement("div");av.className="avatar";av.textContent=x.username[0].toUpperCase();row.append(av)}
  const info=document.createElement("div");info.className="info";const n=document.createElement("strong");n.textContent="@"+x.username;const d=document.createElement("small");d.textContent=x.analysis?.contentCategories?.join(" · ")||x.displayText||"Not analyzed";info.append(n,d);row.append(info);
  const tag=document.createElement("span");tag.className="tag "+(x.status==="keep"?"keep":"");tag.textContent=x.status==="keep"?"KEEP":"REVIEW";row.append(tag);
  const open=document.createElement("button");open.className="mini";open.textContent="Open";open.onclick=()=>browser.tabs.create({url:x.profileUrl});
  const keep=document.createElement("button");keep.className="mini";keep.textContent=x.status==="keep"?"Undo":"Keep";keep.onclick=async()=>{x.status=x.status==="keep"?"review":"keep";await save()};row.append(open,keep);root.append(row);
 });
}
$("collect").onclick=async()=>{const b=$("collect");b.disabled=true;status("Reading visible account links…");try{const r=await send({type:"COLLECT_FOLLOWING"});const m=new Map(records.map(x=>[x.username.toLowerCase(),x]));(r.accounts||[]).forEach(x=>{const old=m.get(x.username.toLowerCase());m.set(x.username.toLowerCase(),{...old,...x,status:old?.status||"review",analysis:old?.analysis||null})});records=[...m.values()];await save();status((r.accounts||[]).length+" visible accounts collected. Scroll and collect again for more.")}catch(e){status(e.message,true)}finally{b.disabled=false}};
$("analyze").onclick=async()=>{const b=$("analyze");b.disabled=true;status("Reading current profile…");try{const p=await send({type:"READ_PROFILE"});if(!p.profile)throw Error("Open an Instagram profile first.");status("Sending visible profile details to Gemini…");const a=await browser.runtime.sendMessage({type:"AI_ANALYZE",profile:p.profile});if(!a?.ok)throw Error(a?.error||"Analysis failed.");const x=records.find(v=>v.username.toLowerCase()===p.profile.username.toLowerCase());if(x)x.analysis=a.result;else records.unshift({username:p.profile.username,profileUrl:p.profile.profileUrl,displayText:p.profile.metaDescription,status:"review",analysis:a.result,collectedAt:p.profile.collectedAt});await save();show(a.result);status("Analysis complete. Check the result yourself.")}catch(e){status(e.message,true)}finally{b.disabled=false}};
function show(a){const box=$("analysis");box.textContent="";box.classList.remove("hidden");const h=document.createElement("h3");h.textContent="Profile analysis";const lines=["Account type: "+(a.accountType||"Unknown"),"Content: "+(a.contentCategories||[]).join(", "),"Summary: "+(a.bioSummary||"No summary"),"Confidence: "+Math.round((Number(a.confidence)||0)*100)+"% (AI estimate; may be wrong)"];box.append(h,...lines.map(t=>{const p=document.createElement("p");p.textContent=t;return p}))}
function dl(name,content,type){const u=URL.createObjectURL(new Blob([content],{type}));browser.downloads.download({url:u,filename:name,saveAs:true}).finally(()=>URL.revokeObjectURL(u))}
$("json").onclick=()=>dl("instamind-review.json",JSON.stringify(records,null,2),"application/json");
$("csv").onclick=()=>{const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"',rows=[["username","profileUrl","status","categories","summary","collectedAt"],...records.map(x=>[x.username,x.profileUrl,x.status,(x.analysis?.contentCategories||[]).join("; "),x.analysis?.bioSummary||"",x.collectedAt])];dl("instamind-review.csv",rows.map(r=>r.map(q).join(",")).join("\n"),"text/csv")};
$("clear").onclick=async()=>{if(confirm("Delete all local account data?")){records=[];await save();$("analysis").classList.add("hidden");status("Local data cleared.")}};
$("settings").onclick=()=>browser.runtime.openOptionsPage();$("search").oninput=render;$("filter").onchange=render;load();
