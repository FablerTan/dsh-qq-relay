window.__ModuleLoader__.load({
	id: "dsh-qq-relay",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		"use strict";Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const r=require("react/jsx-runtime"),h=require("react");function he({tone:e}){return r.jsx("span",{className:"qqr-dot","data-tone":e,"aria-hidden":"true"})}function S(e){return r.jsx("button",{type:"button",className:"qqr-btn","data-variant":e.variant??"ghost",onClick:e.onClick,disabled:e.disabled===!0,title:e.title,children:e.children})}function I({children:e}){return r.jsx("div",{className:"qqr-card",children:e})}function q(e){return r.jsxs("div",{className:"qqr-row",children:[r.jsxs("div",{className:"qqr-row-text",children:[r.jsx("span",{className:"qqr-label",children:e.label}),e.hint!==void 0?r.jsx("span",{className:"qqr-hint",children:e.hint}):null]}),r.jsx("div",{className:"qqr-control",children:e.children})]})}function x({children:e}){return r.jsx("div",{className:"qqr-block",children:e})}function N(e){return r.jsx("p",{className:"qqr-line","data-tone":e.tone??"muted",role:e.role,children:e.children})}function me({line:e}){return r.jsxs("span",{className:"qqr-status",children:[r.jsx(he,{tone:e.tone}),r.jsx("span",{children:e.text})]})}function K(e){return r.jsx("button",{type:"button",role:"switch","aria-checked":e.checked,"aria-label":e.ariaLabel,className:"qqr-toggle","data-on":e.checked?"true":"false",disabled:e.disabled===!0,onClick:()=>{e.onChange(!e.checked)},children:r.jsx("span",{className:"qqr-toggle-knob","aria-hidden":"true"})})}function fe(e){return r.jsx("textarea",{className:"qqr-textarea",value:e.value,placeholder:e.placeholder,rows:e.rows??4,spellCheck:!1,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)}})}function Y(e){return r.jsx("select",{className:"qqr-select",value:e.value,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)},children:e.options.map(s=>r.jsx("option",{value:s.value,disabled:s.disabled===!0,title:s.title,children:s.label},s.value))})}function v(e){return r.jsx("input",{className:"qqr-input",type:e.type??"text",value:e.value,placeholder:e.placeholder,inputMode:e.inputMode,autoComplete:e.autoComplete??"off",spellCheck:!1,"aria-label":e.ariaLabel,disabled:e.disabled===!0,onChange:s=>{e.onChange(s.target.value)}})}const ce="dsh-qq-relay-client-style",Ge=`/* dsh-qq-relay 配置页样式：全部走宿主 ui-theme 的 --dsw-* 语义 token，
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
		`;function $e(){h.useEffect(()=>{if(document.getElementById(ce)!==null)return;const e=document.createElement("style");return e.id=ce,e.textContent=Ge,document.head.appendChild(e),()=>{e.remove()}},[])}const Ye="/dsh-qq-relay/api/status",Je="/dsh-qq-relay/api/config",Ke="/dsh-qq-relay/api/reconnect",Ve="/dsh-qq-relay/api/rebind",Xe="/dsh-qq-relay/api/cleanup",Ze="/dsh-qq-relay/api/messages",es="/dsh-qq-relay/api/mapping/delete",ss="/dsh-qq-relay/api/mapping/clear",rs="/dsh-qq-relay/api/presets",ns="/dsh-qq-relay/api/presets/delete",ts="/dsh-qq-relay/api/comfy/test",as="/dsh-qq-relay/api/env",is="/dsh-qq-relay/api/env/action";function p(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function ls(e){return Array.isArray(e)?e.filter(p).map(s=>({groupId:typeof s.groupId=="number"?s.groupId:0,pending:typeof s.pending=="number"?s.pending:0,lastBotSpeakAt:typeof s.lastBotSpeakAt=="number"?s.lastBotSpeakAt:0,lastReplyAt:typeof s.lastReplyAt=="number"?s.lastReplyAt:0,lastUserMessageAt:typeof s.lastUserMessageAt=="number"?s.lastUserMessageAt:0,cooldownUntil:typeof s.cooldownUntil=="number"?s.cooldownUntil:0,evaluating:s.evaluating===!0,dshBusy:s.dshBusy===!0})):[]}function os(e){return Array.isArray(e)?e.filter(p).map(s=>({messageId:typeof s.messageId=="string"?s.messageId:"",time:typeof s.time=="number"?s.time:0,name:typeof s.name=="string"?s.name:"",text:typeof s.text=="string"?s.text:"",mentionsSelf:s.mentionsSelf===!0,replyToId:typeof s.replyToId=="string"?s.replyToId:"",media:Array.isArray(s.media)?s.media.filter(p).map(n=>({kind:typeof n.kind=="string"?n.kind:"",status:typeof n.status=="string"?n.status:"",path:typeof n.path=="string"?n.path:""})):[]})):[]}function cs(e){return Array.isArray(e)?e.filter(p).map(s=>({groupId:typeof s.groupId=="number"?s.groupId:0,sessionId:typeof s.sessionId=="string"?s.sessionId:"",error:typeof s.error=="string"?s.error:"",at:typeof s.at=="number"?s.at:0})).filter(s=>s.sessionId!==""):[]}function ie(e){return Array.isArray(e)?e.filter(p).map(s=>{const n=p(s.model)?s.model:{};return{id:typeof s.id=="string"?s.id:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:"",persona:typeof s.persona=="string"?s.persona:"",model:{provider:typeof n.provider=="string"?n.provider:"",model:typeof n.model=="string"?n.model:"",reasoningEffort:typeof n.reasoningEffort=="string"?n.reasoningEffort:""},permissionPreset:typeof s.permissionPreset=="string"?s.permissionPreset:"",order:typeof s.order=="number"?s.order:100}}).filter(s=>s.id!==""):[]}function ds(e){if(!p(e)||!Array.isArray(e.groups))return null;const s=e.groups.filter(p).map(t=>({id:typeof t.id=="string"?t.id:"",name:typeof t.name=="string"?t.name:"",models:Array.isArray(t.models)?t.models.filter(p).map(i=>{const a=p(i.reasoning)?i.reasoning:null;return{id:typeof i.id=="string"?i.id:"",name:typeof i.name=="string"?i.name:"",description:typeof i.description=="string"?i.description:"",efforts:a!==null&&Array.isArray(a.efforts)?a.efforts.filter(p).map(l=>({id:typeof l.id=="string"?l.id:"",name:typeof l.name=="string"?l.name:"",description:typeof l.description=="string"?l.description:""})):[],defaultEffort:a!==null&&typeof a.defaultEffort=="string"?a.defaultEffort:""}}):[]})),n=p(e.default)?e.default:{};return{groups:s,default:{provider:typeof n.provider=="string"?n.provider:"",model:typeof n.model=="string"?n.model:"",reasoningEffort:typeof n.reasoningEffort=="string"?n.reasoningEffort:""}}}function us(e){return!p(e)||!Array.isArray(e.options)?null:{options:e.options.filter(p).map(s=>({value:typeof s.value=="string"?s.value:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:""})).filter(s=>s.value!==""),defaultPreset:typeof e.defaultPreset=="string"?e.defaultPreset:""}}function ps(e){return Array.isArray(e)?e.filter(p).map(s=>({id:typeof s.id=="string"?s.id:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:"",broken:typeof s.broken=="string"?s.broken:""})).filter(s=>s.id!==""):[]}function le(e){return p(e)?{running:typeof e.running=="number"?e.running:0,pending:typeof e.pending=="number"?e.pending:0}:{running:0,pending:0}}function hs(e){return p(e)?{enabled:e.enabled===!0,baseUrl:typeof e.baseUrl=="string"&&e.baseUrl!==""?e.baseUrl:"http://192.168.1.10:8188",timeoutMs:typeof e.timeoutMs=="number"?e.timeoutMs:3e4,skillEnabled:e.skillEnabled!==!1}:{enabled:!1,baseUrl:"http://192.168.1.10:8188",timeoutMs:3e4,skillEnabled:!0}}function ms(e){if(Array.isArray(e.skills))return e.skills.filter(p).map(t=>({name:typeof t.name=="string"?t.name:"",loaded:t.loaded===!0,error:typeof t.error=="string"?t.error:""})).filter(t=>t.name!=="");const s=p(e.skill)?e.skill:null;if(s===null)return[];const n=typeof s.name=="string"?s.name:"";return n===""?[]:[{name:n,loaded:s.loaded===!0,error:typeof s.error=="string"?s.error:""}]}function fs(e){return p(e)?{enabled:e.enabled===!0,baseUrl:typeof e.baseUrl=="string"?e.baseUrl:"",timeoutMs:typeof e.timeoutMs=="number"?e.timeoutMs:3e4,skillEnabled:e.skillEnabled!==!1,supported:e.supported===!0,reachable:e.reachable===!0,checking:e.checking===!0,checkedAt:typeof e.checkedAt=="number"?e.checkedAt:0,error:typeof e.error=="string"?e.error:"",version:typeof e.version=="string"?e.version:"",device:typeof e.device=="string"?e.device:"",queue:le(e.queue),skills:ms(e)}:{enabled:!1,baseUrl:"",timeoutMs:3e4,skillEnabled:!1,supported:!1,reachable:!1,checking:!1,checkedAt:0,error:"",version:"",device:"",queue:{running:0,pending:0},skills:[]}}function gs(e,s){return p(e)?{target:typeof e.target=="string"?e.target:s.baseUrl,reachable:e.reachable===!0,version:typeof e.version=="string"?e.version:"",device:typeof e.device=="string"?e.device:"",queue:le(e.queue),error:typeof e.error=="string"?e.error:"",checkedAt:typeof e.checkedAt=="number"?e.checkedAt:0,latencyMs:typeof e.latencyMs=="number"?e.latencyMs:0}:{target:s.baseUrl,reachable:s.reachable,version:s.version,device:s.device,queue:le(s.queue),error:s.error,checkedAt:s.checkedAt,latencyMs:0}}function bs(e){return p(e)?{enabled:e.enabled!==!1,dir:typeof e.dir=="string"&&e.dir!==""?e.dir:"~/napcat-docker",webuiTokenConfigured:e.webuiTokenConfigured===!0}:{enabled:!0,dir:"~/napcat-docker",webuiTokenConfigured:!1}}function xs(e){return Array.isArray(e)?e.filter(p).map(s=>({id:typeof s.id=="string"?s.id:"",title:typeof s.title=="string"?s.title:"",status:typeof s.status=="string"?s.status:"skip",detail:typeof s.detail=="string"?s.detail:"",evidence:Array.isArray(s.evidence)?s.evidence.filter(n=>typeof n=="string"):[],actions:Array.isArray(s.actions)?s.actions.filter(n=>typeof n=="string"):[]})).filter(s=>s.id!==""):[]}function qs(e){return Array.isArray(e)?e.filter(p).map(s=>({id:typeof s.id=="string"?s.id:"",title:typeof s.title=="string"?s.title:"",kind:typeof s.kind=="string"?s.kind:"none",confirm:s.confirm===!0,description:typeof s.description=="string"?s.description:""})).filter(s=>s.id!==""):[]}function ys(e){return Array.isArray(e)?e.filter(p).map(s=>({seq:typeof s.seq=="number"?s.seq:0,at:typeof s.at=="number"?s.at:0,level:typeof s.level=="string"?s.level:"info",text:typeof s.text=="string"?s.text:""})):[]}function de(e){if(!p(e))return null;const s=p(e.summary)?e.summary:{},n=p(e.running)?e.running:null,t=p(e.log)?e.log:{};return{supported:e.supported===!0,platform:typeof e.platform=="string"?e.platform:"",enabled:e.enabled!==!1,dir:typeof e.dir=="string"?e.dir:"",webuiTokenConfigured:e.webuiTokenConfigured===!0,checking:e.checking===!0,checkedAt:typeof e.checkedAt=="number"?e.checkedAt:0,running:n===null?null:{action:typeof n.action=="string"?n.action:"",startedAt:typeof n.startedAt=="number"?n.startedAt:0},summary:{ok:typeof s.ok=="number"?s.ok:0,warn:typeof s.warn=="number"?s.warn:0,error:typeof s.error=="number"?s.error:0,skip:typeof s.skip=="number"?s.skip:0},steps:xs(e.steps),actions:qs(e.actions),log:{cursor:typeof t.cursor=="number"?t.cursor:0,entries:ys(t.entries)}}}function G(e){if(!p(e))return null;const s=p(e.config)?e.config:{},n=p(e.login)?e.login:null,t=p(e.lock)?e.lock:null,i=Array.isArray(e.mappings)?e.mappings.filter(p):[];return{plugin:typeof e.plugin=="string"?e.plugin:"dsh-qq-relay",started:e.started===!0,connected:e.connected===!0,login:n===null?null:{userId:typeof n.userId=="number"?n.userId:0,nickname:typeof n.nickname=="string"?n.nickname:""},problems:Array.isArray(e.problems)?e.problems.filter(a=>typeof a=="string"):[],lock:t===null?null:{pid:typeof t.pid=="number"?t.pid:0,startedAt:typeof t.startedAt=="number"?t.startedAt:0,host:typeof t.host=="string"?t.host:void 0},config:{wsUrl:typeof s.wsUrl=="string"?s.wsUrl:"",selfId:typeof s.selfId=="number"?s.selfId:0,groups:Array.isArray(s.groups)?s.groups.filter(a=>typeof a=="number"):[],workspace:typeof s.workspace=="string"?s.workspace:"",groupWorkspaces:p(s.groupWorkspaces)?Object.fromEntries(Object.entries(s.groupWorkspaces).filter(([a,l])=>/^\d+$/u.test(a)&&typeof l=="string"&&l!=="").map(([a,l])=>[a,l])):{},chatRetentionDays:typeof s.chatRetentionDays=="number"?s.chatRetentionDays:0,gate:p(s.gate)?{debounceMs:typeof s.gate.debounceMs=="number"?s.gate.debounceMs:5e3,fastMinReplyIntervalMs:typeof s.gate.fastMinReplyIntervalMs=="number"?s.gate.fastMinReplyIntervalMs:45e3,jevThreshold:typeof s.gate.jevThreshold=="number"?s.gate.jevThreshold:.7}:{debounceMs:5e3,fastMinReplyIntervalMs:45e3,jevThreshold:.7},gateSupported:p(s.gate),proxyReply:p(s.proxyReply)?{enabled:s.proxyReply.enabled===!0,targets:Array.isArray(s.proxyReply.targets)?s.proxyReply.targets.filter(a=>typeof a=="string"&&a!==""):[],silenceWindowMs:typeof s.proxyReply.silenceWindowMs=="number"?s.proxyReply.silenceWindowMs:600*1e3}:{enabled:!1,targets:[],silenceWindowMs:600*1e3},agentPreset:typeof s.agentPreset=="string"?s.agentPreset:"",persona:p(s.persona)?{enabled:s.persona.enabled===!0,text:typeof s.persona.text=="string"?s.persona.text:""}:{enabled:!1,text:""},comfy:hs(s.comfy),comfySupported:s.comfySupported===!0,environment:bs(s.environment),environmentSupported:p(s.environment),sessionTitle:typeof s.sessionTitle=="string"?s.sessionTitle:"",replyChunkSize:typeof s.replyChunkSize=="number"?s.replyChunkSize:0,commandPrefixes:Array.isArray(s.commandPrefixes)?s.commandPrefixes.filter(a=>typeof a=="string"):[],accessTokenConfigured:s.accessTokenConfigured===!0,accessTokenSource:s.accessTokenSource==="settings"?"settings":"profile"},agentPresets:p(e.agentPresets)?{supported:e.agentPresets.supported===!0,items:ps(e.agentPresets.items),missing:e.agentPresets.missing===!0}:{supported:!1,items:[],missing:!1},presets:ie(e.presets),presetService:p(e.presetService)?{supported:e.presetService.supported===!0,registered:Array.isArray(e.presetService.registered)?e.presetService.registered.filter(a=>typeof a=="string"):[]}:{supported:!1,registered:[]},modelCatalog:ds(e.modelCatalog),permissionCatalog:us(e.permissionCatalog),comfy:fs(e.comfy),gate:p(e.gate)?{enabled:e.gate.enabled===!0,classifier:typeof e.gate.classifier=="string"?e.gate.classifier:null,model:typeof e.gate.model=="string"?e.gate.model:"",threshold:typeof e.gate.threshold=="number"?e.gate.threshold:0,slowTimer:typeof e.gate.slowTimer=="number"?e.gate.slowTimer:0,pendingMessages:typeof e.gate.pendingMessages=="number"?e.gate.pendingMessages:0,pendingGroups:typeof e.gate.pendingGroups=="number"?e.gate.pendingGroups:0,timers:typeof e.gate.timers=="number"?e.gate.timers:0,queue:typeof e.gate.queue=="number"?e.gate.queue:0,sendQueue:typeof e.gate.sendQueue=="number"?e.gate.sendQueue:0,groups:ls(e.gate.groups)}:null,workspace:{attachIssues:p(e.workspace)?cs(e.workspace.attachIssues):[]},mappings:i.map(a=>({groupId:typeof a.groupId=="number"?a.groupId:0,sessionId:typeof a.sessionId=="string"?a.sessionId:"",title:typeof a.title=="string"?a.title:"",workspacePath:typeof a.workspacePath=="string"?a.workspacePath:"",createdAt:typeof a.createdAt=="number"?a.createdAt:0}))}}async function W(e,s,n){let t;try{t=await e(s,{cache:"no-store",...n})}catch(l){return{ok:!1,error:{code:"NETWORK",message:"连不上 host"+(l instanceof Error&&l.message!==""?"："+l.message:"")}}}let i=null;try{i=await t.json()}catch{i=null}if(p(i)&&i.ok===!0)return{ok:!0,value:i.value};const a=p(i)&&p(i.error)?i.error:null;return{ok:!1,error:{code:a!==null&&typeof a.code=="string"?a.code:"HTTP_"+String(t.status),message:a!==null&&typeof a.message=="string"&&a.message!==""?a.message:"请求失败（HTTP "+String(t.status)+"）。"}}}function H(){return{ok:!1,error:{code:"BAD_PAYLOAD",message:"host 返回了无法识别的数据。"}}}function ge(e){const s=e.fetch;async function n(i,a){const l=await W(s,i,a);if(!l.ok)return l;const o=G(l.value);return o!==null?{ok:!0,value:o}:H()}const t=i=>({method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(i)});return{getStatus:()=>n(Ye),saveConfig:i=>n(Je,t(i)),reconnect:()=>n(Ke,{method:"POST"}),rebind:i=>n(Ve,t({groupId:i})),async cleanup(i){const a=await W(s,Xe,t({days:i}));if(!a.ok)return a;const l=a.value,o=p(l)?G(l.status):null,u=p(l)&&p(l.cleanup)?l.cleanup:null;return o===null||u===null?H():{ok:!0,value:{cleanup:{days:typeof u.days=="number"?u.days:i,chat:typeof u.chat=="number"?u.chat:0,media:typeof u.media=="number"?u.media:0,at:typeof u.at=="number"?u.at:0},status:o}}},async messages(i,a){const l=new URLSearchParams({groupId:String(i)});typeof a=="number"&&Number.isFinite(a)&&l.set("limit",String(a));const o=await W(s,Ze+"?"+l.toString());return o.ok?p(o.value)?{ok:!0,value:{groupId:typeof o.value.groupId=="number"?o.value.groupId:i,limit:typeof o.value.limit=="number"?o.value.limit:0,windowMs:typeof o.value.windowMs=="number"?o.value.windowMs:0,messages:os(o.value.messages)}}:H():o},async savePreset(i){const a=await W(s,rs,t({preset:i}));if(!a.ok)return a;const l=a.value,o=p(l)?G(l.status):null;return o===null||!p(l)?H():{ok:!0,value:{presets:ie(l.presets),status:o}}},async deletePreset(i){const a=await W(s,ns,t({id:i}));if(!a.ok)return a;const l=a.value,o=p(l)?G(l.status):null;return o===null||!p(l)?H():{ok:!0,value:{presets:ie(l.presets),status:o}}},async getEnv(){const i=await W(s,as);if(!i.ok)return i;const a=de(i.value);return a!==null?{ok:!0,value:a}:H()},async envAction(i){const a={action:i.action};i.confirm===!0&&(a.confirm=!0);const l=await W(s,is,t(a));if(!l.ok)return l;const o=l.value,u=p(o)?de(o.status):null;return u===null||!p(o)?H():{ok:!0,value:{action:typeof o.action=="string"?o.action:i.action,status:u,logCursor:typeof o.logCursor=="number"?o.logCursor:0,accepted:o.accepted===!0,url:typeof o.url=="string"?o.url:void 0}}},async testComfy(i){const a={};typeof(i==null?void 0:i.baseUrl)=="string"&&i.baseUrl.trim()!==""&&(a.baseUrl=i.baseUrl.trim()),typeof(i==null?void 0:i.timeoutMs)=="number"&&Number.isFinite(i.timeoutMs)&&(a.timeoutMs=i.timeoutMs);const l=await W(s,ts,t(a));if(!l.ok)return l;const o=l.value,u=p(o)?G(o.status):null;return u===null||!p(o)?H():{ok:!0,value:{probe:gs(o.probe,u.comfy),status:u}}},async deleteMapping(i){const a=await W(s,es,t({groupId:i}));if(!a.ok)return a;const l=a.value,o=p(l)?G(l.status):null,u=p(l)&&p(l.mapping)?l.mapping:null;return o===null||u===null?H():{ok:!0,value:{mapping:{groupId:typeof u.groupId=="number"?u.groupId:i,removed:u.removed===!0},status:o}}},async clearMappings(){const i=await W(s,ss,{method:"POST"});if(!i.ok)return i;const a=i.value,l=p(a)?G(a.status):null,o=p(a)&&p(a.mappings)?a.mappings:null;return l===null||o===null?H():{ok:!0,value:{mappings:{cleared:typeof o.cleared=="number"?o.cleared:0},status:l}}}}}function js(){return{wsUrl:"",accessToken:"",selfId:"",groups:"",workspace:"",chatRetentionDays:"",gateDebounce:"",gateFastMinReplyInterval:"",gateJevThreshold:"",sessionTitle:"",replyChunkSize:"",commandPrefixes:"",proxyEnabled:!1,proxyTargets:"",proxySilenceWindow:"",agentPreset:"",personaEnabled:!1,personaText:"",comfyEnabled:!1,comfyBaseUrl:"",comfyTimeout:"30s",comfySkillEnabled:!0,envEnabled:!0,envDir:"",envWebuiToken:""}}function be(e){return{wsUrl:e.wsUrl,accessToken:"",selfId:e.selfId>0?String(e.selfId):"",groups:e.groups.join(", "),workspace:e.workspace,chatRetentionDays:String(e.chatRetentionDays),gateDebounce:se(e.gate.debounceMs),gateFastMinReplyInterval:se(e.gate.fastMinReplyIntervalMs),gateJevThreshold:String(e.gate.jevThreshold),sessionTitle:e.sessionTitle,replyChunkSize:e.replyChunkSize>0?String(e.replyChunkSize):"",commandPrefixes:e.commandPrefixes.join(", "),proxyEnabled:e.proxyReply.enabled,proxyTargets:e.proxyReply.targets.join(", "),proxySilenceWindow:se(e.proxyReply.silenceWindowMs),agentPreset:e.agentPreset,personaEnabled:e.persona.enabled,personaText:e.persona.text,comfyEnabled:e.comfy.enabled,comfyBaseUrl:e.comfy.baseUrl,comfyTimeout:se(e.comfy.timeoutMs),comfySkillEnabled:e.comfy.skillEnabled,envEnabled:e.environment.enabled,envDir:e.environment.dir,envWebuiToken:""}}function se(e){return!Number.isFinite(e)||e<=0?"0s":e%(3600*1e3)===0?String(e/(3600*1e3))+"h":e%(60*1e3)===0?String(e/(60*1e3))+"m":e%1e3===0?String(e/1e3)+"s":String(e)+"ms"}function oe(e,s=Date.now()){if(!Number.isFinite(e)||e<=0)return"";const n=Math.max(0,s-e);return n<60*1e3?"刚刚":n<3600*1e3?Math.floor(n/(60*1e3))+" 分钟前":n<1440*60*1e3?Math.floor(n/(3600*1e3))+" 小时前":Math.floor(n/(1440*60*1e3))+" 天前"}function xe(e){if(!Number.isFinite(e)||e<=0)return"--:--:--";const s=new Date(e),n=t=>String(t).padStart(2,"0");return n(s.getHours())+":"+n(s.getMinutes())+":"+n(s.getSeconds())}function J(e){const s=/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/iu.exec(e.trim());if(s===null)return null;const t={ms:1,s:1e3,m:60*1e3,h:3600*1e3}[s[2].toLowerCase()];if(t===void 0)return null;const i=Number(s[1]);return!Number.isFinite(i)||i<0?null:Math.round(i*t)}function vs(e){return e.split(/[,，\s]+/u).map(s=>s.trim()).filter(s=>s!=="")}function ks(e){const s=[],n=[];for(const t of vs(e)){if(!/^\d+$/u.test(t)){s.push("群号必须是数字："+t);continue}const i=Number(t);if(!Number.isSafeInteger(i)||i<=0){s.push("群号必须是正整数："+t);continue}n.includes(i)||n.push(i)}return s.length>0?{ok:!1,problems:s}:{ok:!0,value:n}}function ws(e){const s=[],n=new Set;for(const t of e.split(/[,，]/u)){const i=t.trim().replace(/^@/u,"").trim();if(i==="")continue;const a=i.toLowerCase();n.has(a)||(n.add(a),s.push(i))}return s}function Ns(e){return{ok:!0,value:e.split(/[,，]/u).map(n=>n.trim()).filter(n=>n!=="")}}function Cs(e){const s=[],n={},t=e.wsUrl.trim();t===""?s.push("wsUrl 必填"):n.wsUrl=t,e.accessToken.trim()!==""&&(n.accessToken=e.accessToken.trim());const i=e.selfId.trim();!/^\d+$/u.test(i)||Number(i)<=0?s.push("selfId 必须是正整数"):n.selfId=Number(i);const a=ks(e.groups);a.ok?n.groups=a.value:s.push(...a.problems);const l=e.workspace.trim();l===""?s.push("workspace 必填"):n.workspace=l;const o=e.chatRetentionDays.trim(),u=o===""?"0":o,y=Number(u);!/^\d+$/u.test(u)||!Number.isInteger(y)||!(y===0||y>=7&&y<=3650)?s.push("聊天记录保留天数必须是 0（永不自动删除）或 7..3650 的整数"):n.chatRetentionDays=y;const T=e.sessionTitle.trim();T===""?s.push("sessionTitle 必填"):n.sessionTitle=T;const f=e.replyChunkSize.trim(),b=Number(f);!/^\d+$/u.test(f)||!Number.isInteger(b)||b<100||b>2e4?s.push("replyChunkSize 必须是 100..20000 的整数"):n.replyChunkSize=b;const j=Ns(e.commandPrefixes);n.commandPrefixes=j.value;const P=ws(e.proxyTargets);e.proxyEnabled&&P.length===0&&s.push("开启代答时至少要填一个目标（QQ 号或群名片 / 昵称）");const w=e.proxySilenceWindow.trim(),E=J(w);E===null||E>1440*60*1e3?s.push("代答沉默窗口必须是 0..24h 的时长（如 10m / 30m；0s = 总是代答）"):n.proxyReply={enabled:e.proxyEnabled,targets:P,silenceWindow:w};const A=e.agentPreset.trim();n.agentPreset=A;const B=e.personaText.trim();e.personaEnabled&&B===""&&s.push("开启轻量人设时至少要填一段人设文本"),B.length>4e3&&s.push("轻量人设最多 4000 字符"),n.persona={enabled:e.personaEnabled,text:B};const F=e.comfyBaseUrl.trim();F===""&&s.push("ComfyUI 服务地址必填（如 http://192.168.1.10:8188）");const z=e.comfyTimeout.trim(),d=J(z);d===null||d<3e3||d>12e4?s.push("ComfyUI 超时必须是 3s..120s 的时长（如 30s）"):F!==""&&(n.comfy={enabled:e.comfyEnabled,baseUrl:F,timeoutMs:d,skillEnabled:e.comfySkillEnabled});const U=e.envDir.trim();if(U===""?s.push("环境目录必填（默认 ~/napcat-docker）"):U!=="~"&&!U.startsWith("~/")&&!U.startsWith("/")?s.push("环境目录必须是绝对路径或 ~/ 开头"):U.split("/").includes("..")&&s.push("环境目录不能包含 .."),U!==""&&!s.some($=>$.startsWith("环境目录"))){const $={enabled:e.envEnabled,dir:U},Z=e.envWebuiToken.trim();Z!==""&&($.webuiToken=Z),n.environment=$}const _={},V=e.gateDebounce.trim(),O=J(V);O===null||O>60*1e3?s.push("去抖窗口必须是 0..60s 的时长（如 3s / 500ms）"):_.debounce=V;const X=e.gateFastMinReplyInterval.trim(),Q=J(X);Q===null||Q>3600*1e3?s.push("最小发言间隔必须是 0..60m 的时长（如 10s / 45s）"):_.fastMinReplyInterval=X;const k=e.gateJevThreshold.trim(),D=Number(k);return k===""||!Number.isFinite(D)||D<0||D>1?s.push("jev 阈值必须是 0..1 的数字（如 0.7）"):_.jevThreshold=D,n.gate=_,s.length>0?{ok:!1,problems:s}:{ok:!0,value:n}}function Ss(e,s){const n=be(s);return Object.keys(n).some(t=>e[t]!==n[t])}function re(){return{id:"",name:"",description:"",persona:"",provider:"",model:"",reasoningEffort:"",permissionPreset:"",order:"100"}}function Is(e){return{id:e.id,name:e.name,description:e.description,persona:e.persona,provider:e.model.provider,model:e.model.model,reasoningEffort:e.model.reasoningEffort,permissionPreset:e.permissionPreset,order:String(e.order)}}function Ts(e){const s=[],n=e.id.trim();/^[a-z0-9][a-z0-9-]{0,40}$/u.test(n)||s.push("预设 id 只能用小写字母 / 数字 / 连字符，且不超过 41 字符");const t=e.name.trim();t===""&&s.push("预设名称必填");const i=e.persona.trim();i===""&&s.push("人设文本必填"),i.length>4e3&&s.push("人设文本最多 4000 字符");const a=e.provider.trim(),l=e.model.trim();a===""!=(l==="")&&s.push("模型必须同时选 provider 与 model（或都留空）");const o=e.order.trim()===""?"100":e.order.trim(),u=Number(o);return(!/^\d+$/u.test(o)||!Number.isInteger(u)||u<1||u>1e4)&&s.push("预设排序必须是 1..10000 的整数"),s.length>0?{ok:!1,problems:s}:{ok:!0,value:{id:n,name:t,description:e.description.trim(),persona:i,model:{provider:a,model:l,reasoningEffort:a===""?"":e.reasoningEffort.trim()},permissionPreset:e.permissionPreset.trim(),order:u}}}function qe(e){const s=new Map,n=t=>{let i=s.get(t);return i===void 0&&(i={groupId:t,sessionId:"",sessionTitle:"",projectDir:""},s.set(t,i)),i};for(const t of e.config.groups)n(t);for(const[t,i]of Object.entries(e.config.groupWorkspaces)){const a=Number(t);!Number.isSafeInteger(a)||a<=0||(n(a).projectDir=i)}for(const t of e.mappings){const i=n(t.groupId);i.sessionId=t.sessionId,i.sessionTitle=t.title}return[...s.values()].sort((t,i)=>t.groupId-i.groupId)}function Ps(e){const s={};for(const n of e){const t=n.projectDir.trim();t!==""&&(s[String(n.groupId)]=t)}return s}function Es(e,s){const n=new Map(qe(s).map(t=>[t.groupId,t.projectDir]));return e.some(t=>(n.get(t.groupId)??"")!==t.projectDir.trim())}const L=ge({fetch:(e,s)=>globalThis.fetch(e,s)}),As=[{id:"connection",label:"连接"},{id:"env",label:"环境"},{id:"project",label:"项目"},{id:"behavior",label:"行为"},{id:"comfy",label:"画图 / 视频"},{id:"presets",label:"预设"},{id:"records",label:"记录"}];function R(e){return e.ok?"":e.error.message}function Ms(e){if(e===null)return{tone:"muted",text:"加载中…"};if(!e.started)return e.lock!==null?{tone:"warn",text:"未启动：另一个实例（pid "+String(e.lock.pid)+"）正在运行"}:e.problems.length>0?{tone:"error",text:"未启动：配置待补全"}:{tone:"muted",text:"未启动（等待宿主就绪）"};if(e.connected){const s=e.login;return{tone:"ok",text:"已连接（"+(s!==null&&(s.nickname!==""||s.userId>0)?"QQ "+(s.nickname!==""?s.nickname:String(s.userId)):String(e.config.selfId))+"）"}}return{tone:"warn",text:"连接中…（断线自动重连）"}}function Us(e){return e===null?"保存后生效":e.config.accessTokenConfigured?"已配置（来源："+(e.config.accessTokenSource==="settings"?"配置页保存值":"profile patch / 环境变量")+"）；留空表示不修改":"未配置；建议在 profile patch 里用 !!js 从环境变量读取"}function Ds(e){if(e===null)return{tone:"muted",text:"闸门状态读取中…"};if(!e.config.gateSupported)return{tone:"warn",text:"宿主还是旧版本（未加载支持闸门配置的版本）：下面参数暂时不会生效，重启该 profile 的 GUI 后再保存。"};const s=e.gate;return s===null?{tone:"muted",text:"闸门状态读取中…"}:s.enabled?s.classifier===null?{tone:"warn",text:"闸门已开启，但分类器未就绪：普通群消息不会接话（@ / 引用 / 命令仍直通）。"}:{tone:"ok",text:"闸门已开启 · 分类器 "+s.classifier+" · 阈值 "+String(s.threshold)+"；保存后立即重建闸门。"}:{tone:"muted",text:"闸门当前关闭（gate.enabled 来自 profile patch）：下面的参数会保存，开启后才生效。"}}function Ls(e){if(e===null)return{tone:"muted",text:"画图 / 视频状态读取中…"};const s=e.comfy;if(!s.enabled)return{tone:"muted",text:"画图 / 视频能力已关闭"};if(s.checking)return{tone:"muted",text:"正在检查 ComfyUI…"};if(!s.reachable)return{tone:"warn",text:"ComfyUI 连不上："+(s.error!==""?s.error:"尚未检查")};if(!s.supported)return{tone:"warn",text:"宿主没有 skills 服务，画图 / 视频 skill 无法加载"};const n=s.version!==""?s.version:"未知版本",t=s.skills.length;if(t===0)return{tone:"ok",text:"ComfyUI "+n+" 可用 · skill 状态未知"};const i=s.skills.filter(a=>a.loaded).map(a=>a.name);return i.length===t?{tone:"ok",text:"ComfyUI "+n+" 可用 · 已加载 "+i.join(" / ")}:i.length===0?{tone:"warn",text:"ComfyUI "+n+" 可用 · "+String(t)+" 个 skill 都未加载"}:{tone:"warn",text:"ComfyUI "+n+" 可用 · "+String(i.length)+"/"+String(t)+" 个 skill 已加载"}}const Rs={busy:!1,error:null,result:null},ne={groupId:null,items:[],busy:!1,error:null,windowMs:0};function Ws(){const[e,s]=h.useState(null),[n,t]=h.useState(js),[i,a]=h.useState([]),[l,o]=h.useState(!0),[u,y]=h.useState(!1),[T,f]=h.useState(null),[b,j]=h.useState(null),[P,w]=h.useState("connection"),[E,A]=h.useState(ne),[B,F]=h.useState([]),[z,d]=h.useState(re),[U,_]=h.useState(null),[V,O]=h.useState(!1),[X,Q]=h.useState(Rs),k=h.useCallback((c,m)=>{s(c),F(c.presets),m&&(t(be(c.config)),a(qe(c)))},[]),D=h.useCallback(async(c,m=!0)=>{const g=await L.getStatus();o(!1),g.ok?(k(g.value,c),c&&m&&f(null)):m&&f(R(g))},[k]);h.useEffect(()=>{D(!0)},[D]),h.useEffect(()=>{const c=setInterval(()=>{D(!1,!1)},5e3);return()=>clearInterval(c)},[D]);const $=h.useCallback((c,m)=>{t(g=>({...g,[c]:m}))},[]),Z=h.useCallback(c=>{t(m=>({...m,proxyEnabled:c}))},[]),ye=h.useCallback(c=>{t(m=>({...m,personaEnabled:c}))},[]),je=h.useCallback(c=>{t(m=>({...m,comfyEnabled:c}))},[]),ve=h.useCallback(c=>{t(m=>({...m,comfySkillEnabled:c}))},[]),ke=h.useCallback(c=>{t(m=>({...m,envEnabled:c}))},[]),we=h.useCallback((c,m)=>{a(g=>g.map(C=>C.groupId===c?{...C,projectDir:m}:C))},[]),Ne=h.useCallback(()=>{D(!0)},[D]),Ce=h.useCallback(async()=>{const c=Cs(n);if(!c.ok){j(null),f(c.problems.join("；"));return}const m=Ps(i);y(!0),f(null),j(null);const g=await L.saveConfig({...c.value,groupWorkspaces:m});y(!1),g.ok?(k(g.value,!0),j("已保存并重建连接。")):f(R(g))},[n,i,k]),Se=h.useCallback(async()=>{y(!0),f(null),j(null);const c=await L.reconnect();y(!1),c.ok?(k(c.value,!1),j("已请求重新连接。")):f(R(c))},[k]),Ie=h.useCallback(async c=>{const m=globalThis.confirm;if(typeof m=="function"&&!m("重新绑定群 "+String(c)+`？
		会删除该群现有会话映射，下次消息按当前项目目录新建会话；旧项目里的聊天记录不会移动。`))return;y(!0),f(null),j(null);const g=await L.rebind(c);y(!1),g.ok?(k(g.value,!0),j("已重新绑定：下一条消息会按新项目建会话。")):f(R(g))},[k]),ee=h.useCallback(async c=>{A(g=>({...g,groupId:c,busy:!0,error:null}));const m=await L.messages(c,20);m.ok?A({groupId:c,items:m.value.messages,busy:!1,error:null,windowMs:m.value.windowMs}):A({groupId:c,items:[],busy:!1,error:R(m),windowMs:0})},[]),Te=h.useCallback(c=>{ee(c)},[ee]),Pe=h.useCallback(()=>{A(ne)},[]),Ee=h.useCallback(()=>{E.groupId!==null&&ee(E.groupId)},[ee,E.groupId]),Ae=h.useCallback(async c=>{const m=globalThis.confirm;if(typeof m=="function"&&!m("解除群 "+String(c)+` 的会话绑定？
		旧会话保留在 GUI；下一条群消息会按当前项目目录新建会话。`))return;y(!0),f(null),j(null);const g=await L.deleteMapping(c);y(!1),g.ok?(k(g.value.status,!0),j(g.value.mapping.removed?"已解除群 "+String(c)+" 的会话绑定。":"群 "+String(c)+" 本来没有绑定。"),A(C=>C.groupId===c?ne:C)):f(R(g))},[k]),Me=h.useCallback(async()=>{const c=e===null?0:e.mappings.length;if(c===0)return;const m=globalThis.confirm;if(typeof m=="function"&&!m("清空全部 "+String(c)+` 条群映射？
		旧会话保留在 GUI；之后每个群的下一条消息都会重新建会话。`))return;y(!0),f(null),j(null);const g=await L.clearMappings();y(!1),g.ok?(k(g.value.status,!0),j("已清空 "+String(g.value.mappings.cleared)+" 条群映射。"),A(ne)):f(R(g))},[k,e]),Ue=h.useCallback(async()=>{const c=Number(n.chatRetentionDays.trim()===""?"0":n.chatRetentionDays.trim());if(!Number.isInteger(c)||c<1||c>3650){j(null),f("立即清理需要先在「保留天数」里填 1..3650 的整数（0 = 永不删除，不能清理）。");return}const m=globalThis.confirm;if(typeof m=="function"&&!m("立即清理超过 "+String(c)+` 天的聊天记录与媒体文件？
		删除后不可恢复；群映射与会话不受影响。`))return;y(!0),f(null),j(null);const g=await L.cleanup(c);if(y(!1),g.ok){const{cleanup:C,status:ae}=g.value;k(ae,!1),j("已清理：聊天记录 "+String(C.chat)+" 个文件、媒体 "+String(C.media)+" 个日期目录（保留 "+String(C.days)+" 天）。")}else f(R(g))},[n.chatRetentionDays,k]),De=h.useCallback(async()=>{const c=n.comfyBaseUrl.trim(),m=J(n.comfyTimeout.trim());if(m===null||m<3e3||m>12e4){Q({busy:!1,error:"ComfyUI 超时必须是 3s..120s 的时长（如 30s）",result:null});return}Q(ae=>({...ae,busy:!0,error:null}));const g={timeoutMs:m};c!==""&&(g.baseUrl=c);const C=await L.testComfy(g);C.ok?(k(C.value.status,!1),Q({busy:!1,error:null,result:C.value.probe})):Q({busy:!1,error:R(C),result:null})},[n.comfyBaseUrl,n.comfyTimeout,k]),Le=h.useCallback(()=>{_(""),d(re()),f(null),j(null)},[]),Re=h.useCallback(c=>{const m=B.find(g=>g.id===c);m!==void 0&&(_(c),d(Is(m)),f(null),j(null))},[B]),We=h.useCallback((c,m)=>{d(g=>({...g,[c]:m}))},[]),te=h.useCallback(()=>{_(null),d(re()),f(null)},[]),He=h.useCallback(async()=>{const c=Ts(z);if(!c.ok){j(null),f(c.problems.join("；"));return}O(!0),f(null),j(null);const m=await L.savePreset(c.value);O(!1),m.ok?(k(m.value.status,!1),F(m.value.presets),_(null),d(re()),j("预设已保存；新注册的 preset 对新会话生效。")):f(R(m))},[z,k]),Be=h.useCallback(async c=>{const m=globalThis.confirm;if(typeof m=="function"&&!m("删除预设「"+c+`」？
		已使用该预设的旧会话保留原组合；之后新建的会话不能再选它。`))return;O(!0),f(null),j(null);const g=await L.deletePreset(c);O(!1),g.ok?(k(g.value.status,!1),F(g.value.presets),U===c&&te(),j("已删除预设「"+c+"」。")):f(R(g))},[k,U,te]),Fe=h.useMemo(()=>e!==null&&(Ss(n,e.config)||Es(i,e)),[n,i,e]),_e=h.useMemo(()=>Ms(e),[e]),ze=h.useMemo(()=>Ds(e),[e]),Oe=h.useMemo(()=>Ls(e),[e]),Qe=h.useMemo(()=>Us(e),[e]);return{status:e,form:n,projectRows:i,loading:l,busy:u,error:T,notice:b,tab:P,dirty:Fe,statusLine:_e,tokenHint:Qe,gateLine:ze,comfyLine:Oe,comfyProbe:X,messages:E,setTab:w,updateField:$,setProxyEnabled:Z,setPersonaEnabled:ye,setComfyEnabled:je,setComfySkillEnabled:ve,setEnvEnabled:ke,testComfy:()=>{De()},updateProjectRow:we,refresh:Ne,save:()=>{Ce()},reconnect:()=>{Se()},rebind:c=>{Ie(c)},deleteMapping:c=>{Ae(c)},clearMappings:()=>{Me()},cleanup:()=>{Ue()},openMessages:Te,closeMessages:Pe,reloadMessages:Ee,presets:B,presetDraft:z,presetEditingId:U,presetBusy:V,newPreset:Le,editPreset:Re,updatePresetDraft:We,cancelPresetEdit:te,savePreset:()=>{He()},deletePreset:c=>{Be(c)}}}function Hs({model:e}){var n;const s=((n=e.status)==null?void 0:n.gate)??null;return s===null||s.groups.length===0?null:r.jsx(I,{children:r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"闸门实时状态"}),r.jsxs("p",{className:"qqr-hint",children:["待评估 ",s.pendingMessages," 条 / ",s.pendingGroups," 群 · 活动定时器 ",s.timers," · ","待派发 ",s.queue," · 待发送 ",s.sendQueue]}),r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"群号"}),r.jsx("th",{className:"qqr-th",children:"待评估"}),r.jsx("th",{className:"qqr-th",children:"最近发言"}),r.jsx("th",{className:"qqr-th",children:"冷却"}),r.jsx("th",{className:"qqr-th",children:"状态"})]})}),r.jsx("tbody",{children:s.groups.map(t=>r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:t.groupId}),r.jsx("td",{className:"qqr-td",children:t.pending}),r.jsx("td",{className:"qqr-td",children:oe(t.lastBotSpeakAt)||"未发言"}),r.jsx("td",{className:"qqr-td",children:t.cooldownUntil>Date.now()?"冷却至 "+xe(t.cooldownUntil):"—"}),r.jsx("td",{className:"qqr-td",children:t.dshBusy?"忙（有轮次在跑）":t.evaluating?"评估中":"空闲"})]},t.groupId))})]})})]})})}function Bs({model:e}){var o;const{form:s,updateField:n}=e,t=((o=e.status)==null?void 0:o.agentPresets)??null,i=(t==null?void 0:t.items)??[],a=[{value:"",label:"不指定（跟随 DSH 默认）"},...i.map(u=>({value:u.id,label:(u.name!==""?u.name:u.id)+(u.broken!==""?"（不可用）":""),disabled:u.broken!=="",title:u.broken!==""?u.broken:u.description}))];s.agentPreset!==""&&!i.some(u=>u.id===s.agentPreset)&&a.push({value:s.agentPreset,label:s.agentPreset+"（不在名册中）",disabled:!1});const l=t===null||!t.supported?r.jsx(N,{tone:"warn",children:"当前宿主没有提供 agent preset 服务（可能版本过旧或不是 Web bundle）：预设选择不会生效，轻量人设仍可用。"}):t.missing?r.jsx(N,{tone:"warn",children:"配置里的预设不在当前名册里：下次建会话会退回 DSH 默认预设。"}):null;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(I,{children:[r.jsx(q,{label:"回发文本切分上限",hint:"100..20000 字符；超长回复按此切分成多条",children:r.jsx(v,{value:s.replyChunkSize,onChange:u=>{n("replyChunkSize",u)},inputMode:"numeric",ariaLabel:"回发文本切分上限"})}),r.jsx(q,{label:"直通命令前缀",hint:"逗号分隔；群消息以此开头时绕过闸门直接进 DSH",children:r.jsx(v,{value:s.commandPrefixes,onChange:u=>{n("commandPrefixes",u)},placeholder:"/dsh",ariaLabel:"直通命令前缀"})})]}),r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"消息闸门"}),r.jsx(N,{tone:e.gateLine.tone==="ok"?"ok":e.gateLine.tone==="warn"?"warn":"muted",children:e.gateLine.text})]}),r.jsx(q,{label:"普通消息去抖窗口",hint:"同一波消息合并等待，0..60s（如 3s / 500ms）",children:r.jsx(v,{value:s.gateDebounce,onChange:u=>{n("gateDebounce",u)},placeholder:"5s",ariaLabel:"普通消息去抖窗口"})}),r.jsx(q,{label:"最小发言间隔",hint:"距上次发言不足该间隔时延后评估，0..60m（如 10s / 45s）",children:r.jsx(v,{value:s.gateFastMinReplyInterval,onChange:u=>{n("gateFastMinReplyInterval",u)},placeholder:"45s",ariaLabel:"最小发言间隔"})}),r.jsx(q,{label:"jev 接话阈值",hint:"0..1；越高越保守（默认 0.7）",children:r.jsx(v,{value:s.gateJevThreshold,onChange:u=>{n("gateJevThreshold",u)},inputMode:"decimal",placeholder:"0.7",ariaLabel:"jev 接话阈值"})})]}),r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"角色与人设"}),r.jsx("p",{className:"qqr-hint",children:"所有群共用一个 DSH agent preset；切换后只影响之后新建的会话（群里发 /new，或到「项目」页点「重新绑定」）。 下拉包含 DSH 内置预设和「预设」页里插件管理的预设（自带一个「QQ 群聊」）。"}),l]}),r.jsx(q,{label:"默认 Agent 预设",hint:"空 = 跟随 DSH 默认；preset 在会话创建时固定",children:r.jsx(Y,{value:s.agentPreset,onChange:u=>{n("agentPreset",u)},options:a,ariaLabel:"默认 Agent 预设"})}),r.jsx(q,{label:"启用轻量人设",hint:"每轮 prompt 前注入；默认关闭；不依赖 profile 改动",children:r.jsx(K,{checked:s.personaEnabled,onChange:e.setPersonaEnabled,ariaLabel:"启用轻量人设"})}),r.jsxs(x,{children:[r.jsx(fe,{value:s.personaText,onChange:u=>{n("personaText",u)},placeholder:"例如：你是群里的猫娘助手，说话带「喵」，可以偶尔发一个表情。",rows:4,ariaLabel:"轻量人设文本"}),r.jsx("p",{className:"qqr-hint",children:"人设文本最多 4000 字符，开启时不能为空；它叠加在系统提示词里的预设人设之上，适合补群内角色设定。 平台约定（最终回复自动回发、不要用 qq_send 往本群发）始终会附在 prompt 末尾。"})]})]}),r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"代答（@ 特定的人）"}),r.jsx("p",{className:"qqr-hint",children:"开启后，群里有人 @ 名单里的人、且 TA 最近没在本群说话时，机器人代 TA 回应（默认关闭）。 名单之外的 @ 别人消息只记聊天记录，不会触发会话。"})]}),r.jsx(q,{label:"开启代答",hint:"默认关闭；开启时下面至少填一个目标",children:r.jsx(K,{checked:s.proxyEnabled,onChange:e.setProxyEnabled,ariaLabel:"开启代答"})}),r.jsx(q,{label:"代答目标",hint:"QQ 号或群名片 / 昵称，逗号分隔（如 10003, 群主）",children:r.jsx(v,{value:s.proxyTargets,onChange:u=>{n("proxyTargets",u)},placeholder:"10003, 群主",ariaLabel:"代答目标"})}),r.jsx(q,{label:"沉默窗口",hint:"TA 多久没在本群发言才代答；0s = 总是代答（如 10m / 30m）",children:r.jsx(v,{value:s.proxySilenceWindow,onChange:u=>{n("proxySilenceWindow",u)},placeholder:"10m",ariaLabel:"代答沉默窗口"})})]}),r.jsx(Hs,{model:e})]})}const Fs={"comfy-image":"出图","comfy-video":"视频"};function _s(e){const s=Fs[e];return s===void 0?e:e+"（"+s+"）"}function M({label:e,value:s}){return r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:e}),r.jsx("td",{className:"qqr-td",children:s})]})}function zs({model:e}){const{form:s,updateField:n,status:t,comfyProbe:i}=e,a=(t==null?void 0:t.comfy)??null,l=i.result,o=t!==null&&!t.config.comfySupported?r.jsx(N,{tone:"warn",children:"宿主版本较旧，需重启该 profile 的 GUI 后此页才生效。"}):null,u=l===null?null:r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"项目"}),r.jsx("th",{className:"qqr-th",children:"结果"})]})}),r.jsxs("tbody",{children:[r.jsx(M,{label:"目标地址",value:l.target!==""?l.target:"（空）"}),r.jsx(M,{label:"可达",value:l.reachable?"是":"否"}),r.jsx(M,{label:"ComfyUI 版本",value:l.version!==""?l.version:"未知"}),r.jsx(M,{label:"GPU",value:l.device!==""?l.device:"未知"}),r.jsx(M,{label:"队列",value:String(l.queue.running)+" 运行 / "+String(l.queue.pending)+" 等待"}),r.jsx(M,{label:"延迟",value:String(l.latencyMs)+" ms"}),r.jsx(M,{label:"错误",value:l.error!==""?l.error:"—"})]})]})}),y=a===null?r.jsx(x,{children:r.jsx("p",{className:"qqr-empty",children:"状态读取中…"})}):a.enabled?r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"项目"}),r.jsx("th",{className:"qqr-th",children:"状态"})]})}),r.jsxs("tbody",{children:[r.jsx(M,{label:"可达",value:a.reachable?"是":"否"}),r.jsx(M,{label:"ComfyUI 版本",value:a.version!==""?a.version:"未知"}),r.jsx(M,{label:"设备",value:a.device!==""?a.device:"未知"}),r.jsx(M,{label:"队列",value:String(a.queue.running)+" 运行 / "+String(a.queue.pending)+" 等待"}),r.jsx(M,{label:"最近检查",value:oe(a.checkedAt)!==""?oe(a.checkedAt):"尚未检查"}),a.skills.length===0?r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:"skill"}),r.jsx("td",{className:"qqr-td",children:r.jsx("span",{className:"qqr-hint",children:"宿主没有返回 skill 状态（旧版 host？）"})})]}):a.skills.map(b=>r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:_s(b.name)}),r.jsxs("td",{className:"qqr-td",children:[b.loaded?"已加载":"未加载",b.error!==""?r.jsx("span",{className:"qqr-hint qqr-mono-block",children:b.error}):null]})]},b.name))]})]})}):r.jsx(x,{children:r.jsx("p",{className:"qqr-empty",children:"画图 / 视频能力已关闭；启用并保存后显示运行状态。"})}),T=a===null?[]:a.skills.filter(b=>!b.loaded),f=a!==null&&a.enabled&&a.reachable&&T.length>0?a.skillEnabled?r.jsx(N,{tone:"warn",children:"有 skill 尚未加载："+T.map(b=>b.name).join(" / ")+"；保存配置或重启该 profile 的 GUI 后，host 连上 ComfyUI 会重新注册。"}):r.jsx(N,{tone:"muted",children:"画图 / 视频能力已开启，但「连接成功后加载 skill」是关闭的：打开上面的开关并保存后才会加载。"}):null;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"ComfyUI 服务（出图 / 视频）"}),r.jsxs("p",{className:"qqr-hint",children:["host 在启用后定期探测这个地址（约 1 分钟一次）；连接成功后为 DSH 加载",r.jsx("code",{children:" comfy-image "}),"（出图）与",r.jsx("code",{children:" comfy-video "}),"（视频）两个 skill， 关闭画图 / 视频会注销它们。"]}),o]}),r.jsx(q,{label:"启用画图 / 视频",hint:"关闭时不探测，也不加载画图 / 视频 skill",children:r.jsx(K,{checked:s.comfyEnabled,onChange:e.setComfyEnabled,ariaLabel:"启用画图 / 视频"})}),r.jsx(q,{label:"服务地址",hint:"ComfyUI HTTP 地址（无鉴权，只填可信网络里的地址）",children:r.jsx(v,{value:s.comfyBaseUrl,onChange:b=>{n("comfyBaseUrl",b)},placeholder:"http://192.168.1.10:8188",ariaLabel:"ComfyUI 服务地址"})}),r.jsx(q,{label:"探测超时",hint:"3s..120s；测试连接与后台探测都用它",children:r.jsx(v,{value:s.comfyTimeout,onChange:b=>{n("comfyTimeout",b)},placeholder:"30s",ariaLabel:"ComfyUI 探测超时"})}),r.jsx(q,{label:"连接成功后加载 skill",hint:"注册 comfy-image（出图）与 comfy-video（视频）；保存后立即按新配置探测",children:r.jsx(K,{checked:s.comfySkillEnabled,onChange:e.setComfySkillEnabled,ariaLabel:"连接成功后加载 skill"})}),r.jsxs(x,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsx(S,{variant:"outline",onClick:e.testComfy,disabled:i.busy,children:i.busy?"测试中…":"测试连接"}),r.jsx("span",{className:"qqr-hint",children:"用上面填的地址与超时探测一次（只探测，不保存配置）。"})]}),i.error!==null?r.jsx(N,{tone:"error",role:"alert",children:i.error}):null,u]})]}),r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"运行状态"}),r.jsx(me,{line:e.comfyLine}),a!==null&&a.enabled&&!a.reachable?r.jsx(N,{tone:"warn",children:"请检查服务地址与 ComfyUI 是否已启动；保存配置或等待下一轮探测。"}):null,f]}),y]}),r.jsx(I,{children:r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"在群里画图 / 做视频"}),r.jsxs("ul",{className:"qqr-list",children:[r.jsx("li",{children:"群里直接说「画一张……」或「生成一段……视频」即可触发对应 skill，例如「画一张夕阳下的猫」「让这张图动起来」。"}),r.jsxs("li",{children:["改图先发参考图，再说「改成……」；出图工作流：",r.jsx("code",{children:"qwen-t2i"})," 文生图、",r.jsx("code",{children:"qwen-i2i"})," 参考图、",r.jsx("code",{children:"qwen-edit"})," 编辑。"]}),r.jsxs("li",{children:["视频工作流：",r.jsx("code",{children:"h3-t2v"})," 文生视频、",r.jsx("code",{children:"h3-i2v"})," 首帧转视频、",r.jsx("code",{children:"h3-r2v"})," 参考图转视频（带原生音频）。"]}),r.jsxs("li",{children:["产物落在群项目 ",r.jsx("code",{children:"assets/comfy/output/"}),"；图片用 ",r.jsx("code",{children:"qq_send({ images: [...] })"})," 发回群，视频用 ",r.jsx("code",{children:"qq_send({ videos: [...] })"})," 发回群。"]}),r.jsx("li",{children:"ComfyUI 无鉴权，只在家用可信网络使用；不要在公网暴露。"})]})]})})]})}function Os({model:e}){const{status:s}=e,n=(s==null?void 0:s.login)??null,t=n!==null&&(n.nickname!==""||n.userId>0)?(n.nickname!==""?n.nickname:"未取到昵称")+"（"+String(n.userId)+"）":"未登录",i=(s==null?void 0:s.lock)??null;return r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"运行状态"}),r.jsxs("p",{className:"qqr-hint",children:["协议端：",r.jsx("span",{className:"qqr-mono",children:(s==null?void 0:s.config.wsUrl)??"—"})]}),r.jsxs("p",{className:"qqr-hint",children:["登录账号：",t]}),r.jsxs("p",{className:"qqr-hint",children:["单实例锁：",i===null?"本进程持有":"另一个进程持有（pid "+String(i.pid)+"）"," · ","群映射：",s===null?0:s.mappings.length," 个"]})]}),s!==null&&s.problems.length>0?r.jsx(x,{children:r.jsx("ul",{className:"qqr-list",children:s.problems.map(a=>r.jsx("li",{children:r.jsx(N,{tone:"error",children:a})},a))})}):null]})}function Qs({model:e}){var t;const{form:s,updateField:n}=e;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(I,{children:[r.jsx(q,{label:"协议端 WebSocket",hint:"NapCat 正向 WS，例如 ws://127.0.0.1:3001",children:r.jsx(v,{value:s.wsUrl,onChange:i=>{n("wsUrl",i)},placeholder:"ws://127.0.0.1:3001",ariaLabel:"协议端 WebSocket 地址"})}),r.jsx(q,{label:"Access Token",hint:e.tokenHint,children:r.jsx(v,{type:"password",value:s.accessToken,onChange:i=>{n("accessToken",i)},placeholder:((t=e.status)==null?void 0:t.config.accessTokenConfigured)===!0?"留空保持不变":"写入新的 token",ariaLabel:"Access Token"})}),r.jsx(q,{label:"机器人 QQ 号",hint:"连接后用 get_login_info 校验，不匹配会断开",children:r.jsx(v,{value:s.selfId,onChange:i=>{n("selfId",i)},inputMode:"numeric",ariaLabel:"机器人 QQ 号"})}),r.jsx(q,{label:"群白名单",hint:"逗号分隔的群号；未列出的群只记日志不回话",children:r.jsx(v,{value:s.groups,onChange:i=>{n("groups",i)},placeholder:"10002",ariaLabel:"群白名单"})})]}),r.jsx(Os,{model:e})]})}const ue=ge({fetch:(e,s)=>globalThis.fetch(e,s)});function Gs(){const[e,s]=h.useState(null),[n,t]=h.useState(!1),[i,a]=h.useState(null),[l,o]=h.useState(null),[u,y]=h.useState(null),T=h.useRef(!0);h.useEffect(()=>(T.current=!0,()=>{T.current=!1}),[]);const f=h.useCallback(async(P=!1)=>{const w=await ue.getEnv();T.current&&(w.ok?(s(w.value),P&&a(null)):P&&a(w.error.message))},[]);h.useEffect(()=>{f(!0)},[f]),h.useEffect(()=>{const P=setInterval(()=>{f(!1)},5e3);return()=>clearInterval(P)},[f]);const b=n||e!==null&&e.running!==null;h.useEffect(()=>{if(!b)return;const P=setInterval(()=>{f(!1)},2e3);return()=>clearInterval(P)},[b,f]);const j=h.useCallback(async(P,w)=>{var A;t(!0),a(null),o(null),y(null);const E=await ue.envAction({action:P,confirm:(w==null?void 0:w.confirm)===!0});if(T.current){if(t(!1),!E.ok){a(E.error.message);return}s(E.value.status),E.value.url!==void 0?(y(E.value.url),o("已生成 WebUI 链接。")):E.value.accepted===!0?o("已开始执行；完成后会自动刷新（日志见下方）。"):o("动作已完成。"),(A=w==null?void 0:w.onDone)==null||A.call(w)}},[]);return{env:e,entries:e===null?[]:e.log.entries,busy:n,error:i,notice:l,webuiUrl:u,refresh:()=>{f(!0)},run:(P,w)=>{j(P,w)},openWebui:()=>{j("open-webui")}}}function $s(e){return e==="ok"?"ok":e==="warn"?"warn":e==="error"?"error":"muted"}function Ys(e){return e==="ok"?"正常":e==="warn"?"待处理":e==="error"?"未通过":"跳过"}function Js(e){const{action:s,disabled:n,env:t,onDone:i}=e,a=s.kind==="command"||s.kind==="chain"?"outline":"ghost",l=()=>{if(s.confirm){const o=globalThis.confirm;if(typeof o=="function"&&!o(s.title+`

		`+s.description))return}t.run(s.id,{confirm:s.confirm,onDone:i})};return r.jsx(S,{variant:a,onClick:l,disabled:n,title:s.description,children:s.title})}function Ks(e){const{step:s,catalog:n,env:t,onDone:i}=e,a=t.busy||t.env!==null&&t.env.running!==null;return r.jsxs("tr",{children:[r.jsxs("td",{className:"qqr-td",children:[r.jsx(he,{tone:$s(s.status)})," "+s.title]}),r.jsx("td",{className:"qqr-td",children:Ys(s.status)}),r.jsxs("td",{className:"qqr-td",children:[s.detail,s.evidence.length>0?r.jsx("div",{className:"qqr-mono-block",children:s.evidence.map((l,o)=>r.jsx("div",{children:l},String(o)))}):null]}),r.jsx("td",{className:"qqr-td",children:s.actions.map(l=>{const o=n.get(l);return o===void 0?null:r.jsx(Js,{action:o,disabled:a,env:t,onDone:i},l)})})]})}function Vs({model:e}){var T,f;const s=Gs(),n=s.env,t=new Map;for(const b of(n==null?void 0:n.actions)??[])t.set(b.id,b);const i=()=>{e.refresh()},a=s.busy||n!==null&&n.running!==null,l=e.status!==null&&!e.status.config.environmentSupported?r.jsx(N,{tone:"warn",children:"宿主版本较旧，需重启该 profile 的 GUI 后此页才生效。"}):null;h.useEffect(()=>{if(s.webuiUrl===null)return;const b=globalThis.open;typeof b=="function"&&b(s.webuiUrl)},[s.webuiUrl]);const o=n===null?null:r.jsxs("span",{className:"qqr-hint",children:["正常 "+String(n.summary.ok)+" · 待处理 "+String(n.summary.warn)+" · 未通过 "+String(n.summary.error)+" · 跳过 "+String(n.summary.skip),n.checkedAt>0?"（最近检查 "+new Date(n.checkedAt).toLocaleTimeString()+"）":"",n.running!==null?" · 正在执行："+n.running.action:""]}),u=n===null?r.jsx(x,{children:r.jsx("p",{className:"qqr-empty",children:"环境状态读取中…"})}):n.checkedAt===0&&n.checking?r.jsx(x,{children:r.jsx("p",{className:"qqr-empty",children:"正在检查环境（docker / 文件 / OneBot 配置）…"})}):n.supported?n.enabled?r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"步骤"}),r.jsx("th",{className:"qqr-th",children:"状态"}),r.jsx("th",{className:"qqr-th",children:"说明"}),r.jsx("th",{className:"qqr-th",children:"操作"})]})}),r.jsx("tbody",{children:n.steps.map(b=>r.jsx(Ks,{step:b,catalog:t,env:s,onDone:i},b.id))})]})}):r.jsx(x,{children:r.jsx("p",{className:"qqr-empty",children:"环境页已关闭：打开上面的「启用环境页」并保存后开始探测。"})}):r.jsx(x,{children:r.jsx(N,{tone:"warn",children:"当前平台（"+(n.platform||"未知")+"）暂不支持环境页：只支持 macOS（Colima）与 Linux（Docker）。"})}),y=n===null||!n.supported||!n.enabled?null:r.jsxs("div",{className:"qqr-headline",children:[r.jsx(S,{variant:"outline",onClick:()=>{s.run("fix-all",{onDone:i})},disabled:a,title:"按顺序生成 compose / 启动容器 / 写 OneBot / 回填配置；安装类步骤需手动确认",children:n.running!==null&&n.running.action==="fix-all"?"一键修复执行中…":"一键修复"}),r.jsx(S,{onClick:s.refresh,disabled:s.busy,children:"重新检测"}),n.webuiTokenConfigured?r.jsx(S,{variant:"outline",onClick:s.openWebui,disabled:a,children:"打开 WebUI 扫码"}):null]});return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"NapCat Docker 环境"}),r.jsxs("p",{className:"qqr-hint",children:["环境目录里放 ",r.jsx("code",{children:"compose.yaml"})," 与 ",r.jsx("code",{children:"data/"}),"（NapCat 的 QQ 配置）； host 只探测与执行白名单命令（固定 argv、不经 shell、不 sudo）。改完目录 / token 后 点页面顶部「保存并重连」落盘（token 只写不读）。"]}),l]}),r.jsx(q,{label:"启用环境页",hint:"关闭时不探测、也不允许执行任何动作",children:r.jsx(K,{checked:e.form.envEnabled,onChange:e.setEnvEnabled,ariaLabel:"启用环境页"})}),r.jsx(q,{label:"环境目录",hint:"绝对路径或 ~/ 开头；默认 ~/napcat-docker",children:r.jsx(v,{value:e.form.envDir,onChange:b=>{e.updateField("envDir",b)},placeholder:"~/napcat-docker",ariaLabel:"环境目录"})}),r.jsx(q,{label:"WebUI token",hint:"只写不读；NapCat 的 WEBUI_TOKEN（compose 里那行）",children:r.jsx(v,{value:e.form.envWebuiToken,onChange:b=>{e.updateField("envWebuiToken",b)},placeholder:(T=e.status)!=null&&T.config.environment.webuiTokenConfigured?"已配置；留空表示不修改":"未配置",type:"password",ariaLabel:"WebUI token"})}),r.jsx(x,{children:r.jsxs("p",{className:"qqr-hint",children:["保存后 host 用新目录重新探测；token 用于生成 compose 文件与「打开 WebUI」。",(f=e.status)!=null&&f.config.environment.webuiTokenConfigured?" 当前已配置 token。":" 当前还没有 token。"]})})]}),r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"检查清单"}),o,y]}),u,s.error!==null?r.jsx(x,{children:r.jsx(N,{tone:"error",role:"alert",children:s.error})}):null,s.notice!==null?r.jsx(x,{children:r.jsx(N,{tone:"ok",role:"status",children:s.notice})}):null,s.webuiUrl!==null?r.jsx(x,{children:r.jsxs("p",{className:"qqr-hint",children:["WebUI 已在新的标签页打开（没反应就手动点）："," ",r.jsx("a",{href:s.webuiUrl,target:"_blank",rel:"noreferrer",children:s.webuiUrl})]})}):null]}),r.jsx(I,{children:r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"动作日志"}),s.entries.length===0?r.jsx("p",{className:"qqr-empty",children:"还没有动作记录：执行「一键修复」或任一步按钮后，这里显示命令输出（token 已脱敏）。"}):r.jsx("pre",{className:"qqr-mono-block",children:s.entries.map(b=>new Date(b.at).toLocaleTimeString()+" ["+b.level+"] "+b.text).join(`
		`)})]})}),r.jsx(I,{children:r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:"安全边界"}),r.jsxs("ul",{className:"qqr-list",children:[r.jsxs("li",{children:["只跑白名单命令（",r.jsx("code",{children:"docker"})," / ",r.jsx("code",{children:"docker compose"})," / ",r.jsx("code",{children:"brew"})," / ",r.jsx("code",{children:"colima"}),"），参数固定、不经 shell，不 ",r.jsx("code",{children:"sudo"}),"，不下载可执行文件。"]}),r.jsxs("li",{children:["安装 Docker / Colima、启动容器引擎、写 OneBot 配置都会二次确认；写 OneBot 前先备份 ",r.jsx("code",{children:".bak-时间戳"}),"。"]}),r.jsx("li",{children:"「打开 WebUI」把 token 拼进链接返回给页面（仅本机 loopback 访问）；状态快照里永远不返回 token 明文。"}),r.jsx("li",{children:"Windows / WSL 暂不支持：页面只显示说明，不执行动作。"})]})]})})]})}function Xs({model:e}){var z;const{status:s,presets:n,presetDraft:t,presetEditingId:i,presetBusy:a,updatePresetDraft:l}=e,o=(s==null?void 0:s.modelCatalog)??null,u=(o==null?void 0:o.groups)??[],y=u.find(d=>d.id===t.provider),T=(y==null?void 0:y.models)??[],f=T.find(d=>d.id===t.model),b=(f==null?void 0:f.efforts)??[],j=((z=s==null?void 0:s.permissionCatalog)==null?void 0:z.options)??[],P=[{value:"",label:"不指定（跟随 DSH 默认）"},...u.map(d=>({value:d.id,label:d.name!==""?d.name:d.id}))],w=[{value:"",label:"不指定"},...T.map(d=>({value:d.id,label:d.name!==""?d.name:d.id}))],E=[{value:"",label:"默认"},...b.map(d=>({value:d.id,label:d.name!==""?d.name:d.id}))],A=[{value:"",label:"不指定（跟随当前）"},...j.map(d=>({value:d.value,label:d.name!==""?d.name:d.value}))],B=i!==null,F=s!==null&&!s.presetService.supported?r.jsx(N,{tone:"warn",children:"宿主没有提供 agentPresets 服务（或尚未就绪）：预设会保存在本地，但暂时无法在 DSH 里选到，重启 GUI 后再看。"}):null;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsx("h4",{className:"qqr-subhead",children:"QQ 预设"}),r.jsx("span",{className:"qqr-inline-actions",children:r.jsx(S,{variant:"outline",onClick:e.newPreset,disabled:a,children:"新建预设"})})]}),r.jsx("p",{className:"qqr-hint",children:"预设 = 系统提示词人设（persona）+ 会话模型 / 思考层级 / 权限。保存后 host 动态注册成 DSH agent preset（无需重启 GUI）；已有群会话要发 /new 或「重新绑定」才会换过去。 插件自带的「QQ 群聊」也可以改。"}),F]}),r.jsx(x,{children:n.length===0?r.jsx("p",{className:"qqr-empty",children:"还没有预设。点「新建预设」开始。"}):r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"预设"}),r.jsx("th",{className:"qqr-th",children:"模型"}),r.jsx("th",{className:"qqr-th",children:"权限"}),r.jsx("th",{className:"qqr-th",children:"操作"})]})}),r.jsx("tbody",{children:n.map(d=>r.jsxs("tr",{children:[r.jsxs("td",{className:"qqr-td",children:[r.jsx("span",{children:d.name!==""?d.name:d.id}),r.jsx("span",{className:"qqr-mono qqr-mono-block",children:d.id}),s!==null&&s.presetService.supported&&!s.presetService.registered.includes(d.id)?r.jsx("span",{className:"qqr-hint",children:"（未注册：可能与 DSH 内置预设冲突）"}):null]}),r.jsx("td",{className:"qqr-td",children:d.model.provider===""?"跟随默认":d.model.provider+"/"+d.model.model+(d.model.reasoningEffort===""?"":" · "+d.model.reasoningEffort)}),r.jsx("td",{className:"qqr-td",children:d.permissionPreset===""?"跟随当前":d.permissionPreset}),r.jsx("td",{className:"qqr-td",children:r.jsxs("div",{className:"qqr-row-actions",children:[r.jsx(S,{variant:"outline",onClick:()=>{e.editPreset(d.id)},disabled:a,children:"编辑"}),r.jsx(S,{onClick:()=>{e.deletePreset(d.id)},disabled:a,children:"删除"})]})})]},d.id))})]})})})]}),B?r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsx("h4",{className:"qqr-subhead",children:i===""?"新建预设":"编辑预设："+i}),r.jsx("p",{className:"qqr-hint",children:"id 创建后不可修改（DSH 会话按它恢复）；人设会作为系统提示词的人设段。模型 / 权限只对 使用该预设的新会话生效。"})]}),r.jsx(q,{label:"预设 id",hint:"小写字母 / 数字 / 连字符；创建后不可改",children:r.jsx(v,{value:t.id,onChange:d=>{l("id",d)},placeholder:"catgirl",disabled:i!=="",ariaLabel:"预设 id"})}),r.jsx(q,{label:"名称",hint:"显示在 DSH preset 选择器里",children:r.jsx(v,{value:t.name,onChange:d=>{l("name",d)},placeholder:"猫娘",ariaLabel:"预设名称"})}),r.jsx(q,{label:"描述",hint:"可选；一句话说明这个预设的用途",children:r.jsx(v,{value:t.description,onChange:d=>{l("description",d)},placeholder:"群里的猫娘角色",ariaLabel:"预设描述"})}),r.jsxs(x,{children:[r.jsx("span",{className:"qqr-label",children:"人设（persona）"}),r.jsx(fe,{value:t.persona,onChange:d=>{l("persona",d)},placeholder:"你是群里的猫娘助手，说话带「喵」；直接输出最终回复即可，不要用 qq_send 往本群发。",rows:5,ariaLabel:"预设人设"}),r.jsx("p",{className:"qqr-hint",children:"建议保留「直接输出最终回复、不要用 qq_send 往本群发」——不然模型可能用工具回话导致双发。"})]}),o===null?r.jsxs(r.Fragment,{children:[r.jsx(q,{label:"模型 provider",hint:"宿主模型目录不可用，可手填（留空 = 跟随默认）",children:r.jsx(v,{value:t.provider,onChange:d=>{l("provider",d)},placeholder:"deepseek-account",ariaLabel:"模型 provider"})}),r.jsx(q,{label:"模型 id",hint:"留空 = 跟随默认",children:r.jsx(v,{value:t.model,onChange:d=>{l("model",d)},placeholder:"deepseek-flash",ariaLabel:"模型 id"})}),r.jsx(q,{label:"思考层级",hint:"留空 = 跟随模型默认",children:r.jsx(v,{value:t.reasoningEffort,onChange:d=>{l("reasoningEffort",d)},placeholder:"low / medium / high",ariaLabel:"思考层级"})})]}):r.jsxs(r.Fragment,{children:[r.jsx(q,{label:"模型 provider",hint:"留空 = 跟随 DSH 默认模型",children:r.jsx(Y,{value:t.provider,onChange:d=>{l("provider",d),l("model",""),l("reasoningEffort","")},options:P,ariaLabel:"模型 provider"})}),r.jsx(q,{label:"模型",hint:"留空 = 不覆盖",children:r.jsx(Y,{value:t.model,onChange:d=>{l("model",d),l("reasoningEffort","")},options:w,ariaLabel:"模型"})}),r.jsx(q,{label:"思考层级",hint:"留空 = 跟随模型默认",children:r.jsx(Y,{value:t.reasoningEffort,onChange:d=>{l("reasoningEffort",d)},options:E,ariaLabel:"思考层级"})})]}),r.jsx(q,{label:"权限预设",hint:"沙箱 + 审批组合；留空 = 跟随当前",children:r.jsx(Y,{value:t.permissionPreset,onChange:d=>{l("permissionPreset",d)},options:A,ariaLabel:"权限预设"})}),r.jsx(q,{label:"排序",hint:"DSH preset 列表里的位置（1..10000）",children:r.jsx(v,{value:t.order,onChange:d=>{l("order",d)},inputMode:"numeric",placeholder:"100",ariaLabel:"预设排序"})}),r.jsx(x,{children:r.jsxs("div",{className:"qqr-headline",children:[r.jsx(S,{variant:"primary",onClick:e.savePreset,disabled:a,children:a?"保存中…":"保存预设"}),r.jsx(S,{variant:"outline",onClick:e.cancelPresetEdit,disabled:a,children:"取消"})]})})]}):null]})}function pe(e){const s={image:"图片",sticker:"表情",face:"表情",video:"视频",voice:"语音",file:"文件"};return e.map(n=>n.status==="failed"?n.kind==="file"?"[群文件下载失败]":"[媒体下载失败]":"["+(s[n.kind]??"媒体")+"]")}function Zs({model:e}){const{messages:s}=e;if(s.groupId===null)return null;const n=Math.max(1,Math.round(s.windowMs/36e5));return r.jsx(I,{children:r.jsxs(x,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsxs("h4",{className:"qqr-subhead",children:["最近消息 · 群 ",s.groupId]}),r.jsxs("span",{className:"qqr-muted",children:["最近 ",n," 小时 · 最多 20 条"]}),r.jsxs("span",{className:"qqr-inline-actions",children:[r.jsx(S,{onClick:e.reloadMessages,disabled:s.busy,children:"刷新"}),r.jsx(S,{onClick:e.closeMessages,disabled:s.busy,children:"关闭"})]})]}),s.busy?r.jsx("p",{className:"qqr-muted",children:"读取中…"}):s.error!==null?r.jsx(N,{tone:"error",role:"alert",children:s.error}):s.items.length===0?r.jsx("p",{className:"qqr-muted",children:"最近 24 小时没有消息。"}):r.jsx("div",{children:s.items.map(t=>r.jsxs("div",{className:"qqr-msg",children:[r.jsxs("span",{className:"qqr-msg-meta",children:[xe(t.time)," · ",t.name,t.mentionsSelf?"（@你）":"",t.replyToId!==""?"（引用 "+t.replyToId+"）":"",pe(t.media).length>0?" "+pe(t.media).join(" "):""]}),t.text!==""?r.jsx("span",{className:"qqr-msg-text",children:t.text}):null]},(t.messageId||String(t.time))+":"+String(t.time)))})]})})}function er({model:e}){const{status:s,projectRows:n,busy:t,loading:i}=e;return r.jsxs(I,{children:[r.jsxs(x,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsx("h4",{className:"qqr-subhead",children:"群项目目录"}),r.jsx("span",{className:"qqr-inline-actions",children:s!==null&&s.mappings.length>0?r.jsxs(S,{onClick:e.clearMappings,disabled:t||i,variant:"outline",children:["清空全部映射（",s.mappings.length,"）"]}):null})]}),r.jsxs("p",{className:"qqr-hint",children:["每个群的聊天记录写进该项目的 ",r.jsx("code",{children:".qq-relay/chat/<群号>/"}),"，DSH 会话也以它为工作目录； 留空表示跟随上面的默认项目。改目录只影响之后新建的会话——已建会话请点「重新绑定」 （旧项目里的聊天记录不会移动）。"]}),s!==null&&s.workspace.attachIssues.length>0?r.jsx(N,{tone:"warn",children:"有 "+String(s.workspace.attachIssues.length)+" 个会话没能挂到群项目的 workspace，会在 DSH 侧栏显示为「未分组」："+s.workspace.attachIssues.map(a=>"群 "+String(a.groupId)+"（"+a.error+"）").join("；")+"。保存配置或点「重新连接」会自动补挂一次。"}):null]}),s===null||n.length===0?r.jsx(x,{children:r.jsx("p",{className:"qqr-empty",children:"还没有群：把群号填进「群白名单」，或在群里 @ 机器人后会自动出现。"})}):r.jsx(x,{children:r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"群号"}),r.jsx("th",{className:"qqr-th",children:"会话"}),r.jsx("th",{className:"qqr-th",children:"项目目录"}),r.jsx("th",{className:"qqr-th",children:"操作"})]})}),r.jsx("tbody",{children:n.map(a=>r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:a.groupId}),r.jsx("td",{className:"qqr-td",children:a.sessionId===""?r.jsx("span",{className:"qqr-muted",children:"未创建"}):r.jsxs(r.Fragment,{children:[r.jsx("span",{children:a.sessionTitle!==""?a.sessionTitle:"—"}),r.jsx("span",{className:"qqr-mono qqr-mono-block",children:a.sessionId})]})}),r.jsx("td",{className:"qqr-td qqr-col-dir",children:r.jsx(v,{value:a.projectDir,onChange:l=>{e.updateProjectRow(a.groupId,l)},placeholder:s.config.workspace,ariaLabel:"群 "+String(a.groupId)+" 的项目目录"})}),r.jsx("td",{className:"qqr-td",children:r.jsxs("div",{className:"qqr-row-actions",children:[r.jsx(S,{variant:"outline",onClick:()=>{e.rebind(a.groupId)},disabled:t||a.sessionId==="",children:"重新绑定"}),r.jsx(S,{onClick:()=>{e.openMessages(a.groupId)},disabled:t||i,children:"消息"}),r.jsx(S,{onClick:()=>{e.deleteMapping(a.groupId)},disabled:t||a.sessionId==="",children:"解除绑定"})]})})]},a.groupId))})]})})})]})}function sr({model:e}){const{form:s,updateField:n}=e;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(I,{children:[r.jsx(q,{label:"默认项目目录",hint:"未单独配置群项目时，聊天记录与 DSH 会话使用的目录",children:r.jsx(v,{value:s.workspace,onChange:t=>{n("workspace",t)},placeholder:"~/dsh/qq-relay-ws",ariaLabel:"默认项目目录"})}),r.jsx(q,{label:"会话标题模板",hint:"可用 {groupName} / {groupId}",children:r.jsx(v,{value:s.sessionTitle,onChange:t=>{n("sessionTitle",t)},placeholder:"QQ群：{groupName}",ariaLabel:"会话标题模板"})})]}),r.jsx(er,{model:e}),r.jsx(Zs,{model:e})]})}function rr({model:e}){const{form:s,updateField:n}=e;return r.jsx("div",{className:"qqr-panel",children:r.jsxs(I,{children:[r.jsx(q,{label:"聊天记录保留天数",hint:"0 = 永不自动删除；7..3650 = 自动清理天数（保存后生效）",children:r.jsx(v,{value:s.chatRetentionDays,onChange:t=>{n("chatRetentionDays",t)},inputMode:"numeric",placeholder:"0",ariaLabel:"聊天记录保留天数"})}),r.jsxs(x,{children:[r.jsxs("p",{className:"qqr-hint",children:["聊天记录与媒体文件默认",r.jsx("b",{children:"永不自动删除"}),"（保留天数 0）。填 7..3650 保存后， 宿主启动时与每天各清理一次超过该天数的 ",r.jsx("code",{children:".qq-relay/chat/"})," 日文件与",r.jsx("code",{children:" .qq-relay/media/"})," 日期目录。"]}),r.jsxs("div",{className:"qqr-headline",children:[r.jsx(S,{variant:"outline",onClick:e.cleanup,disabled:e.busy||e.loading,children:"立即清理"}),r.jsx("span",{className:"qqr-hint",children:"用上面的天数（1..3650）清一次，不改配置、不动群映射；删除后不可恢复。"})]})]})]})})}function nr(){const e=Ws();$e();const s=e.tab==="connection"?r.jsx(Qs,{model:e}):e.tab==="env"?r.jsx(Vs,{model:e}):e.tab==="project"?r.jsx(sr,{model:e}):e.tab==="behavior"?r.jsx(Bs,{model:e}):e.tab==="comfy"?r.jsx(zs,{model:e}):e.tab==="presets"?r.jsx(Xs,{model:e}):r.jsx(rr,{model:e});return r.jsxs("div",{className:"qqr-root","data-plugin":"dsh-qq-relay",children:[r.jsxs("div",{className:"qqr-head",children:[r.jsx(me,{line:e.statusLine}),r.jsxs("div",{className:"qqr-actions",children:[r.jsx(S,{onClick:e.refresh,disabled:e.loading||e.busy,children:"刷新"}),r.jsx(S,{variant:"outline",onClick:e.reconnect,disabled:e.loading||e.busy,children:"重新连接"}),r.jsx(S,{variant:"primary",onClick:e.save,disabled:e.loading||e.busy,children:"保存并重连"})]})]}),r.jsx("nav",{className:"qqr-tabs",role:"tablist","aria-label":"QQ 机器人配置",children:As.map(n=>r.jsx("button",{type:"button",role:"tab",id:"qqr-tab-"+n.id,className:"qqr-tab","data-active":e.tab===n.id,"aria-selected":e.tab===n.id,"aria-controls":"qqr-tabpanel",onClick:()=>{e.setTab(n.id)},children:n.label},n.id))}),e.tab==="env"?r.jsx(N,{tone:"muted",children:"环境页把 NapCat 的 Docker 安装步骤收敛成 7 个检查：环境目录、Docker CLI、容器引擎、 compose 文件、NapCat 容器、QQ 登录、OneBot 配置与插件回填。安装类动作执行前会二次确认。"}):null,e.tab==="comfy"?r.jsx(N,{tone:"muted",children:"ComfyUI 出图 / 视频：连接成功后 host 会为 DSH 加载 comfy-image（出图）与 comfy-video（视频）两个 skill。"}):null,e.error!==null?r.jsx(N,{tone:"error",role:"alert",children:e.error}):null,e.notice!==null?r.jsx(N,{tone:"ok",role:"status",children:e.notice}):null,e.dirty?r.jsx(N,{tone:"warn",children:"有未保存的修改。"}):null,r.jsx("div",{id:"qqr-tabpanel",role:"tabpanel","aria-labelledby":"qqr-tab-"+e.tab,children:s}),r.jsxs("p",{className:"qqr-footer",children:["配置来源：profile 的 ",r.jsx("code",{children:"cordis.patch.yml"}),"，本页保存的覆盖写入",r.jsx("code",{children:" ~/.dsh/storages/dsh-qq-relay/settings.json"}),"；预设写入同目录的",r.jsx("code",{children:"presets.json"})," 并在启动时动态注册；画图 / 视频 skill 由 host 在 ComfyUI 连接成功后动态注册（",r.jsx("code",{children:"lib/skills/comfy-image"})," 下的 SKILL.md 出图、 SKILL-video.md 视频），不需要重启 GUI。token 只写不读，页面永远看不到明文。"]})]})}const tr="dsh-qq-relay",ar=["slots"],ir="dsh-qq-relay";function lr(e){var t;const s=e,n=(t=s==null?void 0:s.get)==null?void 0:t.call(s,"slots");if(!(n===void 0||typeof n.inject!="function"||typeof n.register!="function"))try{n.inject("plugins.bundle.config",()=>n.register({name:"plugins.bundle.config",key:ir},nr))}catch{}}exports.apply=lr;exports.inject=ar;exports.name=tr;

		return module.exports;
	}
});
