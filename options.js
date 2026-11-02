/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
(async()=>{
 const $=id=>document.getElementById(id);
 const defaults={textModels:["gemini-2.0-flash"],visionModels:["gemini-2.5-flash"]};
 const state={textModels:[],visionModels:[]};
 let dragging=null;
 const validModel=value=>/^[a-zA-Z0-9._-]{1,100}$/.test(value);
 const cleanModels=(value,fallback)=>{const source=Array.isArray(value)?value:fallback;return [...new Set(source.map(x=>String(x||"").trim()).filter(validModel))]};
 const initial=await browser.storage.local.get(["apiKey","model","visionApiKey","visionModel","textModels","visionModels"]);
 state.textModels=cleanModels(initial.textModels,[initial.model||defaults.textModels[0]]);
 state.visionModels=cleanModels(initial.visionModels,[initial.visionModel||defaults.visionModels[0]]);
 $("key").value=initial.apiKey||"";
 $("visionKey").value=initial.visionApiKey||"";
 const syncInputs=type=>{const inputs=$(type).querySelectorAll(".model-input");state[type]=Array.from(inputs,input=>input.value.trim())};
 function setStatus(message,error=false){$("status").textContent=message;$("status").style.color=error?"#ff9292":""}
 async function persistLists(message="Model order saved."){await browser.storage.local.set({textModels:state.textModels,visionModels:state.visionModels,model:state.textModels[0]||"",visionModel:state.visionModels[0]||""});setStatus(message)}
 function render(type){
  const root=$(type);root.replaceChildren();
  if(!state[type].length){const empty=document.createElement("p");empty.className="note";empty.textContent="No models added. Add a model below to enable this analysis.";root.append(empty);return}
  state[type].forEach((model,index)=>{
   const row=document.createElement("div");row.className="model-row";row.draggable=true;row.dataset.index=String(index);
   const drag=document.createElement("span");drag.className="drag-handle";drag.textContent="⠿";drag.setAttribute("aria-hidden","true");
   const input=document.createElement("input");input.className="model-input";input.type="text";input.value=model;input.spellcheck=false;input.autocomplete="off";input.setAttribute("aria-label","Model ID, priority "+(index+1));input.addEventListener("input",()=>{state[type][index]=input.value.trim()});
   const up=document.createElement("button");up.type="button";up.className="move-model";up.textContent="↑";up.title="Move up";up.setAttribute("aria-label","Move "+model+" up");up.disabled=index===0;up.addEventListener("click",()=>reorder(type,index,index-1));
   const down=document.createElement("button");down.type="button";down.className="move-model";down.textContent="↓";down.title="Move down";down.setAttribute("aria-label","Move "+model+" down");down.disabled=index===state[type].length-1;down.addEventListener("click",()=>reorder(type,index,index+1));
   const remove=document.createElement("button");remove.type="button";remove.className="remove-model";remove.textContent="×";remove.title="Remove model";remove.setAttribute("aria-label","Remove "+model);remove.addEventListener("click",async()=>{syncInputs(type);state[type].splice(index,1);render(type);await persistLists("Model removed from the priority list.")});
   row.append(drag,input,up,down,remove);
   row.addEventListener("dragstart",event=>{syncInputs(type);dragging={type,index};row.classList.add("dragging");event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",String(index))});
   row.addEventListener("dragend",()=>{row.classList.remove("dragging");dragging=null;root.querySelectorAll(".drop-target").forEach(el=>el.classList.remove("drop-target"))});
   row.addEventListener("dragover",event=>{if(dragging?.type===type){event.preventDefault();row.classList.add("drop-target")}});
   row.addEventListener("dragleave",()=>row.classList.remove("drop-target"));
   row.addEventListener("drop",async event=>{if(dragging?.type!==type)return;event.preventDefault();row.classList.remove("drop-target");const from=dragging.index;dragging=null;syncInputs(type);await reorder(type,from,index)});
   root.append(row);
  });
 }
 async function reorder(type,from,to){syncInputs(type);if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=state[type].length||to>=state[type].length||from===to)return;const [item]=state[type].splice(from,1);state[type].splice(to,0,item);render(type);await persistLists("Model priority updated.")}
 function addModel(type,inputId){const input=$(inputId),value=input.value.trim();if(!value){setStatus("Enter a model ID first.",true);input.focus();return}if(!validModel(value)){setStatus("Use a valid model ID (letters, numbers, dots, underscores or hyphens).",true);input.focus();return}syncInputs(type);if(state[type].some(x=>x.toLowerCase()===value.toLowerCase())){setStatus("That model is already in this list.",true);input.focus();return}state[type].push(value);input.value="";render(type);persistLists("Model added at the bottom of the priority list.")}
 $("addText").addEventListener("click",()=>addModel("textModels","addTextModel"));
 $("addVision").addEventListener("click",()=>addModel("visionModels","addVisionModel"));
 for(const [id,type,inputId] of [["addTextModel","textModels","addTextModel"],["addVisionModel","visionModels","addVisionModel"]])$(id).addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();addModel(type,inputId)}});
 document.querySelectorAll(".secret-toggle").forEach(button=>button.addEventListener("click",()=>{const input=$(button.dataset.target),show=input.type==="password";input.type=show?"text":"password";button.textContent=show?"Hide":"Show";button.setAttribute("aria-label",(show?"Hide ":"Show ")+(input.id==="key"?"text":"image")+" API key")}));
 $("save").addEventListener("click",async()=>{
  syncInputs("textModels");syncInputs("visionModels");
  for(const type of ["textModels","visionModels"]){const seen=new Set();for(const model of state[type]){if(!validModel(model)){setStatus("One of the model IDs is invalid. Check the highlighted list.",true);const bad=$(type).querySelector(".model-input:not(:placeholder-shown)");bad?.focus();return}if(seen.has(model.toLowerCase())){setStatus("Remove duplicate model IDs from each list before saving.",true);return}seen.add(model.toLowerCase())}}
  $("save").disabled=true;setStatus("Saving settings…");
  try{await browser.storage.local.set({provider:"gemini",apiKey:$("key").value.trim(),visionApiKey:$("visionKey").value.trim(),textModels:state.textModels,visionModels:state.visionModels,model:state.textModels[0]||"",visionModel:state.visionModels[0]||""});setStatus("API keys and model priority lists saved locally.");}
  catch(error){setStatus(error.message||"Could not save settings.",true)}
  finally{$("save").disabled=false}
 });
 render("textModels");render("visionModels");
 // Persist the migrated list shape while retaining the legacy first-model fields.
 await browser.storage.local.set({textModels:state.textModels,visionModels:state.visionModels,model:state.textModels[0]||"",visionModel:state.visionModels[0]||""});

 async function renderUsage(){
  const data=await browser.storage.local.get(["geminiUsageStatsV1","textModels","visionModels","model","visionModel"]),stats=data.geminiUsageStatsV1||{},root=$("usageStats");root.replaceChildren();
  const configured=[...(Array.isArray(data.textModels)?data.textModels:[data.model||""]).filter(Boolean).map(model=>["text:"+model,"text",model]),...(Array.isArray(data.visionModels)?data.visionModels:[data.visionModel||""]).filter(Boolean).map(model=>["vision:"+model,"vision",model])];
  const keys=new Set(configured.map(x=>x[0]));for(const key of Object.keys(stats))keys.add(key);
  const entries=[...keys].map(key=>{const split=key.indexOf(":");const kind=key.slice(0,split),model=key.slice(split+1);return [key,kind,model,stats[key]||{}]}).sort((a,b)=>a[1].localeCompare(b[1])||a[2].localeCompare(b[2]));
  if(!entries.length){const empty=document.createElement("p");empty.className="usage-empty";empty.textContent="Add a model above to see its usage here. Token counts begin after its first successful request.";root.append(empty);return}
  for(const [key,kind,model,value] of entries){const row=document.createElement("div");row.className="usage-row";const details=document.createElement("div");const title=document.createElement("strong");title.textContent=(kind==="vision"?"Image · ":"Text · ")+(model||"Unknown model");const meta=document.createElement("small");meta.textContent=(value.requests||0)+" successful requests · input "+(value.inputTokens||0).toLocaleString()+" · output "+(value.outputTokens||0).toLocaleString();details.append(title,meta);const total=document.createElement("strong");total.className="usage-total";total.textContent=(value.totalTokens||0).toLocaleString();const caption=document.createElement("small");caption.textContent="total tokens";caption.style.textAlign="right";const right=document.createElement("div");right.append(total,caption);row.append(details,right);root.append(row)}
 }
 $("refreshUsage")?.addEventListener("click",renderUsage);
 browser.storage.onChanged?.addListener((changes,area)=>{if(area==="local"&&changes.geminiUsageStatsV1)renderUsage()});

 renderUsage();
})();