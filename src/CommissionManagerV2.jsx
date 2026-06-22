// AI 코드 작성 도움: 클로드(Claude)

import React, { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";


/*
  ┌─ 설치 필요 패키지 ─────────────────────────────────────────┐
  │  npm install @emailjs/browser html2canvas jspdf             │
  └────────────────────────────────────────────────────────────┘
*/

const EMAILJS_CONFIG = {
  serviceId:      "YOUR_SERVICE_ID",
  artistTemplate: "YOUR_ARTIST_TEMPLATE_ID",
  clientTemplate: "YOUR_CLIENT_TEMPLATE_ID",
  publicKey:      "YOUR_PUBLIC_KEY",
  artistEmail:    "your@email.com",
};

const PALETTES = {
  light: { bg:"#F5F5F3", panel:"#FFFFFF", ink:"#1C1D1F", steel:"#8A8D91", line:"#E2E2DF", blue:"#4A6B8A", accent:"#C9685A" },
  dark:  { bg:"#0F1011", panel:"#18191C", ink:"#EDECEA", steel:"#6B6E75", line:"#2C2D30", blue:"#7BAAC8", accent:"#D4796B" },
};

const STATUS = {
  요청:  { label:"요청",  color:"#8A8D91", bg:"#F0F0EE" },
  진행중:{ label:"진행중",color:"#1C1D1F", bg:"#E4ECF3" },
  검수:  { label:"검수",  color:"#1C1D1F", bg:"#F4E6D7" },
  완료:  { label:"완료",  color:"#FFFFFF", bg:"#4A6B8A" },
  취소:  { label:"취소",  color:"#FFFFFF", bg:"#C9685A" },
};

const PRICE_TABLE = [
  { id:"bust",  name:"흉상", en:"Bust",      base:40000,  desc:"어깨 위, 단색 배경",     days:6  },
  { id:"half",  name:"반신", en:"Half body", base:70000,  desc:"허리 위, 간단 배경",     days:9  },
  { id:"full",  name:"전신", en:"Full body", base:110000, desc:"전체 신체, 디테일 배경", days:16 },
  { id:"chibi", name:"마스코트", en:"mascot",     base:30000,  desc:"귀여운 사과 캐릭터",     days:4  },
];

const OPTIONS = [
  { id:"extra_char", name:"캐릭터 추가 1인",     price:0.6   },
  { id:"complex_bg", name:"복잡한 배경",           price:30000 },
  { id:"rush",       name:"긴급 작업 (3일 이내)", price:0.3   },
  { id:"commercial", name:"상업적 이용 라이선스", price:50000 },
];

const initialRequests = [
  { id:1, client:"별빛여우",       email:"", type:"half",  options:["complex_bg"],       extraChars:0, detail:"팬아트, 노을 배경, 따뜻한 색감 부탁드립니다.",   deadline:"2026-06-25", status:"진행중", price:100000, createdAt:"2026-06-08", notes:[], depositPaid:true,  balancePaid:false },
  { id:2, client:"moonlit_dev",    email:"", type:"full",  options:["commercial"],        extraChars:1, detail:"게임 타이틀 키 비주얼용 캐릭터. 레퍼런스 첨부함.", deadline:"2026-07-02", status:"요청",   price:226000, createdAt:"2026-06-10", notes:[], depositPaid:false, balancePaid:false },
  { id:3, client:"콩떡이",         email:"", type:"chibi", options:[],                    extraChars:0, detail:"굿즈용 마스코트 캐릭터, 단순 배경",               deadline:"2026-06-15", status:"완료",   price:30000,  createdAt:"2026-06-01", notes:[{ text:"납품 완료. 클라이언트 매우 만족.", date:"2026-06-14" }], depositPaid:true, balancePaid:true },
  { id:4, client:"redtail_studio", email:"", type:"full",  options:["complex_bg","rush"], extraChars:2, detail:"팀 단체 일러스트, 던전 배경, 액션 포즈",           deadline:"2026-06-18", status:"검수",   price:286000, createdAt:"2026-06-05", notes:[{ text:"색감 수정 요청 있음. 재시안 전달 예정.", date:"2026-06-12" }], depositPaid:true, balancePaid:false },
];

function calcPrice(type, extraChars, options) {
  const base = PRICE_TABLE.find(p=>p.id===type)?.base ?? 0;
  let total = base, rush = 0;
  options.forEach(id=>{ const o=OPTIONS.find(x=>x.id===id); if(!o||o.id==="extra_char")return; if(o.id==="rush") rush=o.price; else total+=o.price; });
  total += base * extraChars * 0.6;
  total += total * rush;
  return Math.round(total);
}

function formatKRW(n) { return n.toLocaleString("ko-KR") + "원"; }

function getEstimatedDate(type, options) {
  const p = PRICE_TABLE.find(x=>x.id===type); if(!p) return null;
  let days = p.days;
  if(options.includes("rush")) days = Math.ceil(days * 0.5);
  const d = new Date(); d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}

// ─── 공통 헬퍼 ───────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS["요청"];
  return <span style={{ display:"inline-flex", alignItems:"center", fontWeight:700, fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", padding:"4px 10px", borderRadius:4, color:s.color, background:s.bg }}>{s.label}</span>;
}

function Tabs({ active, onChange, colors }) {
  const tabs = [
    { id:"form",   label:"Intake",             num:"01" },
    { id:"board",  label:"Pipeline",           num:"02" },
    { id:"price",  label:"Pricing & Contract", num:"03" },
    { id:"status", label:"Status Check",       num:"04" },
  ];
  return (
    <div style={{ display:"flex", marginBottom:48, borderBottom:`1px solid ${colors.line}` }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{ display:"flex", alignItems:"baseline", gap:10, fontSize:14, fontWeight:600, padding:"0 28px 18px 0", marginRight:28, border:"none", borderBottom:active===t.id?`2px solid ${colors.ink}`:"2px solid transparent", background:"transparent", color:active===t.id?colors.ink:colors.steel, cursor:"pointer", marginBottom:-1, transition:"color 0.2s" }}>
          <span style={{ fontSize:11, fontWeight:700, color:active===t.id?colors.blue:colors.steel }}>{t.num}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, colors }) {
  return <div><div style={{ fontSize:11, fontWeight:700, color:colors.steel, marginBottom:8, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</div>{children}</div>;
}

const makeInput  = (c) => ({ width:"100%", padding:"12px 14px", border:`1px solid ${c.line}`, borderRadius:6, fontSize:14, outline:"none", background:c.panel, color:c.ink, boxSizing:"border-box", fontFamily:"inherit" });
const makePanel  = (c) => ({ background:c.panel, border:`1px solid ${c.line}`, borderRadius:12, padding:24 });

// ─── 01 Intake ────────────────────────────────────────────
function RequestForm({ onSubmit, colors }) {
  const inputStyle = makeInput(colors);
  const panelStyle = makePanel(colors);
  const [form, setForm] = useState({ client:"", email:"", type:"half", extraChars:0, options:[], detail:"", deadline:"" });
  const [mailStatus, setMailStatus] = useState(null);
  const toggleOpt = (id) => setForm(f=>({...f,options:f.options.includes(id)?f.options.filter(o=>o!==id):[...f.options,id]}));
  const price = calcPrice(form.type, Number(form.extraChars)||0, form.options);
  const estDate = getEstimatedDate(form.type, form.options);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!form.client||!form.deadline) return;
    const req = {...form,extraChars:Number(form.extraChars)||0,price,status:"요청",createdAt:new Date().toISOString().slice(0,10),notes:[]};
    onSubmit(req);
    const typeName = PRICE_TABLE.find(p=>p.id===form.type)?.name ?? form.type;
    const params = { client_name:form.client, client_email:form.email, work_type:typeName, extra_chars:String(Number(form.extraChars)||0), options:form.options.map(id=>OPTIONS.find(o=>o.id===id)?.name).filter(Boolean).join(", ")||"없음", total_price:formatKRW(price), deadline:form.deadline, est_date:estDate??"-", detail:form.detail||"(없음)", artist_email:EMAILJS_CONFIG.artistEmail };
    setMailStatus("sending");
    try {
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.artistTemplate, params, EMAILJS_CONFIG.publicKey);
      if(form.email) await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.clientTemplate, params, EMAILJS_CONFIG.publicKey);
      setMailStatus("ok");
    } catch { setMailStatus("error"); }
    setForm({ client:"", email:"", type:"half", extraChars:0, options:[], detail:"", deadline:"" });
    setTimeout(()=>setMailStatus(null), 3000);
  };

  const submitBtn = { fontWeight:700, fontSize:14, padding:"16px 24px", background:colors.ink, color:colors.panel, border:"none", borderRadius:8, cursor:"pointer" };
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:24 }}>
      <div style={{ gridColumn:"1/-1", background:colors.ink, color:"#fff", borderRadius:12, padding:"48px 40px", display:"flex", flexDirection:"column", justifyContent:"space-between", minHeight:180 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#A8B9C6", letterSpacing:"0.2em", textTransform:"uppercase" }}>New Commission</div>
        <div style={{ fontSize:48, fontWeight:800, lineHeight:1.1, letterSpacing:"-0.02em" }}>새 의뢰를<br />접수하세요</div>
      </div>
      <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:20 }}>
        <div style={panelStyle}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="클라이언트 / 의뢰인명" colors={colors}><input value={form.client} onChange={e=>setForm({...form,client:e.target.value})} placeholder="예: 별빛여우" style={inputStyle} required /></Field>
            <Field label="이메일 (확인 메일 발송용 — 선택)" colors={colors}><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="client@email.com" style={inputStyle} /></Field>
          </div>
        </div>
        <div style={panelStyle}>
          <Field label="작업 유형" colors={colors}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {PRICE_TABLE.map(p=>(
                <label key={p.id} style={{ border:`1px solid ${form.type===p.id?colors.ink:colors.line}`, borderRadius:8, padding:"14px", cursor:"pointer", background:form.type===p.id?colors.bg:colors.panel, transition:"all 0.15s" }}>
                  <input type="radio" name="type" checked={form.type===p.id} onChange={()=>setForm({...form,type:p.id})} style={{display:"none"}} />
                  <div style={{ fontSize:11, color:colors.steel, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>{p.en}</div>
                  <div style={{ fontWeight:700, fontSize:15, margin:"2px 0", color:colors.ink }}>{p.name}</div>
                  <div style={{ fontSize:12, color:colors.steel }}>{p.desc}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:colors.blue, marginTop:6 }}>{formatKRW(p.base)}~</div>
                </label>
              ))}
            </div>
          </Field>
        </div>
        <div style={{...panelStyle,display:"flex",gap:24}}>
          <div style={{flex:1}}><Field label="추가 캐릭터 수" colors={colors}><input type="number" min="0" value={form.extraChars} onChange={e=>setForm({...form,extraChars:e.target.value})} style={inputStyle} /></Field></div>
          <div style={{flex:1}}><Field label="희망 마감일" colors={colors}><input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} style={inputStyle} required /></Field></div>
        </div>
        <div style={panelStyle}>
          <Field label="추가 옵션" colors={colors}>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {OPTIONS.filter(o=>o.id!=="extra_char").map(o=>(
                <label key={o.id} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, padding:"10px 12px", border:`1px solid ${colors.line}`, borderRadius:6, cursor:"pointer", background:form.options.includes(o.id)?colors.bg:colors.panel }}>
                  <input type="checkbox" checked={form.options.includes(o.id)} onChange={()=>toggleOpt(o.id)} />
                  <span style={{fontWeight:600,color:colors.ink}}>{o.name}</span>
                  <span style={{color:colors.steel,marginLeft:"auto",fontWeight:700}}>{o.id==="rush"?`+${o.price*100}%`:`+${formatKRW(o.price)}`}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>
        <div style={panelStyle}><Field label="작업 상세 설명" colors={colors}><textarea value={form.detail} onChange={e=>setForm({...form,detail:e.target.value})} placeholder="레퍼런스, 분위기, 색감, 캐릭터 설정 등을 적어주세요." style={{...inputStyle,minHeight:100,resize:"vertical"}} /></Field></div>
        <button type="submit" style={submitBtn} disabled={mailStatus==="sending"}>{mailStatus==="sending"?"전송 중…":"의뢰 접수하기 →"}</button>
        {mailStatus==="ok"    && <div style={{fontSize:13,color:colors.blue,fontWeight:700}}>✓ 의뢰가 등록되었습니다. 이메일 발송 완료!</div>}
      </form>

      <div style={{...makePanel(colors),alignSelf:"start",position:"sticky",top:24,background:colors.bg}}>
        <div style={{fontSize:11,fontWeight:700,color:colors.steel,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Estimate</div>
        <div style={{fontSize:44,fontWeight:800,letterSpacing:"-0.02em",color:colors.ink,marginBottom:24,lineHeight:1}}>{formatKRW(price)}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,fontSize:13}}>
          <SummaryRow label={PRICE_TABLE.find(p=>p.id===form.type)?.name} value={formatKRW(PRICE_TABLE.find(p=>p.id===form.type)?.base)} colors={colors} />
          {Number(form.extraChars)>0&&<SummaryRow label={`추가 캐릭터 ×${form.extraChars}`} value={`+${formatKRW(PRICE_TABLE.find(p=>p.id===form.type)?.base*Number(form.extraChars)*0.6)}`} colors={colors} />}
          {form.options.map(id=>{ const o=OPTIONS.find(x=>x.id===id); if(!o)return null; return <SummaryRow key={id} label={o.name} value={o.id==="rush"?`+${o.price*100}%`:`+${formatKRW(o.price)}`} colors={colors} />; })}
        </div>
        {estDate&&(<div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${colors.line}`}}><div style={{fontSize:10,fontWeight:800,color:colors.steel,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:6}}>예상 완성일</div><div style={{fontSize:20,fontWeight:800,color:colors.blue}}>{estDate}</div></div>)}
        <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${colors.line}`,fontSize:12,color:colors.steel,lineHeight:1.6}}>최종 가격은 작업 진행 시 협의에 따라 조정될 수 있습니다.</div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, colors }) {
  return <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:colors.steel}}>{label}</span><span style={{fontWeight:700,color:colors.ink}}>{value}</span></div>;
}

// ─── 월별 수익 차트 (SVG) ─────────────────────────────────
function RevenueChart({ requests, colors }) {
  const monthData = {};
  requests.filter(r=>r.status==="완료").forEach(r=>{
    const m = (r.createdAt||"").slice(0,7);
    if(m) monthData[m] = (monthData[m]||0) + r.price;
  });
  const months = Object.keys(monthData).sort().slice(-6); // 최근 6개월
  if(months.length === 0) return null;

  const maxVal = Math.max(...months.map(m=>monthData[m]));
  const W = 560; const H = 140; const barW = Math.min(56, W/months.length - 12);
  const gap = W / months.length;

  return (
    <div style={{...makePanel(colors), marginBottom:24}}>
      <div style={{fontSize:11,fontWeight:800,color:colors.steel,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:20}}>Monthly Revenue · 월별 수익</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H+48}`} style={{overflow:"visible"}}>
        {/* 배경 격자선 */}
        {[0.25,0.5,0.75,1].map(ratio=>{
          const y = H - H*ratio;
          return <line key={ratio} x1={0} y1={y} x2={W} y2={y} stroke={colors.line} strokeWidth={1} strokeDasharray="4 4" />;
        })}
        {months.map((m,i)=>{
          const val = monthData[m];
          const barH = Math.max((val/maxVal)*H, 4);
          const x = i*gap + gap/2 - barW/2;
          const y = H - barH;
          return (
            <g key={m}>
              <rect x={x} y={y} width={barW} height={barH} rx={5} fill={colors.blue} opacity={0.85} />
              <text x={x+barW/2} y={y-8} textAnchor="middle" fontSize={10} fill={colors.steel} fontWeight={700} fontFamily="Inter,sans-serif">
                {(val/10000).toFixed(0)}만
              </text>
              <text x={x+barW/2} y={H+22} textAnchor="middle" fontSize={10} fill={colors.steel} fontFamily="Inter,sans-serif">
                {m.slice(5)}월
              </text>
            </g>
          );
        })}
        <line x1={0} y1={H} x2={W} y2={H} stroke={colors.line} strokeWidth={1} />
      </svg>
      <div style={{fontSize:12,color:colors.steel,marginTop:4}}>총 수익: {formatKRW(months.reduce((a,m)=>a+monthData[m],0))}</div>
    </div>
  );
}

// ─── 02 Pipeline ─────────────────────────────────────────
function Board({ requests, onStatusChange, onAddNote, onTogglePayment, colors }) {
  const panelStyle = makePanel(colors);
  const columns = ["요청","진행중","검수","완료","취소"];
  const counts = columns.map(c=>requests.filter(r=>r.status===c).length);
  const totalRevenue  = requests.filter(r=>r.status==="완료").reduce((a,r)=>a+r.price,0);
  const activeRevenue = requests.filter(r=>r.status!=="완료"&&r.status!=="취소").reduce((a,r)=>a+r.price,0);

  return (
    <div>
      {/* Bento summary */}
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr",gap:16,marginBottom:24}}>
        <div style={{...panelStyle,background:colors.ink,color:"#fff",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#A8B9C6",letterSpacing:"0.2em",textTransform:"uppercase"}}>Active Pipeline</div>
          <div style={{fontSize:36,fontWeight:800,letterSpacing:"-0.02em"}}>{requests.filter(r=>r.status!=="완료"&&r.status!=="취소").length}건</div>
          <div style={{fontSize:12,color:"#A8B9C6",marginTop:8}}>진행중 금액: {formatKRW(activeRevenue)}</div>
        </div>
        {columns.map((c,i)=>(
          <div key={c} style={{...panelStyle,textAlign:"center"}}>
            <div style={{marginBottom:12}}><StatusBadge status={c} /></div>
            <div style={{fontSize:32,fontWeight:800,color:colors.ink}}>{counts[i]}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:16}}>
        {columns.map(col=>(
          <div key={col}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:colors.steel,marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${colors.line}`}}>{col}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {requests.filter(r=>r.status===col).map(r=>(
                <RequestCard key={r.id} request={r} onStatusChange={onStatusChange} onAddNote={onAddNote} onTogglePayment={onTogglePayment} columns={columns} colors={colors} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RequestCard (메모/대화 로그 포함) ───────────────────
function RequestCard({ request, onStatusChange, onAddNote, onTogglePayment, columns, colors }) {
  const panelStyle = makePanel(colors);
  const today = new Date(); const dlDate = new Date(request.deadline);
  const daysLeft = Math.ceil((dlDate - today) / 86400000);
  const urgency = daysLeft<=3 ? colors.accent : daysLeft<=7 ? "#D4A017" : "transparent";

  const [showNotes, setShowNotes] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  const handleAddNote = () => {
    const text = noteInput.trim();
    if(!text) return;
    onAddNote(request.id, text);
    setNoteInput("");
  };

  const depositAmt  = Math.round(request.price * 0.5);
  const balanceAmt  = request.price - depositAmt;

  return (
    <div style={{...panelStyle,padding:16,display:"flex",flexDirection:"column",gap:8,borderLeft:`3px solid ${urgency}`}}>
      <div style={{fontWeight:700,fontSize:14,color:colors.ink}}>{request.client}</div>
      <div style={{fontSize:11,color:colors.steel,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{PRICE_TABLE.find(p=>p.id===request.type)?.en}</div>
      <div style={{fontSize:12,color:colors.steel,lineHeight:1.5}}>{request.detail.length>50?request.detail.slice(0,50)+"…":request.detail}</div>
      <div style={{fontSize:13,fontWeight:800,color:colors.ink}}>{formatKRW(request.price)}</div>
      <div style={{fontSize:11,color:daysLeft<=3?colors.accent:colors.steel,fontWeight:daysLeft<=3?700:400}}>
        마감 {request.deadline}{daysLeft<=7&&request.status!=="완료"&&request.status!=="취소"?` (${daysLeft}일 남음)`:""}
      </div>

      {/* ── 결제 추적 ── */}
      <div style={{borderTop:`1px solid ${colors.line}`,paddingTop:8,display:"flex",flexDirection:"column",gap:6}}>
        <div style={{fontSize:10,fontWeight:800,color:colors.steel,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:2}}>결제 현황</div>
        {[
          { key:"depositPaid",  label:"선입금", amount:depositAmt  },
          { key:"balancePaid",  label:"잔금",   amount:balanceAmt  },
        ].map(({ key, label, amount }) => {
          const paid = request[key] ?? false;
          return (
            <label key={key} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}
              onClick={() => onTogglePayment(request.id, key)}>
              <div style={{
                width:18, height:18, borderRadius:4, flexShrink:0,
                border:`2px solid ${paid ? colors.green : colors.line}`,
                background: paid ? colors.green : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.15s",
              }}>
                {paid && <span style={{color:"#fff",fontSize:11,fontWeight:800,lineHeight:1}}>✓</span>}
              </div>
              <span style={{fontSize:12,fontWeight:600,color:paid?colors.ink:colors.steel,textDecoration:paid?"line-through":"none",transition:"all 0.15s"}}>
                {label}
              </span>
              <span style={{fontSize:11,color:colors.steel,marginLeft:"auto"}}>{formatKRW(amount)}</span>
            </label>
          );
        })}
        {/* 전체 납부 표시 */}
        {request.depositPaid && request.balancePaid && (
          <div style={{fontSize:11,fontWeight:700,color:colors.green,marginTop:2}}>✓ 전액 납부 완료</div>
        )}
      </div>

      <select value={request.status} onChange={e=>onStatusChange(request.id,e.target.value)} style={{fontSize:12,padding:"8px 10px",border:`1px solid ${colors.line}`,borderRadius:6,marginTop:4,fontWeight:700,background:colors.panel,color:colors.ink,cursor:"pointer"}}>
        {columns.map(c=><option key={c} value={c}>{c}</option>)}
      </select>

      {/* ── 메모/대화 로그 ── */}
      <button
        onClick={()=>setShowNotes(v=>!v)}
        style={{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,color:colors.steel,background:"transparent",border:`1px solid ${colors.line}`,borderRadius:6,padding:"6px 10px",cursor:"pointer",marginTop:2}}
      >
        💬 메모 {request.notes?.length ? `(${request.notes.length})` : ""}
        <span style={{marginLeft:"auto",fontSize:10}}>{showNotes?"▲":"▼"}</span>
      </button>

      {showNotes && (
        <div style={{display:"flex",flexDirection:"column",gap:8,padding:"10px 0 4px"}}>
          {/* 기존 메모 목록 */}
          {request.notes?.length > 0 ? (
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:160,overflowY:"auto"}}>
              {request.notes.map((note,i)=>(
                <div key={i} style={{background:colors.bg,borderRadius:6,padding:"8px 10px"}}>
                  <div style={{fontSize:12,color:colors.ink,lineHeight:1.5}}>{note.text}</div>
                  <div style={{fontSize:10,color:colors.steel,marginTop:4}}>{note.date}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{fontSize:11,color:colors.steel,textAlign:"center",padding:"8px 0"}}>메모 없음</div>
          )}
          {/* 새 메모 입력 */}
          <div style={{display:"flex",gap:6}}>
            <input
              value={noteInput}
              onChange={e=>setNoteInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleAddNote()}
              placeholder="메모 추가…"
              style={{flex:1,padding:"7px 10px",border:`1px solid ${colors.line}`,borderRadius:6,fontSize:12,background:colors.panel,color:colors.ink,outline:"none",fontFamily:"inherit"}}
            />
            <button onClick={handleAddNote} style={{padding:"7px 12px",background:colors.ink,color:colors.panel,border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>+</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 03 Pricing & Contract (PDF 다운로드 포함) ──────────
function PriceAndContract({ requests, colors }) {
  const panelStyle = makePanel(colors);
  const inputStyle = makeInput(colors);
  const [selectedId, setSelectedId] = useState(requests[0]?.id ?? null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const selected = requests.find(r=>r.id===selectedId);
  const today = new Date().toISOString().slice(0,10);
  const contractRef = useRef(null);

  // ── PDF 다운로드 ────────────────────────────────────────
  const downloadPDF = async () => {
    const el = contractRef.current;
    if(!el || !selected) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(el, { scale:2, useCORS:true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH  = (canvas.height * pageW) / canvas.width;

      if(imgH <= pageH) {
        pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH);
      } else {
        let yOffset = 0;
        while(yOffset < imgH) {
          if(yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -yOffset, pageW, imgH);
          yOffset += pageH;
        }
      }
      pdf.save(`contract_${selected.client}_${today}.pdf`);
    } catch(err) {
      console.error("PDF 생성 실패:", err);
      alert("PDF 생성에 실패했습니다. 다시 시도해주세요.");
    }
    setPdfLoading(false);
  };

  return (
    <div>
      {/* 가격표 */}
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr",gap:16,marginBottom:32}}>
        <div style={{...panelStyle,background:colors.ink,color:"#fff",gridRow:"span 2",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#A8B9C6",letterSpacing:"0.2em",textTransform:"uppercase"}}>Price Sheet</div>
          <div>
            <div style={{fontSize:38,fontWeight:800,lineHeight:1.15,letterSpacing:"-0.02em"}}>작업 단가와<br />옵션 비용</div>
            <div style={{fontSize:13,color:"#A8B9C6",marginTop:12}}>기본 가격은 작업 난이도에 따라 조정될 수 있습니다.</div>
          </div>
        </div>
        {PRICE_TABLE.map(p=>(
          <div key={p.id} style={panelStyle}>
            <div style={{fontSize:11,color:colors.steel,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{p.en}</div>
            <div style={{fontWeight:700,fontSize:15,margin:"4px 0",color:colors.ink}}>{p.name}</div>
            <div style={{fontSize:12,color:colors.steel,marginBottom:10}}>{p.desc}</div>
            <div style={{fontSize:24,fontWeight:800,color:colors.blue,letterSpacing:"-0.01em"}}>{formatKRW(p.base)}</div>
          </div>
        ))}
        {OPTIONS.map(o=>(
          <div key={o.id} style={{...panelStyle,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div style={{fontWeight:600,fontSize:13,color:colors.ink}}>{o.name}</div>
            <div style={{fontSize:20,fontWeight:800,marginTop:8,color:colors.ink}}>{o.id==="rush"||o.id==="extra_char"?`${o.price*100}%`:formatKRW(o.price)}</div>
          </div>
        ))}
      </div>

      {/* 계약서 생성 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:24}}>
        <div style={panelStyle}>
          <div style={{fontSize:11,fontWeight:700,color:colors.steel,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16}}>Generate Contract</div>
          <Field label="의뢰 선택" colors={colors}>
            <select value={selectedId??""} onChange={e=>setSelectedId(Number(e.target.value))} style={inputStyle}>
              {requests.map(r=><option key={r.id} value={r.id}>{r.client} — {PRICE_TABLE.find(p=>p.id===r.type)?.name}</option>)}
            </select>
          </Field>
          {/* PDF 저장 버튼 */}
          {selected && (
            <button
              onClick={downloadPDF}
              disabled={pdfLoading}
              style={{ marginTop:20, width:"100%", fontWeight:700, fontSize:13, padding:"14px", background:pdfLoading?"#ccc":colors.blue, color:"#fff", border:"none", borderRadius:8, cursor:pdfLoading?"not-allowed":"pointer", transition:"background 0.15s" }}
            >
              {pdfLoading ? "PDF 생성 중…" : "📄 PDF 저장"}
            </button>
          )}
        </div>

        {/* 계약서 본문 — PDF 캡처 대상 */}
        {selected && (
          <div ref={contractRef} style={{...panelStyle, padding:36, background:"#ffffff", color:"#1C1D1F"}}>
            <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.01em",marginBottom:2,color:"#1C1D1F"}}>일러스트 작업 의뢰 계약서</div>
            <div style={{fontSize:12,color:"#8A8D91",marginBottom:24}}>작성일 {today}</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:13}}>
              {[["의뢰인",selected.client],["작업 항목",PRICE_TABLE.find(p=>p.id===selected.type)?.name],["추가 옵션",selected.options.length?selected.options.map(id=>OPTIONS.find(o=>o.id===id)?.name).join(", "):"없음"],["추가 캐릭터",`${selected.extraChars}명`],["작업 상세",selected.detail],["마감일",selected.deadline]].map(([l,v])=>(
                <div key={l} style={{display:"flex",gap:16}}>
                  <div style={{width:90,flexShrink:0,fontWeight:700,color:"#8A8D91"}}>{l}</div>
                  <div style={{color:"#1C1D1F"}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:20,padding:"20px 0",borderTop:"1px solid #E2E2DF",borderBottom:"1px solid #E2E2DF",display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontSize:12,color:"#8A8D91",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Total</span>
              <span style={{fontSize:32,fontWeight:800,color:"#1C1D1F"}}>{formatKRW(selected.price)}</span>
            </div>
            <div style={{marginTop:20,fontSize:12,color:"#8A8D91",lineHeight:1.8}}>
              <p style={{margin:"0 0 8px"}}>1. 작업 비용의 50%는 작업 착수 전 선입금하며, 잔금은 완료 후 최종 파일 전달 시 지급합니다.</p>
              <p style={{margin:"0 0 8px"}}>2. 무상 수정은 최대 2회이며, 이후 수정은 별도 비용이 청구됩니다.</p>
              <p style={{margin:"0 0 8px"}}>3. 상업적 이용 라이선스 미포함 시 개인·비상업적 용도로만 사용 가능합니다.</p>
              <p style={{margin:0}}>4. 착수 후 취소 시 선입금은 환불되지 않습니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 04 Status Check ─────────────────────────────────────
function PublicStatus({ requests, colors }) {
  const panelStyle = makePanel(colors);
  const inputStyle = makeInput(colors);
  const [query, setQuery] = useState(""); const [results, setResults] = useState([]); const [searched, setSearched] = useState(false);
  const handleSearch = () => { const q=query.trim().toLowerCase(); if(!q)return; setResults(requests.filter(r=>r.client.toLowerCase().includes(q)||String(r.id)===q)); setSearched(true); };
  const STEP_MAP = { 요청:1, 진행중:2, 검수:3, 완료:4, 취소:0 };
  const STEPS = ["요청 접수","작업 진행중","검수 단계","완료"];

  return (
    <div>
      <div style={{...panelStyle,background:colors.ink,color:"#fff",marginBottom:32}}>
        <div style={{fontSize:11,fontWeight:700,color:"#A8B9C6",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:12}}>Status Check</div>
        <div style={{fontSize:36,fontWeight:800,letterSpacing:"-0.02em",lineHeight:1.15}}>내 의뢰 진행 상황<br />확인하기</div>
        <div style={{fontSize:13,color:"#A8B9C6",marginTop:12}}>의뢰인 이름 또는 의뢰 번호로 검색하세요.</div>
      </div>
      <div style={{display:"flex",gap:12,marginBottom:32}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()} placeholder="이름 또는 의뢰 번호 입력" style={{...inputStyle,fontSize:16,padding:"14px 18px",flex:1}} />
        <button onClick={handleSearch} style={{fontWeight:700,fontSize:14,padding:"14px 28px",background:colors.blue,color:"#fff",border:"none",borderRadius:6,cursor:"pointer"}}>검색</button>
      </div>
      {searched&&results.length===0&&(<div style={{...panelStyle,textAlign:"center",padding:48,color:colors.steel}}><div style={{fontSize:32,marginBottom:12}}>🔍</div><div style={{fontWeight:700,fontSize:15,color:colors.ink}}>검색 결과가 없습니다</div></div>)}
      {results.map(r=>{
        const step = STEP_MAP[r.status]??0; const isCancelled = r.status==="취소";
        return (
          <div key={r.id} style={{...panelStyle,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:colors.steel,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>의뢰 #{r.id} · {r.createdAt}</div>
                <div style={{fontSize:22,fontWeight:800,color:colors.ink}}>{r.client}</div>
                <div style={{fontSize:13,color:colors.steel,marginTop:4}}>{PRICE_TABLE.find(p=>p.id===r.type)?.name} · 마감 {r.deadline}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
            {!isCancelled ? (
              <div style={{display:"flex",gap:0,marginBottom:8}}>
                {STEPS.map((s,i)=>(
                  <div key={s} style={{flex:1,textAlign:"center",position:"relative"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",margin:"0 auto 6px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,background:i<step?colors.blue:colors.line,color:i<step?"#fff":colors.steel,transition:"background 0.3s"}}>{i<step?"✓":i+1}</div>
                    <div style={{fontSize:10,fontWeight:700,color:i<=step-1?colors.ink:colors.steel,letterSpacing:"0.05em"}}>{s}</div>
                    {i<STEPS.length-1&&(<div style={{position:"absolute",top:14,left:"calc(50% + 14px)",right:"calc(-50% + 14px)",height:2,background:i<step-1?colors.blue:colors.line,transition:"background 0.3s"}} />)}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{padding:"12px 16px",borderRadius:8,background:"rgba(201,104,90,0.1)",color:colors.accent,fontSize:13,fontWeight:700}}>⚠ 이 의뢰는 취소되었습니다.</div>
            )}
            {r.detail&&(<div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${colors.line}`,fontSize:13,color:colors.steel,lineHeight:1.7}}><span style={{fontWeight:700,color:colors.ink,marginRight:8}}>작업 내용</span>{r.detail}</div>)}
            <div style={{marginTop:12,display:"flex",gap:16,fontSize:13,fontWeight:700}}><span style={{color:colors.steel}}>총 금액</span><span style={{color:colors.blue}}>{formatKRW(r.price)}</span></div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main CommissionManager ───────────────────────────────
export default function CommissionManager({ initialTab="form", onBack }) {
  const [tab,      setTab]      = useState(initialTab);
  const [requests, setRequests] = useState(initialRequests);
  const [isDark,   setIsDark]   = useState(()=>localStorage.getItem("studio-dark")==="1");

  const colors = isDark ? PALETTES.dark : PALETTES.light;

  const addRequest = (req) => setRequests(prev=>[...prev, {...req, id:Math.max(0,...prev.map(r=>r.id))+1}]);
  const changeStatus = (id, status) => setRequests(prev=>prev.map(r=>r.id===id?{...r,status}:r));
  const toggleDark = () => setIsDark(d=>{ localStorage.setItem("studio-dark",d?"0":"1"); return !d; });

  // ── 메모 추가 ──────────────────────────────────────────
  const addNote = (requestId, text) => {
    const date = new Date().toISOString().slice(0,10);
    setRequests(prev => prev.map(r =>
      r.id === requestId
        ? { ...r, notes: [...(r.notes||[]), { text, date }] }
        : r
    ));
  };

  // ── 결제 토글 (선입금 / 잔금) ────────────────────────
  const togglePayment = (requestId, field) => {
    setRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, [field]: !r[field] } : r
    ));
  };

  return (
    <div style={{fontFamily:"'Inter',sans-serif",background:colors.bg,minHeight:"100vh",padding:"56px 40px",color:colors.ink,transition:"background 0.25s,color 0.25s"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{maxWidth:1240,margin:"0 auto"}}>
        <header style={{marginBottom:36,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:colors.blue,letterSpacing:"0.25em",textTransform:"uppercase",marginBottom:10}}>Commission Desk</div>
            <h1 style={{fontSize:40,fontWeight:800,margin:0,letterSpacing:"-0.02em"}}>커미션 의뢰 관리</h1>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              {onBack&&<button onClick={onBack} style={{background:"transparent",border:"none",color:colors.steel,fontSize:13,fontWeight:700,cursor:"pointer"}}>← 홈으로</button>}
              <button onClick={toggleDark} style={{background:colors.panel,border:`1px solid ${colors.line}`,borderRadius:6,padding:"6px 11px",cursor:"pointer",fontSize:14}}>{isDark?"☀️":"🌙"}</button>
            </div>
            <div style={{fontSize:13,color:colors.steel,textAlign:"right",maxWidth:260}}>의뢰 접수부터 진행 상태, 계약서까지 한 곳에서 관리하세요.</div>
          </div>
        </header>

        <Tabs active={tab} onChange={setTab} colors={colors} />

        {tab==="form"   && <RequestForm      onSubmit={addRequest}                        colors={colors} />}
        {tab==="board"  && <Board            requests={requests} onStatusChange={changeStatus} onAddNote={addNote} onTogglePayment={togglePayment} colors={colors} />}
        {tab==="price"  && <PriceAndContract requests={requests}                          colors={colors} />}
        {tab==="status" && <PublicStatus     requests={requests}                          colors={colors} />}
      </div>
    </div>
  );
}

// AI 코드 작성 도움: 클로드(Claude)