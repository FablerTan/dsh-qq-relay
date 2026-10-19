window.__ModuleLoader__.load({
	id: "dsh-qq-relay",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		"use strict";Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const t=require("react/jsx-runtime"),d=require("react");function de({tone:e}){return t.jsx("span",{className:"qqr-dot","data-tone":e,"aria-hidden":"true"})}function v(e){return t.jsx("button",{type:"button",className:"qqr-btn","data-variant":e.variant??"ghost",onClick:e.onClick,disabled:e.disabled===!0,title:e.title,children:e.children})}function N({children:e}){return t.jsx("div",{className:"qqr-card",children:e})}function j(e){return t.jsxs("div",{className:"qqr-row",children:[t.jsxs("div",{className:"qqr-row-text",children:[t.jsx("span",{className:"qqr-label",children:e.label}),e.hint!==void 0?t.jsx("span",{className:"qqr-hint",children:e.hint}):null]}),t.jsx("div",{className:"qqr-control",children:e.children})]})}function S({children:e}){return t.jsx("div",{className:"qqr-block",children:e})}function R(e){return t.jsx("p",{className:"qqr-line","data-tone":e.tone??"muted",role:e.role,children:e.children})}function ue({line:e}){return t.jsxs("span",{className:"qqr-status",children:[t.jsx(de,{tone:e.tone}),t.jsx("span",{children:e.text})]})}function y(e){return t.jsx("input",{className:"qqr-input",type:e.type??"text",value:e.value,placeholder:e.placeholder,inputMode:e.inputMode,autoComplete:e.autoComplete??"off",spellCheck:!1,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)}})}const _="dsh-qq-relay-client-style",pe=`/* dsh-qq-relay 配置页样式：全部走宿主 ui-theme 的 --dsw-* 语义 token，
		 * 不写字面色值、不定义主题分支；几何遵循 DSH 圆角规范（控件 R12 / 卡片 R20）。 */

		.qqr-root {
		  display: flex;
		  flex-direction: column;
		  gap: 12px;
		  min-width: 0;
		  max-width: 760px;
		  color: var(--dsw-alias-label-primary);
		  font-size: 13px;
		  line-height: 20px;
		}

		.qqr-head {
		  display: flex;
		  align-items: center;
		  gap: 12px;
		  flex-wrap: wrap;
		}

		.qqr-status {
		  display: inline-flex;
		  align-items: center;
		  gap: 8px;
		  min-width: 0;
		}

		.qqr-dot {
		  flex: none;
		  width: 8px;
		  height: 8px;
		  border-radius: 50%;
		  corner-shape: round;
		  background: var(--dsw-alias-state-idle-primary);
		}

		.qqr-dot[data-tone='ok'] { background: var(--dsw-alias-state-success-primary); }
		.qqr-dot[data-tone='warn'] { background: var(--dsw-alias-state-warn-primary); }
		.qqr-dot[data-tone='error'] { background: var(--dsw-alias-state-error-primary); }

		.qqr-actions {
		  display: flex;
		  align-items: center;
		  gap: 8px;
		  margin-left: auto;
		  flex-wrap: wrap;
		}

		.qqr-btn {
		  box-sizing: border-box;
		  display: inline-flex;
		  align-items: center;
		  justify-content: center;
		  gap: 4px;
		  height: 28px;
		  padding: 0 10px;
		  border: 0;
		  border-radius: var(--dsw-radius-sm);
		  background: transparent;
		  color: var(--dsw-alias-label-primary);
		  font: inherit;
		  font-size: 12px;
		  line-height: 18px;
		  cursor: pointer;
		  transition:
		    background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out),
		    color var(--ds-transition-duration-fast) var(--ds-ease-in-out);
		}

		.qqr-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
		.qqr-btn:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); }
		.qqr-btn:disabled { opacity: 0.4; cursor: not-allowed; }

		.qqr-btn[data-variant='primary'] {
		  background: var(--dsw-alias-button-primary-fill);
		  color: var(--dsw-alias-label-primary-foreground);
		}

		.qqr-btn[data-variant='primary']:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }

		.qqr-btn[data-variant='outline'] { border: 0.5px solid var(--dsw-alias-border-l3); }

		.qqr-btn:focus-visible {
		  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
		  outline-offset: 2px;
		}

		.qqr-tabs {
		  display: flex;
		  align-items: flex-end;
		  gap: 22px;
		  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
		  margin-top: 2px;
		}

		.qqr-tab {
		  position: relative;
		  border: 0;
		  padding: 7px 1px 9px;
		  background: transparent;
		  color: var(--dsw-alias-label-tertiary);
		  font: inherit;
		  font-size: 13px;
		  line-height: 20px;
		  cursor: pointer;
		}

		.qqr-tab:hover,
		.qqr-tab[data-active='true'] { color: var(--dsw-alias-label-primary); }

		.qqr-tab[data-active='true']::after {
		  position: absolute;
		  right: 0;
		  bottom: -1px;
		  left: 0;
		  height: 2px;
		  border-radius: 2px 2px 0 0;
		  background: var(--dsw-alias-label-primary);
		  content: '';
		}

		.qqr-tab:focus-visible {
		  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
		  outline-offset: 2px;
		  border-radius: 2px;
		  color: var(--dsw-alias-label-primary);
		}

		.qqr-panel {
		  display: flex;
		  flex-direction: column;
		  gap: 12px;
		  min-width: 0;
		}

		.qqr-card {
		  display: flex;
		  flex-direction: column;
		  min-width: 0;
		  border-radius: var(--dsw-radius-xl);
		  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
		  background: var(--dsw-alias-settings-card-fill);
		  overflow: hidden;
		}

		.qqr-row {
		  display: grid;
		  grid-template-columns: minmax(0, 1fr) minmax(0, 280px);
		  gap: 16px;
		  align-items: start;
		  padding: 10px 14px;
		}

		.qqr-row + .qqr-row { border-top: 0.5px solid var(--dsw-alias-border-l1); }

		.qqr-row-text {
		  display: flex;
		  flex-direction: column;
		  gap: 2px;
		  min-width: 0;
		}

		.qqr-label { color: var(--dsw-alias-label-primary); }

		.qqr-hint,
		.qqr-muted {
		  color: var(--dsw-alias-label-tertiary);
		  font-size: 12px;
		  line-height: 18px;
		}

		.qqr-control { min-width: 0; }

		.qqr-input {
		  box-sizing: border-box;
		  width: 100%;
		  height: 32px;
		  padding: 0 10px;
		  border: 0.5px solid var(--dsw-alias-border-l4);
		  border-radius: var(--dsw-radius-md);
		  background: var(--dsw-alias-bg-layer-1);
		  color: var(--dsw-alias-label-primary);
		  font: inherit;
		  font-size: 13px;
		  line-height: 20px;
		}

		.qqr-input::placeholder { color: var(--dsw-alias-label-dimmed); }

		.qqr-input:focus {
		  outline: none;
		  border-color: var(--dsw-alias-state-business-primary);
		}

		.qqr-block {
		  display: flex;
		  flex-direction: column;
		  gap: 8px;
		  padding: 12px 14px;
		  min-width: 0;
		}

		.qqr-block + .qqr-block { border-top: 0.5px solid var(--dsw-alias-border-l1); }

		.qqr-headline {
		  display: flex;
		  align-items: center;
		  gap: 8px;
		  flex-wrap: wrap;
		}

		.qqr-subhead {
		  margin: 0;
		  font-size: 13px;
		  line-height: 20px;
		  font-weight: 500;
		  color: var(--dsw-alias-label-primary);
		}

		.qqr-row-actions {
		  display: flex;
		  gap: 6px;
		  flex-wrap: wrap;
		}

		.qqr-scroll {
		  min-width: 0;
		  overflow-x: auto;
		}

		.qqr-table {
		  width: 100%;
		  border-collapse: collapse;
		  font-size: 12px;
		  line-height: 18px;
		}

		.qqr-th {
		  padding: 6px 8px;
		  text-align: left;
		  font-weight: 500;
		  color: var(--dsw-alias-label-tertiary);
		  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
		  white-space: nowrap;
		}

		.qqr-td {
		  padding: 6px 8px;
		  border-top: 0.5px solid var(--dsw-alias-border-l1);
		  vertical-align: middle;
		}

		.qqr-table tbody tr:first-child .qqr-td { border-top: 0; }

		.qqr-mono {
		  font-family: var(--ds-font-family-code);
		  font-size: 11px;
		  line-height: 16px;
		  color: var(--dsw-alias-label-tertiary);
		  word-break: break-all;
		}

		.qqr-msg {
		  display: flex;
		  flex-direction: column;
		  gap: 2px;
		  padding: 8px 0;
		  border-top: 0.5px solid var(--dsw-alias-border-l1);
		}

		.qqr-msg:first-child { border-top: 0; }

		.qqr-msg-meta {
		  color: var(--dsw-alias-label-tertiary);
		  font-size: 12px;
		  line-height: 18px;
		}

		.qqr-msg-text {
		  white-space: pre-wrap;
		  word-break: break-word;
		}

		.qqr-line { margin: 0; }
		.qqr-line[data-tone='error'] { color: var(--dsw-alias-state-error-primary); }
		.qqr-line[data-tone='warn'] { color: var(--dsw-alias-state-warn-primary); }
		.qqr-line[data-tone='ok'] { color: var(--dsw-alias-state-success-primary); }

		.qqr-list {
		  margin: 0;
		  padding-left: 1.1rem;
		}

		.qqr-footer {
		  margin: 0;
		  color: var(--dsw-alias-label-tertiary);
		  font-size: 12px;
		  line-height: 18px;
		}

		.qqr-empty {
		  margin: 0;
		  color: var(--dsw-alias-label-tertiary);
		}

		.qqr-root code {
		  padding: 1px 4px;
		  border-radius: var(--dsw-radius-xs);
		  background: var(--dsw-alias-markdown-inline-code);
		  color: var(--dsw-alias-label-secondary);
		  font-family: var(--ds-font-family-code);
		  font-size: 11px;
		  line-height: 16px;
		}

		.qqr-inline-actions {
		  display: flex;
		  gap: 6px;
		  flex-wrap: wrap;
		  margin-left: auto;
		}

		.qqr-mono-block {
		  display: block;
		}

		.qqr-col-dir {
		  min-width: 200px;
		}

		@media (max-width: 680px) {
		  .qqr-row { grid-template-columns: minmax(0, 1fr); }
		}
		`;function he(){d.useEffect(()=>{if(document.getElementById(_)!==null)return;const e=document.createElement("style");return e.id=_,e.textContent=pe,document.head.appendChild(e),()=>{e.remove()}},[])}const ge="/dsh-qq-relay/api/status",fe="/dsh-qq-relay/api/config",me="/dsh-qq-relay/api/reconnect",be="/dsh-qq-relay/api/rebind",qe="/dsh-qq-relay/api/cleanup",xe="/dsh-qq-relay/api/messages",ye="/dsh-qq-relay/api/mapping/delete",je="/dsh-qq-relay/api/mapping/clear";function h(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function ve(e){return Array.isArray(e)?e.filter(h).map(s=>({groupId:typeof s.groupId=="number"?s.groupId:0,pending:typeof s.pending=="number"?s.pending:0,lastBotSpeakAt:typeof s.lastBotSpeakAt=="number"?s.lastBotSpeakAt:0,lastReplyAt:typeof s.lastReplyAt=="number"?s.lastReplyAt:0,lastUserMessageAt:typeof s.lastUserMessageAt=="number"?s.lastUserMessageAt:0,cooldownUntil:typeof s.cooldownUntil=="number"?s.cooldownUntil:0,evaluating:s.evaluating===!0,dshBusy:s.dshBusy===!0})):[]}function we(e){return Array.isArray(e)?e.filter(h).map(s=>({messageId:typeof s.messageId=="string"?s.messageId:"",time:typeof s.time=="number"?s.time:0,name:typeof s.name=="string"?s.name:"",text:typeof s.text=="string"?s.text:"",mentionsSelf:s.mentionsSelf===!0,replyToId:typeof s.replyToId=="string"?s.replyToId:"",media:Array.isArray(s.media)?s.media.filter(h).map(r=>({kind:typeof r.kind=="string"?r.kind:"",status:typeof r.status=="string"?r.status:"",path:typeof r.path=="string"?r.path:""})):[]})):[]}function z(e){if(!h(e))return null;const s=h(e.config)?e.config:{},r=h(e.login)?e.login:null,n=h(e.lock)?e.lock:null,i=Array.isArray(e.mappings)?e.mappings.filter(h):[];return{plugin:typeof e.plugin=="string"?e.plugin:"dsh-qq-relay",started:e.started===!0,connected:e.connected===!0,login:r===null?null:{userId:typeof r.userId=="number"?r.userId:0,nickname:typeof r.nickname=="string"?r.nickname:""},problems:Array.isArray(e.problems)?e.problems.filter(a=>typeof a=="string"):[],lock:n===null?null:{pid:typeof n.pid=="number"?n.pid:0,startedAt:typeof n.startedAt=="number"?n.startedAt:0,host:typeof n.host=="string"?n.host:void 0},config:{wsUrl:typeof s.wsUrl=="string"?s.wsUrl:"",selfId:typeof s.selfId=="number"?s.selfId:0,groups:Array.isArray(s.groups)?s.groups.filter(a=>typeof a=="number"):[],workspace:typeof s.workspace=="string"?s.workspace:"",groupWorkspaces:h(s.groupWorkspaces)?Object.fromEntries(Object.entries(s.groupWorkspaces).filter(([a,o])=>/^\d+$/u.test(a)&&typeof o=="string"&&o!=="").map(([a,o])=>[a,o])):{},chatRetentionDays:typeof s.chatRetentionDays=="number"?s.chatRetentionDays:0,gate:h(s.gate)?{debounceMs:typeof s.gate.debounceMs=="number"?s.gate.debounceMs:5e3,fastMinReplyIntervalMs:typeof s.gate.fastMinReplyIntervalMs=="number"?s.gate.fastMinReplyIntervalMs:45e3,jevThreshold:typeof s.gate.jevThreshold=="number"?s.gate.jevThreshold:.7}:{debounceMs:5e3,fastMinReplyIntervalMs:45e3,jevThreshold:.7},gateSupported:h(s.gate),sessionTitle:typeof s.sessionTitle=="string"?s.sessionTitle:"",replyChunkSize:typeof s.replyChunkSize=="number"?s.replyChunkSize:0,commandPrefixes:Array.isArray(s.commandPrefixes)?s.commandPrefixes.filter(a=>typeof a=="string"):[],accessTokenConfigured:s.accessTokenConfigured===!0,accessTokenSource:s.accessTokenSource==="settings"?"settings":"profile"},gate:h(e.gate)?{enabled:e.gate.enabled===!0,classifier:typeof e.gate.classifier=="string"?e.gate.classifier:null,model:typeof e.gate.model=="string"?e.gate.model:"",threshold:typeof e.gate.threshold=="number"?e.gate.threshold:0,slowTimer:typeof e.gate.slowTimer=="number"?e.gate.slowTimer:0,pendingMessages:typeof e.gate.pendingMessages=="number"?e.gate.pendingMessages:0,pendingGroups:typeof e.gate.pendingGroups=="number"?e.gate.pendingGroups:0,timers:typeof e.gate.timers=="number"?e.gate.timers:0,queue:typeof e.gate.queue=="number"?e.gate.queue:0,sendQueue:typeof e.gate.sendQueue=="number"?e.gate.sendQueue:0,groups:ve(e.gate.groups)}:null,mappings:i.map(a=>({groupId:typeof a.groupId=="number"?a.groupId:0,sessionId:typeof a.sessionId=="string"?a.sessionId:"",title:typeof a.title=="string"?a.title:"",workspacePath:typeof a.workspacePath=="string"?a.workspacePath:"",createdAt:typeof a.createdAt=="number"?a.createdAt:0}))}}async function D(e,s,r){let n;try{n=await e(s,{cache:"no-store",...r})}catch(o){return{ok:!1,error:{code:"NETWORK",message:"连不上 host"+(o instanceof Error&&o.message!==""?"："+o.message:"")}}}let i=null;try{i=await n.json()}catch{i=null}if(h(i)&&i.ok===!0)return{ok:!0,value:i.value};const a=h(i)&&h(i.error)?i.error:null;return{ok:!1,error:{code:a!==null&&typeof a.code=="string"?a.code:"HTTP_"+String(n.status),message:a!==null&&typeof a.message=="string"&&a.message!==""?a.message:"请求失败（HTTP "+String(n.status)+"）。"}}}function L(){return{ok:!1,error:{code:"BAD_PAYLOAD",message:"host 返回了无法识别的数据。"}}}function ke(e){const s=e.fetch;async function r(i,a){const o=await D(s,i,a);if(!o.ok)return o;const u=z(o.value);return u!==null?{ok:!0,value:u}:L()}const n=i=>({method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(i)});return{getStatus:()=>r(ge),saveConfig:i=>r(fe,n(i)),reconnect:()=>r(me,{method:"POST"}),rebind:i=>r(be,n({groupId:i})),async cleanup(i){const a=await D(s,qe,n({days:i}));if(!a.ok)return a;const o=a.value,u=h(o)?z(o.status):null,g=h(o)&&h(o.cleanup)?o.cleanup:null;return u===null||g===null?L():{ok:!0,value:{cleanup:{days:typeof g.days=="number"?g.days:i,chat:typeof g.chat=="number"?g.chat:0,media:typeof g.media=="number"?g.media:0,at:typeof g.at=="number"?g.at:0},status:u}}},async messages(i,a){const o=new URLSearchParams({groupId:String(i)});typeof a=="number"&&Number.isFinite(a)&&o.set("limit",String(a));const u=await D(s,xe+"?"+o.toString());return u.ok?h(u.value)?{ok:!0,value:{groupId:typeof u.value.groupId=="number"?u.value.groupId:i,limit:typeof u.value.limit=="number"?u.value.limit:0,windowMs:typeof u.value.windowMs=="number"?u.value.windowMs:0,messages:we(u.value.messages)}}:L():u},async deleteMapping(i){const a=await D(s,ye,n({groupId:i}));if(!a.ok)return a;const o=a.value,u=h(o)?z(o.status):null,g=h(o)&&h(o.mapping)?o.mapping:null;return u===null||g===null?L():{ok:!0,value:{mapping:{groupId:typeof g.groupId=="number"?g.groupId:i,removed:g.removed===!0},status:u}}},async clearMappings(){const i=await D(s,je,{method:"POST"});if(!i.ok)return i;const a=i.value,o=h(a)?z(a.status):null,u=h(a)&&h(a.mappings)?a.mappings:null;return o===null||u===null?L():{ok:!0,value:{mappings:{cleared:typeof u.cleared=="number"?u.cleared:0},status:o}}}}}function Se(){return{wsUrl:"",accessToken:"",selfId:"",groups:"",workspace:"",chatRetentionDays:"",gateDebounce:"",gateFastMinReplyInterval:"",gateJevThreshold:"",sessionTitle:"",replyChunkSize:"",commandPrefixes:""}}function O(e){return{wsUrl:e.wsUrl,accessToken:"",selfId:e.selfId>0?String(e.selfId):"",groups:e.groups.join(", "),workspace:e.workspace,chatRetentionDays:String(e.chatRetentionDays),gateDebounce:H(e.gate.debounceMs),gateFastMinReplyInterval:H(e.gate.fastMinReplyIntervalMs),gateJevThreshold:String(e.gate.jevThreshold),sessionTitle:e.sessionTitle,replyChunkSize:e.replyChunkSize>0?String(e.replyChunkSize):"",commandPrefixes:e.commandPrefixes.join(", ")}}function H(e){return!Number.isFinite(e)||e<=0?"0s":e%(3600*1e3)===0?String(e/(3600*1e3))+"h":e%(60*1e3)===0?String(e/(60*1e3))+"m":e%1e3===0?String(e/1e3)+"s":String(e)+"ms"}function Ne(e,s=Date.now()){if(!Number.isFinite(e)||e<=0)return"";const r=Math.max(0,s-e);return r<60*1e3?"刚刚":r<3600*1e3?Math.floor(r/(60*1e3))+" 分钟前":r<1440*60*1e3?Math.floor(r/(3600*1e3))+" 小时前":Math.floor(r/(1440*60*1e3))+" 天前"}function W(e){if(!Number.isFinite(e)||e<=0)return"--:--:--";const s=new Date(e),r=n=>String(n).padStart(2,"0");return r(s.getHours())+":"+r(s.getMinutes())+":"+r(s.getSeconds())}function B(e){const s=/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/iu.exec(e.trim());if(s===null)return null;const n={ms:1,s:1e3,m:60*1e3,h:3600*1e3}[s[2].toLowerCase()];if(n===void 0)return null;const i=Number(s[1]);return!Number.isFinite(i)||i<0?null:Math.round(i*n)}function Ie(e){return e.split(/[,，\s]+/u).map(s=>s.trim()).filter(s=>s!=="")}function Te(e){const s=[],r=[];for(const n of Ie(e)){if(!/^\d+$/u.test(n)){s.push("群号必须是数字："+n);continue}const i=Number(n);if(!Number.isSafeInteger(i)||i<=0){s.push("群号必须是正整数："+n);continue}r.includes(i)||r.push(i)}return s.length>0?{ok:!1,problems:s}:{ok:!0,value:r}}function Me(e){return{ok:!0,value:e.split(/[,，]/u).map(r=>r.trim()).filter(r=>r!=="")}}function Ce(e){const s=[],r={},n=e.wsUrl.trim();n===""?s.push("wsUrl 必填"):r.wsUrl=n,e.accessToken.trim()!==""&&(r.accessToken=e.accessToken.trim());const i=e.selfId.trim();!/^\d+$/u.test(i)||Number(i)<=0?s.push("selfId 必须是正整数"):r.selfId=Number(i);const a=Te(e.groups);a.ok?r.groups=a.value:s.push(...a.problems);const o=e.workspace.trim();o===""?s.push("workspace 必填"):r.workspace=o;const u=e.chatRetentionDays.trim(),g=u===""?"0":u,m=Number(g);!/^\d+$/u.test(g)||!Number.isInteger(m)||!(m===0||m>=7&&m<=3650)?s.push("聊天记录保留天数必须是 0（永不自动删除）或 7..3650 的整数"):r.chatRetentionDays=m;const U=e.sessionTitle.trim();U===""?s.push("sessionTitle 必填"):r.sessionTitle=U;const f=e.replyChunkSize.trim(),C=Number(f);!/^\d+$/u.test(f)||!Number.isInteger(C)||C<100||C>2e4?s.push("replyChunkSize 必须是 100..20000 的整数"):r.replyChunkSize=C;const q=Me(e.commandPrefixes);r.commandPrefixes=q.value;const A={},E=e.gateDebounce.trim(),M=B(E);M===null||M>60*1e3?s.push("去抖窗口必须是 0..60s 的时长（如 3s / 500ms）"):A.debounce=E;const w=e.gateFastMinReplyInterval.trim(),b=B(w);b===null||b>3600*1e3?s.push("最小发言间隔必须是 0..60m 的时长（如 10s / 45s）"):A.fastMinReplyInterval=w;const k=e.gateJevThreshold.trim(),P=Number(k);return k===""||!Number.isFinite(P)||P<0||P>1?s.push("jev 阈值必须是 0..1 的数字（如 0.7）"):A.jevThreshold=P,r.gate=A,s.length>0?{ok:!1,problems:s}:{ok:!0,value:r}}function Ae(e,s){const r=O(s);return Object.keys(r).some(n=>e[n]!==r[n])}function J(e){const s=new Map,r=n=>{let i=s.get(n);return i===void 0&&(i={groupId:n,sessionId:"",sessionTitle:"",projectDir:""},s.set(n,i)),i};for(const n of e.config.groups)r(n);for(const[n,i]of Object.entries(e.config.groupWorkspaces)){const a=Number(n);!Number.isSafeInteger(a)||a<=0||(r(a).projectDir=i)}for(const n of e.mappings){const i=r(n.groupId);i.sessionId=n.sessionId,i.sessionTitle=n.title}return[...s.values()].sort((n,i)=>n.groupId-i.groupId)}function Pe(e){const s={};for(const r of e){const n=r.projectDir.trim();n!==""&&(s[String(r.groupId)]=n)}return s}function Re(e,s){const r=new Map(J(s).map(n=>[n.groupId,n.projectDir]));return e.some(n=>(r.get(n.groupId)??"")!==n.projectDir.trim())}const I=ke({fetch:(e,s)=>globalThis.fetch(e,s)}),De=[{id:"connection",label:"连接"},{id:"project",label:"项目"},{id:"behavior",label:"行为"},{id:"records",label:"记录"}];function T(e){return e.ok?"":e.error.message}function Le(e){if(e===null)return{tone:"muted",text:"加载中…"};if(!e.started)return e.lock!==null?{tone:"warn",text:"未启动：另一个实例（pid "+String(e.lock.pid)+"）正在运行"}:e.problems.length>0?{tone:"error",text:"未启动：配置待补全"}:{tone:"muted",text:"未启动（等待宿主就绪）"};if(e.connected){const s=e.login;return{tone:"ok",text:"已连接（"+(s!==null&&(s.nickname!==""||s.userId>0)?"QQ "+(s.nickname!==""?s.nickname:String(s.userId)):String(e.config.selfId))+"）"}}return{tone:"warn",text:"连接中…（断线自动重连）"}}function Ue(e){return e===null?"保存后生效":e.config.accessTokenConfigured?"已配置（来源："+(e.config.accessTokenSource==="settings"?"配置页保存值":"profile patch / 环境变量")+"）；留空表示不修改":"未配置；建议在 profile patch 里用 !!js 从环境变量读取"}function Ee(e){if(e===null)return{tone:"muted",text:"闸门状态读取中…"};if(!e.config.gateSupported)return{tone:"warn",text:"宿主还是旧版本（未加载支持闸门配置的版本）：下面参数暂时不会生效，重启该 profile 的 GUI 后再保存。"};const s=e.gate;return s===null?{tone:"muted",text:"闸门状态读取中…"}:s.enabled?s.classifier===null?{tone:"warn",text:"闸门已开启，但分类器未就绪：普通群消息不会接话（@ / 引用 / 命令仍直通）。"}:{tone:"ok",text:"闸门已开启 · 分类器 "+s.classifier+" · 阈值 "+String(s.threshold)+"；保存后立即重建闸门。"}:{tone:"muted",text:"闸门当前关闭（gate.enabled 来自 profile patch）：下面的参数会保存，开启后才生效。"}}const G={groupId:null,items:[],busy:!1,error:null,windowMs:0};function Fe(){const[e,s]=d.useState(null),[r,n]=d.useState(Se),[i,a]=d.useState([]),[o,u]=d.useState(!0),[g,m]=d.useState(!1),[U,f]=d.useState(null),[C,q]=d.useState(null),[A,E]=d.useState("connection"),[M,w]=d.useState(G),b=d.useCallback((l,p)=>{s(l),p&&(n(O(l.config)),a(J(l)))},[]),k=d.useCallback(async(l,p=!0)=>{const c=await I.getStatus();u(!1),c.ok?(b(c.value,l),l&&p&&f(null)):p&&f(T(c))},[b]);d.useEffect(()=>{k(!0)},[k]),d.useEffect(()=>{const l=setInterval(()=>{k(!1,!1)},5e3);return()=>clearInterval(l)},[k]);const P=d.useCallback((l,p)=>{n(c=>({...c,[l]:p}))},[]),$=d.useCallback((l,p)=>{a(c=>c.map(x=>x.groupId===l?{...x,projectDir:p}:x))},[]),Y=d.useCallback(()=>{k(!0)},[k]),K=d.useCallback(async()=>{const l=Ce(r);if(!l.ok){q(null),f(l.problems.join("；"));return}const p=Pe(i);m(!0),f(null),q(null);const c=await I.saveConfig({...l.value,groupWorkspaces:p});m(!1),c.ok?(b(c.value,!0),q("已保存并重建连接。")):f(T(c))},[r,i,b]),V=d.useCallback(async()=>{m(!0),f(null),q(null);const l=await I.reconnect();m(!1),l.ok?(b(l.value,!1),q("已请求重新连接。")):f(T(l))},[b]),X=d.useCallback(async l=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("重新绑定群 "+String(l)+`？
		会删除该群现有会话映射，下次消息按当前项目目录新建会话；旧项目里的聊天记录不会移动。`))return;m(!0),f(null),q(null);const c=await I.rebind(l);m(!1),c.ok?(b(c.value,!0),q("已重新绑定：下一条消息会按新项目建会话。")):f(T(c))},[b]),F=d.useCallback(async l=>{w(c=>({...c,groupId:l,busy:!0,error:null}));const p=await I.messages(l,20);p.ok?w({groupId:l,items:p.value.messages,busy:!1,error:null,windowMs:p.value.windowMs}):w({groupId:l,items:[],busy:!1,error:T(p),windowMs:0})},[]),Z=d.useCallback(l=>{F(l)},[F]),ee=d.useCallback(()=>{w(G)},[]),se=d.useCallback(()=>{M.groupId!==null&&F(M.groupId)},[F,M.groupId]),te=d.useCallback(async l=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("解除群 "+String(l)+` 的会话绑定？
		旧会话保留在 GUI；下一条群消息会按当前项目目录新建会话。`))return;m(!0),f(null),q(null);const c=await I.deleteMapping(l);m(!1),c.ok?(b(c.value.status,!0),q(c.value.mapping.removed?"已解除群 "+String(l)+" 的会话绑定。":"群 "+String(l)+" 本来没有绑定。"),w(x=>x.groupId===l?G:x)):f(T(c))},[b]),re=d.useCallback(async()=>{const l=e===null?0:e.mappings.length;if(l===0)return;const p=globalThis.confirm;if(typeof p=="function"&&!p("清空全部 "+String(l)+` 条群映射？
		旧会话保留在 GUI；之后每个群的下一条消息都会重新建会话。`))return;m(!0),f(null),q(null);const c=await I.clearMappings();m(!1),c.ok?(b(c.value.status,!0),q("已清空 "+String(c.value.mappings.cleared)+" 条群映射。"),w(G)):f(T(c))},[b,e]),ne=d.useCallback(async()=>{const l=Number(r.chatRetentionDays.trim()===""?"0":r.chatRetentionDays.trim());if(!Number.isInteger(l)||l<1||l>3650){q(null),f("立即清理需要先在「保留天数」里填 1..3650 的整数（0 = 永不删除，不能清理）。");return}const p=globalThis.confirm;if(typeof p=="function"&&!p("立即清理超过 "+String(l)+` 天的聊天记录与媒体文件？
		删除后不可恢复；群映射与会话不受影响。`))return;m(!0),f(null),q(null);const c=await I.cleanup(l);if(m(!1),c.ok){const{cleanup:x,status:ce}=c.value;b(ce,!1),q("已清理：聊天记录 "+String(x.chat)+" 个文件、媒体 "+String(x.media)+" 个日期目录（保留 "+String(x.days)+" 天）。")}else f(T(c))},[r.chatRetentionDays,b]),ae=d.useMemo(()=>e!==null&&(Ae(r,e.config)||Re(i,e)),[r,i,e]),ie=d.useMemo(()=>Le(e),[e]),le=d.useMemo(()=>Ee(e),[e]),oe=d.useMemo(()=>Ue(e),[e]);return{status:e,form:r,projectRows:i,loading:o,busy:g,error:U,notice:C,tab:A,dirty:ae,statusLine:ie,tokenHint:oe,gateLine:le,messages:M,setTab:E,updateField:P,updateProjectRow:$,refresh:Y,save:()=>{K()},reconnect:()=>{V()},rebind:l=>{X(l)},deleteMapping:l=>{te(l)},clearMappings:()=>{re()},cleanup:()=>{ne()},openMessages:Z,closeMessages:ee,reloadMessages:se}}function ze({model:e}){var r;const s=((r=e.status)==null?void 0:r.gate)??null;return s===null||s.groups.length===0?null:t.jsx(N,{children:t.jsxs(S,{children:[t.jsx("h4",{className:"qqr-subhead",children:"闸门实时状态"}),t.jsxs("p",{className:"qqr-hint",children:["待评估 ",s.pendingMessages," 条 / ",s.pendingGroups," 群 · 活动定时器 ",s.timers," · ","待派发 ",s.queue," · 待发送 ",s.sendQueue]}),t.jsx("div",{className:"qqr-scroll",children:t.jsxs("table",{className:"qqr-table",children:[t.jsx("thead",{children:t.jsxs("tr",{children:[t.jsx("th",{className:"qqr-th",children:"群号"}),t.jsx("th",{className:"qqr-th",children:"待评估"}),t.jsx("th",{className:"qqr-th",children:"最近发言"}),t.jsx("th",{className:"qqr-th",children:"冷却"}),t.jsx("th",{className:"qqr-th",children:"状态"})]})}),t.jsx("tbody",{children:s.groups.map(n=>t.jsxs("tr",{children:[t.jsx("td",{className:"qqr-td",children:n.groupId}),t.jsx("td",{className:"qqr-td",children:n.pending}),t.jsx("td",{className:"qqr-td",children:Ne(n.lastBotSpeakAt)||"未发言"}),t.jsx("td",{className:"qqr-td",children:n.cooldownUntil>Date.now()?"冷却至 "+W(n.cooldownUntil):"—"}),t.jsx("td",{className:"qqr-td",children:n.dshBusy?"忙（有轮次在跑）":n.evaluating?"评估中":"空闲"})]},n.groupId))})]})})]})})}function Ge({model:e}){const{form:s,updateField:r}=e;return t.jsxs("div",{className:"qqr-panel",children:[t.jsxs(N,{children:[t.jsx(j,{label:"回发文本切分上限",hint:"100..20000 字符；超长回复按此切分成多条",children:t.jsx(y,{value:s.replyChunkSize,onChange:n=>{r("replyChunkSize",n)},inputMode:"numeric",ariaLabel:"回发文本切分上限"})}),t.jsx(j,{label:"直通命令前缀",hint:"逗号分隔；群消息以此开头时绕过闸门直接进 DSH",children:t.jsx(y,{value:s.commandPrefixes,onChange:n=>{r("commandPrefixes",n)},placeholder:"/dsh",ariaLabel:"直通命令前缀"})})]}),t.jsxs(N,{children:[t.jsxs(S,{children:[t.jsx("h4",{className:"qqr-subhead",children:"消息闸门"}),t.jsx(R,{tone:e.gateLine.tone==="ok"?"ok":e.gateLine.tone==="warn"?"warn":"muted",children:e.gateLine.text})]}),t.jsx(j,{label:"普通消息去抖窗口",hint:"同一波消息合并等待，0..60s（如 3s / 500ms）",children:t.jsx(y,{value:s.gateDebounce,onChange:n=>{r("gateDebounce",n)},placeholder:"5s",ariaLabel:"普通消息去抖窗口"})}),t.jsx(j,{label:"最小发言间隔",hint:"距上次发言不足该间隔时延后评估，0..60m（如 10s / 45s）",children:t.jsx(y,{value:s.gateFastMinReplyInterval,onChange:n=>{r("gateFastMinReplyInterval",n)},placeholder:"45s",ariaLabel:"最小发言间隔"})}),t.jsx(j,{label:"jev 接话阈值",hint:"0..1；越高越保守（默认 0.7）",children:t.jsx(y,{value:s.gateJevThreshold,onChange:n=>{r("gateJevThreshold",n)},inputMode:"decimal",placeholder:"0.7",ariaLabel:"jev 接话阈值"})})]}),t.jsx(ze,{model:e})]})}function _e({model:e}){const{status:s}=e,r=(s==null?void 0:s.login)??null,n=r!==null&&(r.nickname!==""||r.userId>0)?(r.nickname!==""?r.nickname:"未取到昵称")+"（"+String(r.userId)+"）":"未登录",i=(s==null?void 0:s.lock)??null;return t.jsxs(N,{children:[t.jsxs(S,{children:[t.jsx("h4",{className:"qqr-subhead",children:"运行状态"}),t.jsxs("p",{className:"qqr-hint",children:["协议端：",t.jsx("span",{className:"qqr-mono",children:(s==null?void 0:s.config.wsUrl)??"—"})]}),t.jsxs("p",{className:"qqr-hint",children:["登录账号：",n]}),t.jsxs("p",{className:"qqr-hint",children:["单实例锁：",i===null?"本进程持有":"另一个进程持有（pid "+String(i.pid)+"）"," · ","群映射：",s===null?0:s.mappings.length," 个"]})]}),s!==null&&s.problems.length>0?t.jsx(S,{children:t.jsx("ul",{className:"qqr-list",children:s.problems.map(a=>t.jsx("li",{children:t.jsx(R,{tone:"error",children:a})},a))})}):null]})}function He({model:e}){var n;const{form:s,updateField:r}=e;return t.jsxs("div",{className:"qqr-panel",children:[t.jsxs(N,{children:[t.jsx(j,{label:"协议端 WebSocket",hint:"NapCat 正向 WS，例如 ws://127.0.0.1:3001",children:t.jsx(y,{value:s.wsUrl,onChange:i=>{r("wsUrl",i)},placeholder:"ws://127.0.0.1:3001",ariaLabel:"协议端 WebSocket 地址"})}),t.jsx(j,{label:"Access Token",hint:e.tokenHint,children:t.jsx(y,{type:"password",value:s.accessToken,onChange:i=>{r("accessToken",i)},placeholder:((n=e.status)==null?void 0:n.config.accessTokenConfigured)===!0?"留空保持不变":"写入新的 token",ariaLabel:"Access Token"})}),t.jsx(j,{label:"机器人 QQ 号",hint:"连接后用 get_login_info 校验，不匹配会断开",children:t.jsx(y,{value:s.selfId,onChange:i=>{r("selfId",i)},inputMode:"numeric",ariaLabel:"机器人 QQ 号"})}),t.jsx(j,{label:"群白名单",hint:"逗号分隔的群号；未列出的群只记日志不回话",children:t.jsx(y,{value:s.groups,onChange:i=>{r("groups",i)},placeholder:"10002",ariaLabel:"群白名单"})})]}),t.jsx(_e,{model:e})]})}function Q(e){const s={image:"图片",sticker:"表情",face:"表情",video:"视频",voice:"语音",file:"文件"};return e.map(r=>r.status==="failed"?r.kind==="file"?"[群文件下载失败]":"[媒体下载失败]":"["+(s[r.kind]??"媒体")+"]")}function Be({model:e}){const{messages:s}=e;if(s.groupId===null)return null;const r=Math.max(1,Math.round(s.windowMs/36e5));return t.jsx(N,{children:t.jsxs(S,{children:[t.jsxs("div",{className:"qqr-headline",children:[t.jsxs("h4",{className:"qqr-subhead",children:["最近消息 · 群 ",s.groupId]}),t.jsxs("span",{className:"qqr-muted",children:["最近 ",r," 小时 · 最多 20 条"]}),t.jsxs("span",{className:"qqr-inline-actions",children:[t.jsx(v,{onClick:e.reloadMessages,disabled:s.busy,children:"刷新"}),t.jsx(v,{onClick:e.closeMessages,disabled:s.busy,children:"关闭"})]})]}),s.busy?t.jsx("p",{className:"qqr-muted",children:"读取中…"}):s.error!==null?t.jsx(R,{tone:"error",role:"alert",children:s.error}):s.items.length===0?t.jsx("p",{className:"qqr-muted",children:"最近 24 小时没有消息。"}):t.jsx("div",{children:s.items.map(n=>t.jsxs("div",{className:"qqr-msg",children:[t.jsxs("span",{className:"qqr-msg-meta",children:[W(n.time)," · ",n.name,n.mentionsSelf?"（@你）":"",n.replyToId!==""?"（引用 "+n.replyToId+"）":"",Q(n.media).length>0?" "+Q(n.media).join(" "):""]}),n.text!==""?t.jsx("span",{className:"qqr-msg-text",children:n.text}):null]},(n.messageId||String(n.time))+":"+String(n.time)))})]})})}function Qe({model:e}){const{status:s,projectRows:r,busy:n,loading:i}=e;return t.jsxs(N,{children:[t.jsxs(S,{children:[t.jsxs("div",{className:"qqr-headline",children:[t.jsx("h4",{className:"qqr-subhead",children:"群项目目录"}),t.jsx("span",{className:"qqr-inline-actions",children:s!==null&&s.mappings.length>0?t.jsxs(v,{onClick:e.clearMappings,disabled:n||i,variant:"outline",children:["清空全部映射（",s.mappings.length,"）"]}):null})]}),t.jsxs("p",{className:"qqr-hint",children:["每个群的聊天记录写进该项目的 ",t.jsx("code",{children:".qq-relay/chat/<群号>/"}),"，DSH 会话也以它为工作目录； 留空表示跟随上面的默认项目。改目录只影响之后新建的会话——已建会话请点「重新绑定」 （旧项目里的聊天记录不会移动）。"]})]}),s===null||r.length===0?t.jsx(S,{children:t.jsx("p",{className:"qqr-empty",children:"还没有群：把群号填进「群白名单」，或在群里 @ 机器人后会自动出现。"})}):t.jsx(S,{children:t.jsx("div",{className:"qqr-scroll",children:t.jsxs("table",{className:"qqr-table",children:[t.jsx("thead",{children:t.jsxs("tr",{children:[t.jsx("th",{className:"qqr-th",children:"群号"}),t.jsx("th",{className:"qqr-th",children:"会话"}),t.jsx("th",{className:"qqr-th",children:"项目目录"}),t.jsx("th",{className:"qqr-th",children:"操作"})]})}),t.jsx("tbody",{children:r.map(a=>t.jsxs("tr",{children:[t.jsx("td",{className:"qqr-td",children:a.groupId}),t.jsx("td",{className:"qqr-td",children:a.sessionId===""?t.jsx("span",{className:"qqr-muted",children:"未创建"}):t.jsxs(t.Fragment,{children:[t.jsx("span",{children:a.sessionTitle!==""?a.sessionTitle:"—"}),t.jsx("span",{className:"qqr-mono qqr-mono-block",children:a.sessionId})]})}),t.jsx("td",{className:"qqr-td qqr-col-dir",children:t.jsx(y,{value:a.projectDir,onChange:o=>{e.updateProjectRow(a.groupId,o)},placeholder:s.config.workspace,ariaLabel:"群 "+String(a.groupId)+" 的项目目录"})}),t.jsx("td",{className:"qqr-td",children:t.jsxs("div",{className:"qqr-row-actions",children:[t.jsx(v,{variant:"outline",onClick:()=>{e.rebind(a.groupId)},disabled:n||a.sessionId==="",children:"重新绑定"}),t.jsx(v,{onClick:()=>{e.openMessages(a.groupId)},disabled:n||i,children:"消息"}),t.jsx(v,{onClick:()=>{e.deleteMapping(a.groupId)},disabled:n||a.sessionId==="",children:"解除绑定"})]})})]},a.groupId))})]})})})]})}function Oe({model:e}){const{form:s,updateField:r}=e;return t.jsxs("div",{className:"qqr-panel",children:[t.jsxs(N,{children:[t.jsx(j,{label:"默认项目目录",hint:"未单独配置群项目时，聊天记录与 DSH 会话使用的目录",children:t.jsx(y,{value:s.workspace,onChange:n=>{r("workspace",n)},placeholder:"~/dsh/qq-relay-ws",ariaLabel:"默认项目目录"})}),t.jsx(j,{label:"会话标题模板",hint:"可用 {groupName} / {groupId}",children:t.jsx(y,{value:s.sessionTitle,onChange:n=>{r("sessionTitle",n)},placeholder:"QQ群：{groupName}",ariaLabel:"会话标题模板"})})]}),t.jsx(Qe,{model:e}),t.jsx(Be,{model:e})]})}function We({model:e}){const{form:s,updateField:r}=e;return t.jsx("div",{className:"qqr-panel",children:t.jsxs(N,{children:[t.jsx(j,{label:"聊天记录保留天数",hint:"0 = 永不自动删除；7..3650 = 自动清理天数（保存后生效）",children:t.jsx(y,{value:s.chatRetentionDays,onChange:n=>{r("chatRetentionDays",n)},inputMode:"numeric",placeholder:"0",ariaLabel:"聊天记录保留天数"})}),t.jsxs(S,{children:[t.jsxs("p",{className:"qqr-hint",children:["聊天记录与媒体文件默认",t.jsx("b",{children:"永不自动删除"}),"（保留天数 0）。填 7..3650 保存后， 宿主启动时与每天各清理一次超过该天数的 ",t.jsx("code",{children:".qq-relay/chat/"})," 日文件与",t.jsx("code",{children:" .qq-relay/media/"})," 日期目录。"]}),t.jsxs("div",{className:"qqr-headline",children:[t.jsx(v,{variant:"outline",onClick:e.cleanup,disabled:e.busy||e.loading,children:"立即清理"}),t.jsx("span",{className:"qqr-hint",children:"用上面的天数（1..3650）清一次，不改配置、不动群映射；删除后不可恢复。"})]})]})]})})}function Je(){const e=Fe();he();const s=e.tab==="connection"?t.jsx(He,{model:e}):e.tab==="project"?t.jsx(Oe,{model:e}):e.tab==="behavior"?t.jsx(Ge,{model:e}):t.jsx(We,{model:e});return t.jsxs("div",{className:"qqr-root","data-plugin":"dsh-qq-relay",children:[t.jsxs("div",{className:"qqr-head",children:[t.jsx(ue,{line:e.statusLine}),t.jsxs("div",{className:"qqr-actions",children:[t.jsx(v,{onClick:e.refresh,disabled:e.loading||e.busy,children:"刷新"}),t.jsx(v,{variant:"outline",onClick:e.reconnect,disabled:e.loading||e.busy,children:"重新连接"}),t.jsx(v,{variant:"primary",onClick:e.save,disabled:e.loading||e.busy,children:"保存并重连"})]})]}),t.jsx("nav",{className:"qqr-tabs",role:"tablist","aria-label":"QQ 机器人配置",children:De.map(r=>t.jsx("button",{type:"button",role:"tab",id:"qqr-tab-"+r.id,className:"qqr-tab","data-active":e.tab===r.id,"aria-selected":e.tab===r.id,"aria-controls":"qqr-tabpanel",onClick:()=>{e.setTab(r.id)},children:r.label},r.id))}),e.error!==null?t.jsx(R,{tone:"error",role:"alert",children:e.error}):null,e.notice!==null?t.jsx(R,{tone:"ok",role:"status",children:e.notice}):null,e.dirty?t.jsx(R,{tone:"warn",children:"有未保存的修改。"}):null,t.jsx("div",{id:"qqr-tabpanel",role:"tabpanel","aria-labelledby":"qqr-tab-"+e.tab,children:s}),t.jsxs("p",{className:"qqr-footer",children:["配置来源：profile 的 ",t.jsx("code",{children:"cordis.patch.yml"}),"，本页保存的覆盖写入",t.jsx("code",{children:" ~/.dsh/storages/dsh-qq-relay/settings.json"}),"。token 只写不读，页面永远看不到明文。"]})]})}const $e="dsh-qq-relay",Ye=["slots"],Ke="dsh-qq-relay";function Ve(e){var n;const s=e,r=(n=s==null?void 0:s.get)==null?void 0:n.call(s,"slots");if(!(r===void 0||typeof r.inject!="function"||typeof r.register!="function"))try{r.inject("plugins.bundle.config",()=>r.register({name:"plugins.bundle.config",key:Ke},Je))}catch{}}exports.apply=Ve;exports.inject=Ye;exports.name=$e;

		return module.exports;
	}
});
