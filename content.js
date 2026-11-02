/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
(() => {
  if(globalThis.__instaMindContentListenerInstalled)return;
  globalThis.__instaMindContentListenerInstalled=true;
  const base="https://www.instagram.com/";
  const APP_ID="936619743392459";
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function username(href){
    try{const u=new URL(href,location.origin),p=u.pathname.split("/").filter(Boolean);if(u.origin!==location.origin||p.length!==1)return null;const s=p[0],reserved=["accounts","about","explore","direct","reels","stories","p","developer","legal","web"];return reserved.includes(s.toLowerCase())||! /^[a-zA-Z0-9._]{1,30}$/.test(s)?null:s}catch(_){return null}
  }
  function collect(){
    const map=new Map();
    document.querySelectorAll("a[href]").forEach(a=>{const name=username(a.getAttribute("href"));if(!name)return;const r=a.getBoundingClientRect();if(!r.width||!r.height)return;const card=a.closest("div")||a,img=a.querySelector("img")||card.querySelector("img"),text=(card.innerText||a.innerText||"").trim().replace(/\s+/g," ").slice(0,240);if(!map.has(name))map.set(name,{username:name,profileUrl:base+encodeURIComponent(name)+"/",displayText:text,avatarAlt:img?.alt||"",avatarUrl:img?.currentSrc||img?.src||"",collectedAt:new Date().toISOString()})});
    return [...map.values()];
  }
  async function igRequest(path){
    const response=await fetch(base+"api/v1/"+path,{credentials:"same-origin",headers:{"x-ig-app-id":APP_ID,"x-requested-with":"XMLHttpRequest","accept":"application/json"}});
    if(response.status===429)throw Error("Instagram rate-limited the scan (HTTP 429). Wait a while before retrying.");
    if(!response.ok)throw Error("Instagram scan request failed (HTTP "+response.status+"). Reload Instagram and make sure you're signed in.");
    const data=await response.json();if(data.status&&data.status!=="ok")throw Error(data.message||"Instagram rejected the scan request.");return data;
  }
  async function currentUserId(){
    const data=await igRequest("accounts/current_user/?");
    const id=data.user?.pk||data.user?.id||data.pk||data.id;if(!id)throw Error("Could not identify the signed-in Instagram account. Open Instagram and sign in again.");return String(id);
  }
  async function collectRelationship(kind,viewerId){
    const results=[],seen=new Set();let maxId=null,pages=0;
    do{
      const query=new URLSearchParams({count:"200"});if(maxId)query.set("max_id",maxId);
      const data=await igRequest("friendships/"+viewerId+"/"+kind+"/?"+query.toString());
      const users=Array.isArray(data.users)?data.users:[];
      for(const u of users){const id=String(u.pk||u.id||"");if(!id||seen.has(id))continue;seen.add(id);if(u.username)results.push({id,username:u.username,profileUrl:base+encodeURIComponent(u.username)+"/",displayText:u.full_name||"",avatarUrl:u.profile_pic_url||"",collectedAt:new Date().toISOString()})}
      const next=data.next_max_id||data.next_max_id_str||null;pages++;browser.runtime.sendMessage({type:"FOLLOWBACK_SCAN_PROGRESS",kind,done:results.length,page:pages}).catch(()=>{});
      if(!next||next===maxId||!users.length)break;maxId=String(next);await sleep(450);
      if(pages>10000)throw Error("Instagram pagination safety limit reached.");
    }while(maxId);
    return results;
  }
  async function scanFollowBack(){
    browser.runtime.sendMessage({type:"FOLLOWBACK_SCAN_PROGRESS",kind:"starting",done:0,page:0}).catch(()=>{});
    const viewerId=await currentUserId();
    const following=await collectRelationship("following",viewerId);
    browser.runtime.sendMessage({type:"FOLLOWBACK_SCAN_PROGRESS",kind:"followers",done:0,page:0}).catch(()=>{});
    const followers=await collectRelationship("followers",viewerId);
    const followerIds=new Set(followers.map(x=>x.id));
    const followerNames=new Set(followers.map(x=>String(x.username||"").toLowerCase()));
    const accounts=following.map(x=>({...x,followBackStatus:(followerIds.has(x.id)||followerNames.has(String(x.username||"").toLowerCase()))?"follows_you":"doesnt_follow_you",followingStatus:"following",relationshipTypes:["following"],status:"review"}));
    return {ok:true,accounts,followingCount:following.length,followersCount:followers.length,confirmed:true,scannedAt:new Date().toISOString()};
  }
  function profile(){
    const parts=location.pathname.split("/").filter(Boolean),name=parts.length===1?username(location.pathname):null;if(!name)return null;
    const main=document.querySelector("main")||document.body,meta=document.querySelector('meta[property="og:description"]'),visibleText=(main.innerText||"").trim().slice(0,12000);
    const notFoundPatterns=[/sorry, this page (?:isn't|is not) available/i,/the link you followed may be broken, or the page may have been removed/i,/this page isn't available/i,/bu sayfa kullanılamıyor/i,/bu sayfa mevcut değil/i,/این صفحه در دسترس نیست/i,/صفحه مورد نظر در دسترس نیست/i];
    const pageEvidence=[visibleText,meta?.content||"",document.title].join("\\n");
    if(notFoundPatterns.some(pattern=>pattern.test(pageEvidence)))return {username:name,profileUrl:base+encodeURIComponent(name)+"/",profileStatus:"not_found",notFoundEvidence:"Instagram displayed an explicit unavailable or not-found message.",collectedAt:new Date().toISOString()};
    const imgs=[...main.querySelectorAll("img")].filter(i=>{const r=i.getBoundingClientRect();return r.width>30&&r.height>30}).slice(0,24).map(i=>({alt:(i.alt||"").slice(0,240),caption:(i.getAttribute("aria-label")||"").slice(0,160)}));
    const followBackMatch=visibleText.match(/\bFollows you\b|Seni takip ediyor|شما را دنبال می‌کند|دنبال‌کننده شماست/i);
    const posts=new Map();
    main.querySelectorAll('a[href*="/p/"],a[href*="/reel/"]').forEach(a=>{const href=a.href;const img=a.querySelector("img");if(!img||!img.currentSrc||!/^https:\/\//i.test(img.currentSrc))return;if(!posts.has(href))posts.set(href,{url:img.currentSrc,postUrl:href,alt:(img.alt||"").slice(0,240)})});
    const candidates=[...posts.values()];for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
    const sample=candidates.slice(0,2);
    return {username:name,profileUrl:base+encodeURIComponent(name)+"/",profileStatus:(visibleText.length>20||!!meta?.content||imgs.length||sample.length)?"available":"unavailable",pageTitle:document.title,metaDescription:meta?.content||"",visibleText,visibleImageDescriptions:imgs,followsYouEvidence:followBackMatch?.[0]||null,visiblePostImages:sample,collectedAt:new Date().toISOString()};
  }
  browser.runtime.onMessage.addListener(msg=>{if(msg?.type==="COLLECT_FOLLOWING")return Promise.resolve({ok:true,accounts:collect(),url:location.href});if(msg?.type==="READ_PROFILE")return Promise.resolve({ok:true,profile:profile(),url:location.href});if(msg?.type==="SCAN_FOLLOWBACK")return scanFollowBack();return undefined});
})();