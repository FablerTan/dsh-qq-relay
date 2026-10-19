window.__ModuleLoader__.load({
	id: "dsh-qq-relay",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		"use strict";Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const r=require("react/jsx-runtime"),g=require("react");function Me({tone:e}){return r.jsx("span",{className:"qqr-dot","data-tone":e,"aria-hidden":"true"})}function k(e){return r.jsx("button",{type:"button",className:"qqr-btn","data-variant":e.variant??"ghost",onClick:e.onClick,disabled:e.disabled===!0,title:e.title,children:e.children})}function S({children:e}){return r.jsx("div",{className:"qqr-card",children:e})}function b(e){return r.jsxs("div",{className:"qqr-row",children:[r.jsxs("div",{className:"qqr-row-text",children:[r.jsx("span",{className:"qqr-label",children:e.label}),e.hint!==void 0?r.jsx("span",{className:"qqr-hint",children:e.hint}):null]}),r.jsx("div",{className:"qqr-control",children:e.children})]})}function v({children:e}){return r.jsx("div",{className:"qqr-block",children:e})}function R(e){return r.jsx("p",{className:"qqr-line","data-tone":e.tone??"muted",role:e.role,children:e.children})}function Ae({line:e}){return r.jsxs("span",{className:"qqr-status",children:[r.jsx(Me,{tone:e.tone}),r.jsx("span",{children:e.text})]})}function ee(e){return r.jsx("button",{type:"button",role:"switch","aria-checked":e.checked,"aria-label":e.ariaLabel,className:"qqr-toggle","data-on":e.checked?"true":"false",disabled:e.disabled===!0,onClick:()=>{e.onChange(!e.checked)},children:r.jsx("span",{className:"qqr-toggle-knob","aria-hidden":"true"})})}function ne(e){return r.jsx("textarea",{className:"qqr-textarea",value:e.value,placeholder:e.placeholder,rows:e.rows??4,spellCheck:!1,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)}})}function B(e){return r.jsx("select",{className:"qqr-select",value:e.value,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)},children:e.options.map(s=>r.jsx("option",{value:s.value,disabled:s.disabled===!0,title:s.title,children:s.label},s.value))})}function y(e){return r.jsx("input",{className:"qqr-input",type:e.type??"text",value:e.value,placeholder:e.placeholder,inputMode:e.inputMode,autoComplete:e.autoComplete??"off",spellCheck:!1,"aria-label":e.ariaLabel,disabled:e.disabled===!0,onChange:s=>{e.onChange(s.target.value)}})}const se="dsh-qq-relay-client-style",Ee=`/* dsh-qq-relay 配置页样式：全部走宿主 ui-theme 的 --dsw-* 语义 token，
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

		.qqr-select {
		  box-sizing: border-box;
		  width: 100%;
		  height: 32px;
		  padding: 0 8px;
		  border: 0.5px solid var(--dsw-alias-border-l4);
		  border-radius: var(--dsw-radius-md);
		  background: var(--dsw-alias-bg-layer-1);
		  color: var(--dsw-alias-label-primary);
		  font: inherit;
		  font-size: 13px;
		  line-height: 20px;
		}

		.qqr-select:focus {
		  outline: none;
		  border-color: var(--dsw-alias-state-business-primary);
		}

		.qqr-textarea {
		  box-sizing: border-box;
		  width: 100%;
		  min-height: 88px;
		  padding: 8px 10px;
		  border: 0.5px solid var(--dsw-alias-border-l4);
		  border-radius: var(--dsw-radius-md);
		  background: var(--dsw-alias-bg-layer-1);
		  color: var(--dsw-alias-label-primary);
		  font: inherit;
		  font-size: 13px;
		  line-height: 20px;
		  resize: vertical;
		}

		.qqr-textarea::placeholder { color: var(--dsw-alias-label-dimmed); }

		.qqr-textarea:focus {
		  outline: none;
		  border-color: var(--dsw-alias-state-business-primary);
		}

		.qqr-toggle {
		  position: relative;
		  box-sizing: border-box;
		  width: 40px;
		  height: 24px;
		  padding: 0;
		  border: 0;
		  border-radius: 999px;
		  background: var(--dsw-alias-interactive-bg-active);
		  cursor: pointer;
		  transition: background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);
		}

		.qqr-toggle[data-on='true'] { background: var(--dsw-alias-state-success-primary); }
		.qqr-toggle:disabled { opacity: 0.4; cursor: not-allowed; }

		.qqr-toggle:focus-visible {
		  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
		  outline-offset: 2px;
		}

		.qqr-toggle-knob {
		  position: absolute;
		  top: 2px;
		  left: 2px;
		  width: 20px;
		  height: 20px;
		  border-radius: 50%;
		  background: var(--dsw-alias-label-primary-foreground);
		  box-shadow: 0 0.5px 1px var(--dsw-alias-border-l4);
		  transition: transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);
		}

		.qqr-toggle[data-on='true'] .qqr-toggle-knob { transform: translateX(16px); }

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
		`;function Re(){g.useEffect(()=>{if(document.getElementById(se)!==null)return;const e=document.createElement("style");return e.id=se,e.textContent=Ee,document.head.appendChild(e),()=>{e.remove()}},[])}const De="/dsh-qq-relay/api/status",Le="/dsh-qq-relay/api/config",ze="/dsh-qq-relay/api/reconnect",He="/dsh-qq-relay/api/rebind",Fe="/dsh-qq-relay/api/cleanup",Ue="/dsh-qq-relay/api/messages",_e="/dsh-qq-relay/api/mapping/delete",Qe="/dsh-qq-relay/api/mapping/clear",Ge="/dsh-qq-relay/api/presets",We="/dsh-qq-relay/api/presets/delete";function h(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function Be(e){return Array.isArray(e)?e.filter(h).map(s=>({groupId:typeof s.groupId=="number"?s.groupId:0,pending:typeof s.pending=="number"?s.pending:0,lastBotSpeakAt:typeof s.lastBotSpeakAt=="number"?s.lastBotSpeakAt:0,lastReplyAt:typeof s.lastReplyAt=="number"?s.lastReplyAt:0,lastUserMessageAt:typeof s.lastUserMessageAt=="number"?s.lastUserMessageAt:0,cooldownUntil:typeof s.cooldownUntil=="number"?s.cooldownUntil:0,evaluating:s.evaluating===!0,dshBusy:s.dshBusy===!0})):[]}function Oe(e){return Array.isArray(e)?e.filter(h).map(s=>({messageId:typeof s.messageId=="string"?s.messageId:"",time:typeof s.time=="number"?s.time:0,name:typeof s.name=="string"?s.name:"",text:typeof s.text=="string"?s.text:"",mentionsSelf:s.mentionsSelf===!0,replyToId:typeof s.replyToId=="string"?s.replyToId:"",media:Array.isArray(s.media)?s.media.filter(h).map(n=>({kind:typeof n.kind=="string"?n.kind:"",status:typeof n.status=="string"?n.status:"",path:typeof n.path=="string"?n.path:""})):[]})):[]}function Z(e){return Array.isArray(e)?e.filter(h).map(s=>{const n=h(s.model)?s.model:{};return{id:typeof s.id=="string"?s.id:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:"",persona:typeof s.persona=="string"?s.persona:"",model:{provider:typeof n.provider=="string"?n.provider:"",model:typeof n.model=="string"?n.model:"",reasoningEffort:typeof n.reasoningEffort=="string"?n.reasoningEffort:""},permissionPreset:typeof s.permissionPreset=="string"?s.permissionPreset:"",order:typeof s.order=="number"?s.order:100}}).filter(s=>s.id!==""):[]}function $e(e){if(!h(e)||!Array.isArray(e.groups))return null;const s=e.groups.filter(h).map(t=>({id:typeof t.id=="string"?t.id:"",name:typeof t.name=="string"?t.name:"",models:Array.isArray(t.models)?t.models.filter(h).map(i=>{const a=h(i.reasoning)?i.reasoning:null;return{id:typeof i.id=="string"?i.id:"",name:typeof i.name=="string"?i.name:"",description:typeof i.description=="string"?i.description:"",efforts:a!==null&&Array.isArray(a.efforts)?a.efforts.filter(h).map(l=>({id:typeof l.id=="string"?l.id:"",name:typeof l.name=="string"?l.name:"",description:typeof l.description=="string"?l.description:""})):[],defaultEffort:a!==null&&typeof a.defaultEffort=="string"?a.defaultEffort:""}}):[]})),n=h(e.default)?e.default:{};return{groups:s,default:{provider:typeof n.provider=="string"?n.provider:"",model:typeof n.model=="string"?n.model:"",reasoningEffort:typeof n.reasoningEffort=="string"?n.reasoningEffort:""}}}function Je(e){return!h(e)||!Array.isArray(e.options)?null:{options:e.options.filter(h).map(s=>({value:typeof s.value=="string"?s.value:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:""})).filter(s=>s.value!==""),defaultPreset:typeof e.defaultPreset=="string"?e.defaultPreset:""}}function Ye(e){return Array.isArray(e)?e.filter(h).map(s=>({id:typeof s.id=="string"?s.id:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:"",broken:typeof s.broken=="string"?s.broken:""})).filter(s=>s.id!==""):[]}function W(e){if(!h(e))return null;const s=h(e.config)?e.config:{},n=h(e.login)?e.login:null,t=h(e.lock)?e.lock:null,i=Array.isArray(e.mappings)?e.mappings.filter(h):[];return{plugin:typeof e.plugin=="string"?e.plugin:"dsh-qq-relay",started:e.started===!0,connected:e.connected===!0,login:n===null?null:{userId:typeof n.userId=="number"?n.userId:0,nickname:typeof n.nickname=="string"?n.nickname:""},problems:Array.isArray(e.problems)?e.problems.filter(a=>typeof a=="string"):[],lock:t===null?null:{pid:typeof t.pid=="number"?t.pid:0,startedAt:typeof t.startedAt=="number"?t.startedAt:0,host:typeof t.host=="string"?t.host:void 0},config:{wsUrl:typeof s.wsUrl=="string"?s.wsUrl:"",selfId:typeof s.selfId=="number"?s.selfId:0,groups:Array.isArray(s.groups)?s.groups.filter(a=>typeof a=="number"):[],workspace:typeof s.workspace=="string"?s.workspace:"",groupWorkspaces:h(s.groupWorkspaces)?Object.fromEntries(Object.entries(s.groupWorkspaces).filter(([a,l])=>/^\d+$/u.test(a)&&typeof l=="string"&&l!=="").map(([a,l])=>[a,l])):{},chatRetentionDays:typeof s.chatRetentionDays=="number"?s.chatRetentionDays:0,gate:h(s.gate)?{debounceMs:typeof s.gate.debounceMs=="number"?s.gate.debounceMs:5e3,fastMinReplyIntervalMs:typeof s.gate.fastMinReplyIntervalMs=="number"?s.gate.fastMinReplyIntervalMs:45e3,jevThreshold:typeof s.gate.jevThreshold=="number"?s.gate.jevThreshold:.7}:{debounceMs:5e3,fastMinReplyIntervalMs:45e3,jevThreshold:.7},gateSupported:h(s.gate),proxyReply:h(s.proxyReply)?{enabled:s.proxyReply.enabled===!0,targets:Array.isArray(s.proxyReply.targets)?s.proxyReply.targets.filter(a=>typeof a=="string"&&a!==""):[],silenceWindowMs:typeof s.proxyReply.silenceWindowMs=="number"?s.proxyReply.silenceWindowMs:600*1e3}:{enabled:!1,targets:[],silenceWindowMs:600*1e3},agentPreset:typeof s.agentPreset=="string"?s.agentPreset:"",persona:h(s.persona)?{enabled:s.persona.enabled===!0,text:typeof s.persona.text=="string"?s.persona.text:""}:{enabled:!1,text:""},sessionTitle:typeof s.sessionTitle=="string"?s.sessionTitle:"",replyChunkSize:typeof s.replyChunkSize=="number"?s.replyChunkSize:0,commandPrefixes:Array.isArray(s.commandPrefixes)?s.commandPrefixes.filter(a=>typeof a=="string"):[],accessTokenConfigured:s.accessTokenConfigured===!0,accessTokenSource:s.accessTokenSource==="settings"?"settings":"profile"},agentPresets:h(e.agentPresets)?{supported:e.agentPresets.supported===!0,items:Ye(e.agentPresets.items),missing:e.agentPresets.missing===!0}:{supported:!1,items:[],missing:!1},presets:Z(e.presets),presetService:h(e.presetService)?{supported:e.presetService.supported===!0,registered:Array.isArray(e.presetService.registered)?e.presetService.registered.filter(a=>typeof a=="string"):[]}:{supported:!1,registered:[]},modelCatalog:$e(e.modelCatalog),permissionCatalog:Je(e.permissionCatalog),gate:h(e.gate)?{enabled:e.gate.enabled===!0,classifier:typeof e.gate.classifier=="string"?e.gate.classifier:null,model:typeof e.gate.model=="string"?e.gate.model:"",threshold:typeof e.gate.threshold=="number"?e.gate.threshold:0,slowTimer:typeof e.gate.slowTimer=="number"?e.gate.slowTimer:0,pendingMessages:typeof e.gate.pendingMessages=="number"?e.gate.pendingMessages:0,pendingGroups:typeof e.gate.pendingGroups=="number"?e.gate.pendingGroups:0,timers:typeof e.gate.timers=="number"?e.gate.timers:0,queue:typeof e.gate.queue=="number"?e.gate.queue:0,sendQueue:typeof e.gate.sendQueue=="number"?e.gate.sendQueue:0,groups:Be(e.gate.groups)}:null,mappings:i.map(a=>({groupId:typeof a.groupId=="number"?a.groupId:0,sessionId:typeof a.sessionId=="string"?a.sessionId:"",title:typeof a.title=="string"?a.title:"",workspacePath:typeof a.workspacePath=="string"?a.workspacePath:"",createdAt:typeof a.createdAt=="number"?a.createdAt:0}))}}async function H(e,s,n){let t;try{t=await e(s,{cache:"no-store",...n})}catch(l){return{ok:!1,error:{code:"NETWORK",message:"连不上 host"+(l instanceof Error&&l.message!==""?"："+l.message:"")}}}let i=null;try{i=await t.json()}catch{i=null}if(h(i)&&i.ok===!0)return{ok:!0,value:i.value};const a=h(i)&&h(i.error)?i.error:null;return{ok:!1,error:{code:a!==null&&typeof a.code=="string"?a.code:"HTTP_"+String(t.status),message:a!==null&&typeof a.message=="string"&&a.message!==""?a.message:"请求失败（HTTP "+String(t.status)+"）。"}}}function F(){return{ok:!1,error:{code:"BAD_PAYLOAD",message:"host 返回了无法识别的数据。"}}}function Ve(e){const s=e.fetch;async function n(i,a){const l=await H(s,i,a);if(!l.ok)return l;const u=W(l.value);return u!==null?{ok:!0,value:u}:F()}const t=i=>({method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(i)});return{getStatus:()=>n(De),saveConfig:i=>n(Le,t(i)),reconnect:()=>n(ze,{method:"POST"}),rebind:i=>n(He,t({groupId:i})),async cleanup(i){const a=await H(s,Fe,t({days:i}));if(!a.ok)return a;const l=a.value,u=h(l)?W(l.status):null,c=h(l)&&h(l.cleanup)?l.cleanup:null;return u===null||c===null?F():{ok:!0,value:{cleanup:{days:typeof c.days=="number"?c.days:i,chat:typeof c.chat=="number"?c.chat:0,media:typeof c.media=="number"?c.media:0,at:typeof c.at=="number"?c.at:0},status:u}}},async messages(i,a){const l=new URLSearchParams({groupId:String(i)});typeof a=="number"&&Number.isFinite(a)&&l.set("limit",String(a));const u=await H(s,Ue+"?"+l.toString());return u.ok?h(u.value)?{ok:!0,value:{groupId:typeof u.value.groupId=="number"?u.value.groupId:i,limit:typeof u.value.limit=="number"?u.value.limit:0,windowMs:typeof u.value.windowMs=="number"?u.value.windowMs:0,messages:Oe(u.value.messages)}}:F():u},async savePreset(i){const a=await H(s,Ge,t({preset:i}));if(!a.ok)return a;const l=a.value,u=h(l)?W(l.status):null;return u===null||!h(l)?F():{ok:!0,value:{presets:Z(l.presets),status:u}}},async deletePreset(i){const a=await H(s,We,t({id:i}));if(!a.ok)return a;const l=a.value,u=h(l)?W(l.status):null;return u===null||!h(l)?F():{ok:!0,value:{presets:Z(l.presets),status:u}}},async deleteMapping(i){const a=await H(s,_e,t({groupId:i}));if(!a.ok)return a;const l=a.value,u=h(l)?W(l.status):null,c=h(l)&&h(l.mapping)?l.mapping:null;return u===null||c===null?F():{ok:!0,value:{mapping:{groupId:typeof c.groupId=="number"?c.groupId:i,removed:c.removed===!0},status:u}}},async clearMappings(){const i=await H(s,Qe,{method:"POST"});if(!i.ok)return i;const a=i.value,l=h(a)?W(a.status):null,u=h(a)&&h(a.mappings)?a.mappings:null;return l===null||u===null?F():{ok:!0,value:{mappings:{cleared:typeof u.cleared=="number"?u.cleared:0},status:l}}}}}function Ke(){return{wsUrl:"",accessToken:"",selfId:"",groups:"",workspace:"",chatRetentionDays:"",gateDebounce:"",gateFastMinReplyInterval:"",gateJevThreshold:"",sessionTitle:"",replyChunkSize:"",commandPrefixes:"",proxyEnabled:!1,proxyTargets:"",proxySilenceWindow:"",agentPreset:"",personaEnabled:!1,personaText:""}}function te(e){return{wsUrl:e.wsUrl,accessToken:"",selfId:e.selfId>0?String(e.selfId):"",groups:e.groups.join(", "),workspace:e.workspace,chatRetentionDays:String(e.chatRetentionDays),gateDebounce:K(e.gate.debounceMs),gateFastMinReplyInterval:K(e.gate.fastMinReplyIntervalMs),gateJevThreshold:String(e.gate.jevThreshold),sessionTitle:e.sessionTitle,replyChunkSize:e.replyChunkSize>0?String(e.replyChunkSize):"",commandPrefixes:e.commandPrefixes.join(", "),proxyEnabled:e.proxyReply.enabled,proxyTargets:e.proxyReply.targets.join(", "),proxySilenceWindow:K(e.proxyReply.silenceWindowMs),agentPreset:e.agentPreset,personaEnabled:e.persona.enabled,personaText:e.persona.text}}function K(e){return!Number.isFinite(e)||e<=0?"0s":e%(3600*1e3)===0?String(e/(3600*1e3))+"h":e%(60*1e3)===0?String(e/(60*1e3))+"m":e%1e3===0?String(e/1e3)+"s":String(e)+"ms"}function Xe(e,s=Date.now()){if(!Number.isFinite(e)||e<=0)return"";const n=Math.max(0,s-e);return n<60*1e3?"刚刚":n<3600*1e3?Math.floor(n/(60*1e3))+" 分钟前":n<1440*60*1e3?Math.floor(n/(3600*1e3))+" 小时前":Math.floor(n/(1440*60*1e3))+" 天前"}function ae(e){if(!Number.isFinite(e)||e<=0)return"--:--:--";const s=new Date(e),n=t=>String(t).padStart(2,"0");return n(s.getHours())+":"+n(s.getMinutes())+":"+n(s.getSeconds())}function X(e){const s=/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/iu.exec(e.trim());if(s===null)return null;const t={ms:1,s:1e3,m:60*1e3,h:3600*1e3}[s[2].toLowerCase()];if(t===void 0)return null;const i=Number(s[1]);return!Number.isFinite(i)||i<0?null:Math.round(i*t)}function Ze(e){return e.split(/[,，\s]+/u).map(s=>s.trim()).filter(s=>s!=="")}function es(e){const s=[],n=[];for(const t of Ze(e)){if(!/^\d+$/u.test(t)){s.push("群号必须是数字："+t);continue}const i=Number(t);if(!Number.isSafeInteger(i)||i<=0){s.push("群号必须是正整数："+t);continue}n.includes(i)||n.push(i)}return s.length>0?{ok:!1,problems:s}:{ok:!0,value:n}}function ss(e){const s=[],n=new Set;for(const t of e.split(/[,，]/u)){const i=t.trim().replace(/^@/u,"").trim();if(i==="")continue;const a=i.toLowerCase();n.has(a)||(n.add(a),s.push(i))}return s}function rs(e){return{ok:!0,value:e.split(/[,，]/u).map(n=>n.trim()).filter(n=>n!=="")}}function ns(e){const s=[],n={},t=e.wsUrl.trim();t===""?s.push("wsUrl 必填"):n.wsUrl=t,e.accessToken.trim()!==""&&(n.accessToken=e.accessToken.trim());const i=e.selfId.trim();!/^\d+$/u.test(i)||Number(i)<=0?s.push("selfId 必须是正整数"):n.selfId=Number(i);const a=es(e.groups);a.ok?n.groups=a.value:s.push(...a.problems);const l=e.workspace.trim();l===""?s.push("workspace 必填"):n.workspace=l;const u=e.chatRetentionDays.trim(),c=u===""?"0":u,q=Number(c);!/^\d+$/u.test(c)||!Number.isInteger(q)||!(q===0||q>=7&&q<=3650)?s.push("聊天记录保留天数必须是 0（永不自动删除）或 7..3650 的整数"):n.chatRetentionDays=q;const L=e.sessionTitle.trim();L===""?s.push("sessionTitle 必填"):n.sessionTitle=L;const f=e.replyChunkSize.trim(),D=Number(f);!/^\d+$/u.test(f)||!Number.isInteger(D)||D<100||D>2e4?s.push("replyChunkSize 必须是 100..20000 的整数"):n.replyChunkSize=D;const x=rs(e.commandPrefixes);n.commandPrefixes=x.value;const U=ss(e.proxyTargets);e.proxyEnabled&&U.length===0&&s.push("开启代答时至少要填一个目标（QQ 号或群名片 / 昵称）");const _=e.proxySilenceWindow.trim(),I=X(_);I===null||I>1440*60*1e3?s.push("代答沉默窗口必须是 0..24h 的时长（如 10m / 30m；0s = 总是代答）"):n.proxyReply={enabled:e.proxyEnabled,targets:U,silenceWindow:_};const N=e.agentPreset.trim();n.agentPreset=N;const M=e.personaText.trim();e.personaEnabled&&M===""&&s.push("开启轻量人设时至少要填一段人设文本"),M.length>4e3&&s.push("轻量人设最多 4000 字符"),n.persona={enabled:e.personaEnabled,text:M};const C={},A=e.gateDebounce.trim(),o=X(A);o===null||o>60*1e3?s.push("去抖窗口必须是 0..60s 的时长（如 3s / 500ms）"):C.debounce=A;const Q=e.gateFastMinReplyInterval.trim(),z=X(Q);z===null||z>3600*1e3?s.push("最小发言间隔必须是 0..60m 的时长（如 10s / 45s）"):C.fastMinReplyInterval=Q;const O=e.gateJevThreshold.trim(),E=Number(O);return O===""||!Number.isFinite(E)||E<0||E>1?s.push("jev 阈值必须是 0..1 的数字（如 0.7）"):C.jevThreshold=E,n.gate=C,s.length>0?{ok:!1,problems:s}:{ok:!0,value:n}}function ts(e,s){const n=te(s);return Object.keys(n).some(t=>e[t]!==n[t])}function J(){return{id:"",name:"",description:"",persona:"",provider:"",model:"",reasoningEffort:"",permissionPreset:"",order:"100"}}function as(e){return{id:e.id,name:e.name,description:e.description,persona:e.persona,provider:e.model.provider,model:e.model.model,reasoningEffort:e.model.reasoningEffort,permissionPreset:e.permissionPreset,order:String(e.order)}}function is(e){const s=[],n=e.id.trim();/^[a-z0-9][a-z0-9-]{0,40}$/u.test(n)||s.push("预设 id 只能用小写字母 / 数字 / 连字符，且不超过 41 字符");const t=e.name.trim();t===""&&s.push("预设名称必填");const i=e.persona.trim();i===""&&s.push("人设文本必填"),i.length>4e3&&s.push("人设文本最多 4000 字符");const a=e.provider.trim(),l=e.model.trim();a===""!=(l==="")&&s.push("模型必须同时选 provider 与 model（或都留空）");const u=e.order.trim()===""?"100":e.order.trim(),c=Number(u);return(!/^\d+$/u.test(u)||!Number.isInteger(c)||c<1||c>1e4)&&s.push("预设排序必须是 1..10000 的整数"),s.length>0?{ok:!1,problems:s}:{ok:!0,value:{id:n,name:t,description:e.description.trim(),persona:i,model:{provider:a,model:l,reasoningEffort:a===""?"":e.reasoningEffort.trim()},permissionPreset:e.permissionPreset.trim(),order:c}}}function ie(e){const s=new Map,n=t=>{let i=s.get(t);return i===void 0&&(i={groupId:t,sessionId:"",sessionTitle:"",projectDir:""},s.set(t,i)),i};for(const t of e.config.groups)n(t);for(const[t,i]of Object.entries(e.config.groupWorkspaces)){const a=Number(t);!Number.isSafeInteger(a)||a<=0||(n(a).projectDir=i)}for(const t of e.mappings){const i=n(t.groupId);i.sessionId=t.sessionId,i.sessionTitle=t.title}return[...s.values()].sort((t,i)=>t.groupId-i.groupId)}function ls(e){const s={};for(const n of e){const t=n.projectDir.trim();t!==""&&(s[String(n.groupId)]=t)}return s}function os(e,s){const n=new Map(ie(s).map(t=>[t.groupId,t.projectDir]));return e.some(t=>(n.get(t.groupId)??"")!==t.projectDir.trim())}const P=Ve({fetch:(e,s)=>globalThis.fetch(e,s)}),ds=[{id:"connection",label:"连接"},{id:"project",label:"项目"},{id:"behavior",label:"行为"},{id:"presets",label:"预设"},{id:"records",label:"记录"}];function T(e){return e.ok?"":e.error.message}function cs(e){if(e===null)return{tone:"muted",text:"加载中…"};if(!e.started)return e.lock!==null?{tone:"warn",text:"未启动：另一个实例（pid "+String(e.lock.pid)+"）正在运行"}:e.problems.length>0?{tone:"error",text:"未启动：配置待补全"}:{tone:"muted",text:"未启动（等待宿主就绪）"};if(e.connected){const s=e.login;return{tone:"ok",text:"已连接（"+(s!==null&&(s.nickname!==""||s.userId>0)?"QQ "+(s.nickname!==""?s.nickname:String(s.userId)):String(e.config.selfId))+"）"}}return{tone:"warn",text:"连接中…（断线自动重连）"}}function us(e){return e===null?"保存后生效":e.config.accessTokenConfigured?"已配置（来源："+(e.config.accessTokenSource==="settings"?"配置页保存值":"profile patch / 环境变量")+"）；留空表示不修改":"未配置；建议在 profile patch 里用 !!js 从环境变量读取"}function ps(e){if(e===null)return{tone:"muted",text:"闸门状态读取中…"};if(!e.config.gateSupported)return{tone:"warn",text:"宿主还是旧版本（未加载支持闸门配置的版本）：下面参数暂时不会生效，重启该 profile 的 GUI 后再保存。"};const s=e.gate;return s===null?{tone:"muted",text:"闸门状态读取中…"}:s.enabled?s.classifier===null?{tone:"warn",text:"闸门已开启，但分类器未就绪：普通群消息不会接话（@ / 引用 / 命令仍直通）。"}:{tone:"ok",text:"闸门已开启 · 分类器 "+s.classifier+" · 阈值 "+String(s.threshold)+"；保存后立即重建闸门。"}:{tone:"muted",text:"闸门当前关闭（gate.enabled 来自 profile patch）：下面的参数会保存，开启后才生效。"}}const Y={groupId:null,items:[],busy:!1,error:null,windowMs:0};function hs(){const[e,s]=g.useState(null),[n,t]=g.useState(Ke),[i,a]=g.useState([]),[l,u]=g.useState(!0),[c,q]=g.useState(!1),[L,f]=g.useState(null),[D,x]=g.useState(null),[U,_]=g.useState("connection"),[I,N]=g.useState(Y),[M,C]=g.useState([]),[A,o]=g.useState(J),[Q,z]=g.useState(null),[O,E]=g.useState(!1),j=g.useCallback((d,p)=>{s(d),C(d.presets),p&&(t(te(d.config)),a(ie(d)))},[]),G=g.useCallback(async(d,p=!0)=>{const m=await P.getStatus();u(!1),m.ok?(j(m.value,d),d&&p&&f(null)):p&&f(T(m))},[j]);g.useEffect(()=>{G(!0)},[G]),g.useEffect(()=>{const d=setInterval(()=>{G(!1,!1)},5e3);return()=>clearInterval(d)},[G]);const le=g.useCallback((d,p)=>{t(m=>({...m,[d]:p}))},[]),oe=g.useCallback(d=>{t(p=>({...p,proxyEnabled:d}))},[]),de=g.useCallback(d=>{t(p=>({...p,personaEnabled:d}))},[]),ce=g.useCallback((d,p)=>{a(m=>m.map(w=>w.groupId===d?{...w,projectDir:p}:w))},[]),ue=g.useCallback(()=>{G(!0)},[G]),pe=g.useCallback(async()=>{const d=ns(n);if(!d.ok){x(null),f(d.problems.join("；"));return}const p=ls(i);q(!0),f(null),x(null);const m=await P.saveConfig({...d.value,groupWorkspaces:p});q(!1),m.ok?(j(m.value,!0),x("已保存并重建连接。")):f(T(m))},[n,i,j]),he=g.useCallback(async()=>{q(!0),f(null),x(null);const d=await P.reconnect();q(!1),d.ok?(j(d.value,!1),x("已请求重新连接。")):f(T(d))},[j]),ge=g.useCallback(async d=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("重新绑定群 "+String(d)+`？
		会删除该群现有会话映射，下次消息按当前项目目录新建会话；旧项目里的聊天记录不会移动。`))return;q(!0),f(null),x(null);const m=await P.rebind(d);q(!1),m.ok?(j(m.value,!0),x("已重新绑定：下一条消息会按新项目建会话。")):f(T(m))},[j]),$=g.useCallback(async d=>{N(m=>({...m,groupId:d,busy:!0,error:null}));const p=await P.messages(d,20);p.ok?N({groupId:d,items:p.value.messages,busy:!1,error:null,windowMs:p.value.windowMs}):N({groupId:d,items:[],busy:!1,error:T(p),windowMs:0})},[]),me=g.useCallback(d=>{$(d)},[$]),fe=g.useCallback(()=>{N(Y)},[]),be=g.useCallback(()=>{I.groupId!==null&&$(I.groupId)},[$,I.groupId]),xe=g.useCallback(async d=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("解除群 "+String(d)+` 的会话绑定？
		旧会话保留在 GUI；下一条群消息会按当前项目目录新建会话。`))return;q(!0),f(null),x(null);const m=await P.deleteMapping(d);q(!1),m.ok?(j(m.value.status,!0),x(m.value.mapping.removed?"已解除群 "+String(d)+" 的会话绑定。":"群 "+String(d)+" 本来没有绑定。"),N(w=>w.groupId===d?Y:w)):f(T(m))},[j]),qe=g.useCallback(async()=>{const d=e===null?0:e.mappings.length;if(d===0)return;const p=globalThis.confirm;if(typeof p=="function"&&!p("清空全部 "+String(d)+` 条群映射？
		旧会话保留在 GUI；之后每个群的下一条消息都会重新建会话。`))return;q(!0),f(null),x(null);const m=await P.clearMappings();q(!1),m.ok?(j(m.value.status,!0),x("已清空 "+String(m.value.mappings.cleared)+" 条群映射。"),N(Y)):f(T(m))},[j,e]),ye=g.useCallback(async()=>{const d=Number(n.chatRetentionDays.trim()===""?"0":n.chatRetentionDays.trim());if(!Number.isInteger(d)||d<1||d>3650){x(null),f("立即清理需要先在「保留天数」里填 1..3650 的整数（0 = 永不删除，不能清理）。");return}const p=globalThis.confirm;if(typeof p=="function"&&!p("立即清理超过 "+String(d)+` 天的聊天记录与媒体文件？
		删除后不可恢复；群映射与会话不受影响。`))return;q(!0),f(null),x(null);const m=await P.cleanup(d);if(q(!1),m.ok){const{cleanup:w,status:Ie}=m.value;j(Ie,!1),x("已清理：聊天记录 "+String(w.chat)+" 个文件、媒体 "+String(w.media)+" 个日期目录（保留 "+String(w.days)+" 天）。")}else f(T(m))},[n.chatRetentionDays,j]),je=g.useCallback(()=>{z(""),o(J()),f(null),x(null)},[]),ve=g.useCallback(d=>{const p=M.find(m=>m.id===d);p!==void 0&&(z(d),o(as(p)),f(null),x(null))},[M]),we=g.useCallback((d,p)=>{o(m=>({...m,[d]:p}))},[]),V=g.useCallback(()=>{z(null),o(J()),f(null)},[]),ke=g.useCallback(async()=>{const d=is(A);if(!d.ok){x(null),f(d.problems.join("；"));return}E(!0),f(null),x(null);const p=await P.savePreset(d.value);E(!1),p.ok?(j(p.value.status,!1),C(p.value.presets),z(null),o(J()),x("预设已保存；新注册的 preset 对新会话生效。")):f(T(p))},[A,j]),Se=g.useCallback(async d=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("删除预设「"+d+`」？
		已使用该预设的旧会话保留原组合；之后新建的会话不能再选它。`))return;E(!0),f(null),x(null);const m=await P.deletePreset(d);E(!1),m.ok?(j(m.value.status,!1),C(m.value.presets),Q===d&&V(),x("已删除预设「"+d+"」。")):f(T(m))},[j,Q,V]),Ne=g.useMemo(()=>e!==null&&(ts(n,e.config)||os(i,e)),[n,i,e]),Ce=g.useMemo(()=>cs(e),[e]),Pe=g.useMemo(()=>ps(e),[e]),Te=g.useMemo(()=>us(e),[e]);return{status:e,form:n,projectRows:i,loading:l,busy:c,error:L,notice:D,tab:U,dirty:Ne,statusLine:Ce,tokenHint:Te,gateLine:Pe,messages:I,setTab:_,updateField:le,setProxyEnabled:oe,setPersonaEnabled:de,updateProjectRow:ce,refresh:ue,save:()=>{pe()},reconnect:()=>{he()},rebind:d=>{ge(d)},deleteMapping:d=>{xe(d)},clearMappings:()=>{qe()},cleanup:()=>{ye()},openMessages:me,closeMessages:fe,reloadMessages:be,presets:M,presetDraft:A,presetEditingId:Q,presetBusy:O,newPreset:je,editPreset:ve,updatePresetDraft:we,cancelPresetEdit:V,savePreset:()=>{ke()},deletePreset:d=>{Se(d)}}}function gs({model:e}){var n;const s=((n=e.status)==null?void 0:n.gate)??null;return s===null||s.groups.length===0?null:r.jsx(S,{children:r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"闸门实时状态"}),r.jsxs("p",{className:"qqr-hint",children:["待评估 ",s.pendingMessages," 条 / ",s.pendingGroups," 群 · 活动定时器 ",s.timers," · ","待派发 ",s.queue," · 待发送 ",s.sendQueue]}),r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"群号"}),r.jsx("th",{className:"qqr-th",children:"待评估"}),r.jsx("th",{className:"qqr-th",children:"最近发言"}),r.jsx("th",{className:"qqr-th",children:"冷却"}),r.jsx("th",{className:"qqr-th",children:"状态"})]})}),r.jsx("tbody",{children:s.groups.map(t=>r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:t.groupId}),r.jsx("td",{className:"qqr-td",children:t.pending}),r.jsx("td",{className:"qqr-td",children:Xe(t.lastBotSpeakAt)||"未发言"}),r.jsx("td",{className:"qqr-td",children:t.cooldownUntil>Date.now()?"冷却至 "+ae(t.cooldownUntil):"—"}),r.jsx("td",{className:"qqr-td",children:t.dshBusy?"忙（有轮次在跑）":t.evaluating?"评估中":"空闲"})]},t.groupId))})]})})]})})}function ms({model:e}){var u;const{form:s,updateField:n}=e,t=((u=e.status)==null?void 0:u.agentPresets)??null,i=(t==null?void 0:t.items)??[],a=[{value:"",label:"不指定（跟随 DSH 默认）"},...i.map(c=>({value:c.id,label:(c.name!==""?c.name:c.id)+(c.broken!==""?"（不可用）":""),disabled:c.broken!=="",title:c.broken!==""?c.broken:c.description}))];s.agentPreset!==""&&!i.some(c=>c.id===s.agentPreset)&&a.push({value:s.agentPreset,label:s.agentPreset+"（不在名册中）",disabled:!1});const l=t===null||!t.supported?r.jsx(R,{tone:"warn",children:"当前宿主没有提供 agent preset 服务（可能版本过旧或不是 Web bundle）：预设选择不会生效，轻量人设仍可用。"}):t.missing?r.jsx(R,{tone:"warn",children:"配置里的预设不在当前名册里：下次建会话会退回 DSH 默认预设。"}):null;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(S,{children:[r.jsx(b,{label:"回发文本切分上限",hint:"100..20000 字符；超长回复按此切分成多条",children:r.jsx(y,{value:s.replyChunkSize,onChange:c=>{n("replyChunkSize",c)},inputMode:"numeric",ariaLabel:"回发文本切分上限"})}),r.jsx(b,{label:"直通命令前缀",hint:"逗号分隔；群消息以此开头时绕过闸门直接进 DSH",children:r.jsx(y,{value:s.commandPrefixes,onChange:c=>{n("commandPrefixes",c)},placeholder:"/dsh",ariaLabel:"直通命令前缀"})})]}),r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"消息闸门"}),r.jsx(R,{tone:e.gateLine.tone==="ok"?"ok":e.gateLine.tone==="warn"?"warn":"muted",children:e.gateLine.text})]}),r.jsx(b,{label:"普通消息去抖窗口",hint:"同一波消息合并等待，0..60s（如 3s / 500ms）",children:r.jsx(y,{value:s.gateDebounce,onChange:c=>{n("gateDebounce",c)},placeholder:"5s",ariaLabel:"普通消息去抖窗口"})}),r.jsx(b,{label:"最小发言间隔",hint:"距上次发言不足该间隔时延后评估，0..60m（如 10s / 45s）",children:r.jsx(y,{value:s.gateFastMinReplyInterval,onChange:c=>{n("gateFastMinReplyInterval",c)},placeholder:"45s",ariaLabel:"最小发言间隔"})}),r.jsx(b,{label:"jev 接话阈值",hint:"0..1；越高越保守（默认 0.7）",children:r.jsx(y,{value:s.gateJevThreshold,onChange:c=>{n("gateJevThreshold",c)},inputMode:"decimal",placeholder:"0.7",ariaLabel:"jev 接话阈值"})})]}),r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"角色与人设"}),r.jsx("p",{className:"qqr-hint",children:"所有群共用一个 DSH agent preset；切换后只影响之后新建的会话（群里发 /new，或到「项目」页点「重新绑定」）。 下拉包含 DSH 内置预设和「预设」页里插件管理的预设（自带一个「QQ 群聊」）。"}),l]}),r.jsx(b,{label:"默认 Agent 预设",hint:"空 = 跟随 DSH 默认；preset 在会话创建时固定",children:r.jsx(B,{value:s.agentPreset,onChange:c=>{n("agentPreset",c)},options:a,ariaLabel:"默认 Agent 预设"})}),r.jsx(b,{label:"启用轻量人设",hint:"每轮 prompt 前注入；默认关闭；不依赖 profile 改动",children:r.jsx(ee,{checked:s.personaEnabled,onChange:e.setPersonaEnabled,ariaLabel:"启用轻量人设"})}),r.jsxs(v,{children:[r.jsx(ne,{value:s.personaText,onChange:c=>{n("personaText",c)},placeholder:"例如：你是群里的猫娘助手，说话带「喵」，可以偶尔发一个表情。",rows:4,ariaLabel:"轻量人设文本"}),r.jsx("p",{className:"qqr-hint",children:"人设文本最多 4000 字符，开启时不能为空；它叠加在系统提示词里的预设人设之上，适合补群内角色设定。 平台约定（最终回复自动回发、不要用 qq_send 往本群发）始终会附在 prompt 末尾。"})]})]}),r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"代答（@ 特定的人）"}),r.jsx("p",{className:"qqr-hint",children:"开启后，群里有人 @ 名单里的人、且 TA 最近没在本群说话时，机器人代 TA 回应（默认关闭）。 名单之外的 @ 别人消息只记聊天记录，不会触发会话。"})]}),r.jsx(b,{label:"开启代答",hint:"默认关闭；开启时下面至少填一个目标",children:r.jsx(ee,{checked:s.proxyEnabled,onChange:e.setProxyEnabled,ariaLabel:"开启代答"})}),r.jsx(b,{label:"代答目标",hint:"QQ 号或群名片 / 昵称，逗号分隔（如 10003, 群主）",children:r.jsx(y,{value:s.proxyTargets,onChange:c=>{n("proxyTargets",c)},placeholder:"10003, 群主",ariaLabel:"代答目标"})}),r.jsx(b,{label:"沉默窗口",hint:"TA 多久没在本群发言才代答；0s = 总是代答（如 10m / 30m）",children:r.jsx(y,{value:s.proxySilenceWindow,onChange:c=>{n("proxySilenceWindow",c)},placeholder:"10m",ariaLabel:"代答沉默窗口"})})]}),r.jsx(gs,{model:e})]})}function fs({model:e}){const{status:s}=e,n=(s==null?void 0:s.login)??null,t=n!==null&&(n.nickname!==""||n.userId>0)?(n.nickname!==""?n.nickname:"未取到昵称")+"（"+String(n.userId)+"）":"未登录",i=(s==null?void 0:s.lock)??null;return r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"运行状态"}),r.jsxs("p",{className:"qqr-hint",children:["协议端：",r.jsx("span",{className:"qqr-mono",children:(s==null?void 0:s.config.wsUrl)??"—"})]}),r.jsxs("p",{className:"qqr-hint",children:["登录账号：",t]}),r.jsxs("p",{className:"qqr-hint",children:["单实例锁：",i===null?"本进程持有":"另一个进程持有（pid "+String(i.pid)+"）"," · ","群映射：",s===null?0:s.mappings.length," 个"]})]}),s!==null&&s.problems.length>0?r.jsx(v,{children:r.jsx("ul",{className:"qqr-list",children:s.problems.map(a=>r.jsx("li",{children:r.jsx(R,{tone:"error",children:a})},a))})}):null]})}function bs({model:e}){var t;const{form:s,updateField:n}=e;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(S,{children:[r.jsx(b,{label:"协议端 WebSocket",hint:"NapCat 正向 WS，例如 ws://127.0.0.1:3001",children:r.jsx(y,{value:s.wsUrl,onChange:i=>{n("wsUrl",i)},placeholder:"ws://127.0.0.1:3001",ariaLabel:"协议端 WebSocket 地址"})}),r.jsx(b,{label:"Access Token",hint:e.tokenHint,children:r.jsx(y,{type:"password",value:s.accessToken,onChange:i=>{n("accessToken",i)},placeholder:((t=e.status)==null?void 0:t.config.accessTokenConfigured)===!0?"留空保持不变":"写入新的 token",ariaLabel:"Access Token"})}),r.jsx(b,{label:"机器人 QQ 号",hint:"连接后用 get_login_info 校验，不匹配会断开",children:r.jsx(y,{value:s.selfId,onChange:i=>{n("selfId",i)},inputMode:"numeric",ariaLabel:"机器人 QQ 号"})}),r.jsx(b,{label:"群白名单",hint:"逗号分隔的群号；未列出的群只记日志不回话",children:r.jsx(y,{value:s.groups,onChange:i=>{n("groups",i)},placeholder:"10002",ariaLabel:"群白名单"})})]}),r.jsx(fs,{model:e})]})}function xs({model:e}){var A;const{status:s,presets:n,presetDraft:t,presetEditingId:i,presetBusy:a,updatePresetDraft:l}=e,u=(s==null?void 0:s.modelCatalog)??null,c=(u==null?void 0:u.groups)??[],q=c.find(o=>o.id===t.provider),L=(q==null?void 0:q.models)??[],f=L.find(o=>o.id===t.model),D=(f==null?void 0:f.efforts)??[],x=((A=s==null?void 0:s.permissionCatalog)==null?void 0:A.options)??[],U=[{value:"",label:"不指定（跟随 DSH 默认）"},...c.map(o=>({value:o.id,label:o.name!==""?o.name:o.id}))],_=[{value:"",label:"不指定"},...L.map(o=>({value:o.id,label:o.name!==""?o.name:o.id}))],I=[{value:"",label:"默认"},...D.map(o=>({value:o.id,label:o.name!==""?o.name:o.id}))],N=[{value:"",label:"不指定（跟随当前）"},...x.map(o=>({value:o.value,label:o.name!==""?o.name:o.value}))],M=i!==null,C=s!==null&&!s.presetService.supported?r.jsx(R,{tone:"warn",children:"宿主没有提供 agentPresets 服务（或尚未就绪）：预设会保存在本地，但暂时无法在 DSH 里选到，重启 GUI 后再看。"}):null;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsx("h4",{className:"qqr-subhead",children:"QQ 预设"}),r.jsx("span",{className:"qqr-inline-actions",children:r.jsx(k,{variant:"outline",onClick:e.newPreset,disabled:a,children:"新建预设"})})]}),r.jsx("p",{className:"qqr-hint",children:"预设 = 系统提示词人设（persona）+ 会话模型 / 思考层级 / 权限。保存后 host 动态注册成 DSH agent preset（无需重启 GUI）；已有群会话要发 /new 或「重新绑定」才会换过去。 插件自带的「QQ 群聊」也可以改。"}),C]}),r.jsx(v,{children:n.length===0?r.jsx("p",{className:"qqr-empty",children:"还没有预设。点「新建预设」开始。"}):r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"预设"}),r.jsx("th",{className:"qqr-th",children:"模型"}),r.jsx("th",{className:"qqr-th",children:"权限"}),r.jsx("th",{className:"qqr-th",children:"操作"})]})}),r.jsx("tbody",{children:n.map(o=>r.jsxs("tr",{children:[r.jsxs("td",{className:"qqr-td",children:[r.jsx("span",{children:o.name!==""?o.name:o.id}),r.jsx("span",{className:"qqr-mono qqr-mono-block",children:o.id}),s!==null&&s.presetService.supported&&!s.presetService.registered.includes(o.id)?r.jsx("span",{className:"qqr-hint",children:"（未注册：可能与 DSH 内置预设冲突）"}):null]}),r.jsx("td",{className:"qqr-td",children:o.model.provider===""?"跟随默认":o.model.provider+"/"+o.model.model+(o.model.reasoningEffort===""?"":" · "+o.model.reasoningEffort)}),r.jsx("td",{className:"qqr-td",children:o.permissionPreset===""?"跟随当前":o.permissionPreset}),r.jsx("td",{className:"qqr-td",children:r.jsxs("div",{className:"qqr-row-actions",children:[r.jsx(k,{variant:"outline",onClick:()=>{e.editPreset(o.id)},disabled:a,children:"编辑"}),r.jsx(k,{onClick:()=>{e.deletePreset(o.id)},disabled:a,children:"删除"})]})})]},o.id))})]})})})]}),M?r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:i===""?"新建预设":"编辑预设："+i}),r.jsx("p",{className:"qqr-hint",children:"id 创建后不可修改（DSH 会话按它恢复）；人设会作为系统提示词的人设段。模型 / 权限只对 使用该预设的新会话生效。"})]}),r.jsx(b,{label:"预设 id",hint:"小写字母 / 数字 / 连字符；创建后不可改",children:r.jsx(y,{value:t.id,onChange:o=>{l("id",o)},placeholder:"catgirl",disabled:i!=="",ariaLabel:"预设 id"})}),r.jsx(b,{label:"名称",hint:"显示在 DSH preset 选择器里",children:r.jsx(y,{value:t.name,onChange:o=>{l("name",o)},placeholder:"猫娘",ariaLabel:"预设名称"})}),r.jsx(b,{label:"描述",hint:"可选；一句话说明这个预设的用途",children:r.jsx(y,{value:t.description,onChange:o=>{l("description",o)},placeholder:"群里的猫娘角色",ariaLabel:"预设描述"})}),r.jsxs(v,{children:[r.jsx("span",{className:"qqr-label",children:"人设（persona）"}),r.jsx(ne,{value:t.persona,onChange:o=>{l("persona",o)},placeholder:"你是群里的猫娘助手，说话带「喵」；直接输出最终回复即可，不要用 qq_send 往本群发。",rows:5,ariaLabel:"预设人设"}),r.jsx("p",{className:"qqr-hint",children:"建议保留「直接输出最终回复、不要用 qq_send 往本群发」——不然模型可能用工具回话导致双发。"})]}),u===null?r.jsxs(r.Fragment,{children:[r.jsx(b,{label:"模型 provider",hint:"宿主模型目录不可用，可手填（留空 = 跟随默认）",children:r.jsx(y,{value:t.provider,onChange:o=>{l("provider",o)},placeholder:"deepseek-account",ariaLabel:"模型 provider"})}),r.jsx(b,{label:"模型 id",hint:"留空 = 跟随默认",children:r.jsx(y,{value:t.model,onChange:o=>{l("model",o)},placeholder:"deepseek-flash",ariaLabel:"模型 id"})}),r.jsx(b,{label:"思考层级",hint:"留空 = 跟随模型默认",children:r.jsx(y,{value:t.reasoningEffort,onChange:o=>{l("reasoningEffort",o)},placeholder:"low / medium / high",ariaLabel:"思考层级"})})]}):r.jsxs(r.Fragment,{children:[r.jsx(b,{label:"模型 provider",hint:"留空 = 跟随 DSH 默认模型",children:r.jsx(B,{value:t.provider,onChange:o=>{l("provider",o),l("model",""),l("reasoningEffort","")},options:U,ariaLabel:"模型 provider"})}),r.jsx(b,{label:"模型",hint:"留空 = 不覆盖",children:r.jsx(B,{value:t.model,onChange:o=>{l("model",o),l("reasoningEffort","")},options:_,ariaLabel:"模型"})}),r.jsx(b,{label:"思考层级",hint:"留空 = 跟随模型默认",children:r.jsx(B,{value:t.reasoningEffort,onChange:o=>{l("reasoningEffort",o)},options:I,ariaLabel:"思考层级"})})]}),r.jsx(b,{label:"权限预设",hint:"沙箱 + 审批组合；留空 = 跟随当前",children:r.jsx(B,{value:t.permissionPreset,onChange:o=>{l("permissionPreset",o)},options:N,ariaLabel:"权限预设"})}),r.jsx(b,{label:"排序",hint:"DSH preset 列表里的位置（1..10000）",children:r.jsx(y,{value:t.order,onChange:o=>{l("order",o)},inputMode:"numeric",placeholder:"100",ariaLabel:"预设排序"})}),r.jsx(v,{children:r.jsxs("div",{className:"qqr-headline",children:[r.jsx(k,{variant:"primary",onClick:e.savePreset,disabled:a,children:a?"保存中…":"保存预设"}),r.jsx(k,{variant:"outline",onClick:e.cancelPresetEdit,disabled:a,children:"取消"})]})})]}):null]})}function re(e){const s={image:"图片",sticker:"表情",face:"表情",video:"视频",voice:"语音",file:"文件"};return e.map(n=>n.status==="failed"?n.kind==="file"?"[群文件下载失败]":"[媒体下载失败]":"["+(s[n.kind]??"媒体")+"]")}function qs({model:e}){const{messages:s}=e;if(s.groupId===null)return null;const n=Math.max(1,Math.round(s.windowMs/36e5));return r.jsx(S,{children:r.jsxs(v,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsxs("h4",{className:"qqr-subhead",children:["最近消息 · 群 ",s.groupId]}),r.jsxs("span",{className:"qqr-muted",children:["最近 ",n," 小时 · 最多 20 条"]}),r.jsxs("span",{className:"qqr-inline-actions",children:[r.jsx(k,{onClick:e.reloadMessages,disabled:s.busy,children:"刷新"}),r.jsx(k,{onClick:e.closeMessages,disabled:s.busy,children:"关闭"})]})]}),s.busy?r.jsx("p",{className:"qqr-muted",children:"读取中…"}):s.error!==null?r.jsx(R,{tone:"error",role:"alert",children:s.error}):s.items.length===0?r.jsx("p",{className:"qqr-muted",children:"最近 24 小时没有消息。"}):r.jsx("div",{children:s.items.map(t=>r.jsxs("div",{className:"qqr-msg",children:[r.jsxs("span",{className:"qqr-msg-meta",children:[ae(t.time)," · ",t.name,t.mentionsSelf?"（@你）":"",t.replyToId!==""?"（引用 "+t.replyToId+"）":"",re(t.media).length>0?" "+re(t.media).join(" "):""]}),t.text!==""?r.jsx("span",{className:"qqr-msg-text",children:t.text}):null]},(t.messageId||String(t.time))+":"+String(t.time)))})]})})}function ys({model:e}){const{status:s,projectRows:n,busy:t,loading:i}=e;return r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsx("h4",{className:"qqr-subhead",children:"群项目目录"}),r.jsx("span",{className:"qqr-inline-actions",children:s!==null&&s.mappings.length>0?r.jsxs(k,{onClick:e.clearMappings,disabled:t||i,variant:"outline",children:["清空全部映射（",s.mappings.length,"）"]}):null})]}),r.jsxs("p",{className:"qqr-hint",children:["每个群的聊天记录写进该项目的 ",r.jsx("code",{children:".qq-relay/chat/<群号>/"}),"，DSH 会话也以它为工作目录； 留空表示跟随上面的默认项目。改目录只影响之后新建的会话——已建会话请点「重新绑定」 （旧项目里的聊天记录不会移动）。"]})]}),s===null||n.length===0?r.jsx(v,{children:r.jsx("p",{className:"qqr-empty",children:"还没有群：把群号填进「群白名单」，或在群里 @ 机器人后会自动出现。"})}):r.jsx(v,{children:r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"群号"}),r.jsx("th",{className:"qqr-th",children:"会话"}),r.jsx("th",{className:"qqr-th",children:"项目目录"}),r.jsx("th",{className:"qqr-th",children:"操作"})]})}),r.jsx("tbody",{children:n.map(a=>r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:a.groupId}),r.jsx("td",{className:"qqr-td",children:a.sessionId===""?r.jsx("span",{className:"qqr-muted",children:"未创建"}):r.jsxs(r.Fragment,{children:[r.jsx("span",{children:a.sessionTitle!==""?a.sessionTitle:"—"}),r.jsx("span",{className:"qqr-mono qqr-mono-block",children:a.sessionId})]})}),r.jsx("td",{className:"qqr-td qqr-col-dir",children:r.jsx(y,{value:a.projectDir,onChange:l=>{e.updateProjectRow(a.groupId,l)},placeholder:s.config.workspace,ariaLabel:"群 "+String(a.groupId)+" 的项目目录"})}),r.jsx("td",{className:"qqr-td",children:r.jsxs("div",{className:"qqr-row-actions",children:[r.jsx(k,{variant:"outline",onClick:()=>{e.rebind(a.groupId)},disabled:t||a.sessionId==="",children:"重新绑定"}),r.jsx(k,{onClick:()=>{e.openMessages(a.groupId)},disabled:t||i,children:"消息"}),r.jsx(k,{onClick:()=>{e.deleteMapping(a.groupId)},disabled:t||a.sessionId==="",children:"解除绑定"})]})})]},a.groupId))})]})})})]})}function js({model:e}){const{form:s,updateField:n}=e;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(S,{children:[r.jsx(b,{label:"默认项目目录",hint:"未单独配置群项目时，聊天记录与 DSH 会话使用的目录",children:r.jsx(y,{value:s.workspace,onChange:t=>{n("workspace",t)},placeholder:"~/dsh/qq-relay-ws",ariaLabel:"默认项目目录"})}),r.jsx(b,{label:"会话标题模板",hint:"可用 {groupName} / {groupId}",children:r.jsx(y,{value:s.sessionTitle,onChange:t=>{n("sessionTitle",t)},placeholder:"QQ群：{groupName}",ariaLabel:"会话标题模板"})})]}),r.jsx(ys,{model:e}),r.jsx(qs,{model:e})]})}function vs({model:e}){const{form:s,updateField:n}=e;return r.jsx("div",{className:"qqr-panel",children:r.jsxs(S,{children:[r.jsx(b,{label:"聊天记录保留天数",hint:"0 = 永不自动删除；7..3650 = 自动清理天数（保存后生效）",children:r.jsx(y,{value:s.chatRetentionDays,onChange:t=>{n("chatRetentionDays",t)},inputMode:"numeric",placeholder:"0",ariaLabel:"聊天记录保留天数"})}),r.jsxs(v,{children:[r.jsxs("p",{className:"qqr-hint",children:["聊天记录与媒体文件默认",r.jsx("b",{children:"永不自动删除"}),"（保留天数 0）。填 7..3650 保存后， 宿主启动时与每天各清理一次超过该天数的 ",r.jsx("code",{children:".qq-relay/chat/"})," 日文件与",r.jsx("code",{children:" .qq-relay/media/"})," 日期目录。"]}),r.jsxs("div",{className:"qqr-headline",children:[r.jsx(k,{variant:"outline",onClick:e.cleanup,disabled:e.busy||e.loading,children:"立即清理"}),r.jsx("span",{className:"qqr-hint",children:"用上面的天数（1..3650）清一次，不改配置、不动群映射；删除后不可恢复。"})]})]})]})})}function ws(){const e=hs();Re();const s=e.tab==="connection"?r.jsx(bs,{model:e}):e.tab==="project"?r.jsx(js,{model:e}):e.tab==="behavior"?r.jsx(ms,{model:e}):e.tab==="presets"?r.jsx(xs,{model:e}):r.jsx(vs,{model:e});return r.jsxs("div",{className:"qqr-root","data-plugin":"dsh-qq-relay",children:[r.jsxs("div",{className:"qqr-head",children:[r.jsx(Ae,{line:e.statusLine}),r.jsxs("div",{className:"qqr-actions",children:[r.jsx(k,{onClick:e.refresh,disabled:e.loading||e.busy,children:"刷新"}),r.jsx(k,{variant:"outline",onClick:e.reconnect,disabled:e.loading||e.busy,children:"重新连接"}),r.jsx(k,{variant:"primary",onClick:e.save,disabled:e.loading||e.busy,children:"保存并重连"})]})]}),r.jsx("nav",{className:"qqr-tabs",role:"tablist","aria-label":"QQ 机器人配置",children:ds.map(n=>r.jsx("button",{type:"button",role:"tab",id:"qqr-tab-"+n.id,className:"qqr-tab","data-active":e.tab===n.id,"aria-selected":e.tab===n.id,"aria-controls":"qqr-tabpanel",onClick:()=>{e.setTab(n.id)},children:n.label},n.id))}),e.error!==null?r.jsx(R,{tone:"error",role:"alert",children:e.error}):null,e.notice!==null?r.jsx(R,{tone:"ok",role:"status",children:e.notice}):null,e.dirty?r.jsx(R,{tone:"warn",children:"有未保存的修改。"}):null,r.jsx("div",{id:"qqr-tabpanel",role:"tabpanel","aria-labelledby":"qqr-tab-"+e.tab,children:s}),r.jsxs("p",{className:"qqr-footer",children:["配置来源：profile 的 ",r.jsx("code",{children:"cordis.patch.yml"}),"，本页保存的覆盖写入",r.jsx("code",{children:" ~/.dsh/storages/dsh-qq-relay/settings.json"}),"；预设写入同目录的",r.jsx("code",{children:"presets.json"})," 并在启动时动态注册。token 只写不读，页面永远看不到明文。"]})]})}const ks="dsh-qq-relay",Ss=["slots"],Ns="dsh-qq-relay";function Cs(e){var t;const s=e,n=(t=s==null?void 0:s.get)==null?void 0:t.call(s,"slots");if(!(n===void 0||typeof n.inject!="function"||typeof n.register!="function"))try{n.inject("plugins.bundle.config",()=>n.register({name:"plugins.bundle.config",key:Ns},ws))}catch{}}exports.apply=Cs;exports.inject=Ss;exports.name=ks;

		return module.exports;
	}
});
