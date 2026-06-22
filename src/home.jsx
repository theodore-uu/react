// AI 코드 작성 도움: 클로드(Claude)

import React, { useState, useEffect, useContext, createContext } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── 팔레트 ───────────────────────────────────────────────
const PALETTES = {
  light: { bg:"#F5F5F3", panel:"#FFFFFF", ink:"#1C1D1F", steel:"#8A8D91", line:"#E2E2DF", blue:"#4A6B8A", accent:"#C9685A", green:"#5B8A6B", overlay:"rgba(28,29,31,0.92)", heroGrad:"linear-gradient(270deg,#1C1D1F,#2A3A4A,#4A6B8A,#1C2A1F,#1C1D1F)", cardGrad:"linear-gradient(180deg,rgba(28,29,31,0) 40%,rgba(28,29,31,0.85) 100%)", skelA:"#E8E8E5", skelB:"#F2F2EF" },
  dark:  { bg:"#0F1011", panel:"#18191C", ink:"#EDECEA", steel:"#6B6E75", line:"#2C2D30", blue:"#7BAAC8", accent:"#D4796B", green:"#7AAD8A", overlay:"rgba(0,0,0,0.94)", heroGrad:"linear-gradient(270deg,#070809,#0D1A24,#1A3A52,#0A100D,#070809)", cardGrad:"linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.88) 100%)", skelA:"#1E1F22", skelB:"#26272A" },
};

const ThemeCtx = createContext(PALETTES.light);
const useColors = () => useContext(ThemeCtx);

const gS = (c) => ({
  panel:  { background:c.panel, border:`1px solid ${c.line}`, borderRadius:12, padding:28 },
  input:  { padding:"10px 12px", border:`1px solid ${c.line}`, borderRadius:6, fontSize:13, outline:"none", fontFamily:"inherit", color:c.ink, background:c.panel, boxSizing:"border-box" },
  submit: { fontWeight:700, fontSize:13, padding:"10px 16px", background:c.ink, color:c.panel, border:"none", borderRadius:6, cursor:"pointer" },
});

// ─── 다국어 텍스트 (생략없이 유지) ──────────────────────
const TEXTS = {
  ko: {
    nav: { commission:"의뢰하기", pipeline:"진행 현황", pricing:"가격 안내", manage:"✏ 관리", done:"완료" },
    hero: { tag:"일러스트레이션 · 캐릭터 디자인", title:"캐릭터에 생명을\n불어넣습니다", sub:"게임 일러스트, 팬아트, 캐릭터 디자인, 커미션 작업을 진행합니다. 아래에서 작업물을 확인하고 의뢰를 접수해보세요.", cta:"커미션 의뢰하기 →" },
    about: { tag:"About", title:"일러스트레이터\n게임 캐릭터 디자인", desc:"게임과 개인 프로젝트를 위한 캐릭터 디자인, 일러스트를 작업합니다. 다양한 색감을 사용한 분위기 표현을 가장 자신있어 합니다.", tool:"사용 툴", period:"평균 작업 기간", career:"작업 경력", periodVal:"5 ~ 20일", careerVal:"2년" },
    works: { title:"Selected Works", hint:'작업물 클릭 → 상세 보기. "Before / After" 표시 작업물은 스케치 비교 가능. 관리 모드에서 순서 드래그·삭제·수정 가능.', add:"+ 작업물 추가하기", addS:"추가", cancel:"취소", searchPh:"제목·설명으로 검색…", noResult:"검색 결과가 없습니다" },
    slot: { tag:"Slot Status", open:"의뢰 가능", closing:"마감 임박", closed:"마감", remaining:(n)=>`${n}자리 남음`, waitlist:"대기 가능", next:"다음 슬롯 오픈:" },
    reviews: { title:"Client Reviews", avg:"평균" },
    cta: { gs:"Get Started", ctaTitle:"의뢰서 작성하고\n실시간 견적 받기", ctaBtn:"의뢰 접수 →", pl:"Pipeline", plTitle:"진행 상태 확인", plBtn:"보드 보기 →", pr:"Pricing", prTitle:"가격 · 계약서", prBtn:"확인하기 →" },
    modal: { about:"About This Work", tools:"Tools Used", process:"Process", before:"Before · Sketch", after:"After · Final", toBefore:"← 스케치 보기", toAfter:"완성본 보기 →" },
    cats: ["전체","배경 일러스트","팬아트","캐릭터디자인","흑백 캐릭터","게임 모작 일러스트","마스코트 디자인"],
    upload: { title:"작품 제목", cat:"카테고리", year:"연도", large:"크게 (2x2)", medium:"중간 (1x2)", small:"작게 (1x1)", img:"이미지 URL (완성본)", before:"스케치 이미지 URL — 선택", tools:"사용 툴 (쉼표 구분: Procreate, Photoshop)", note:"클라이언트 설명 / 작업 노트", process:"제작 과정 (줄바꿈으로 구분)" },
    faq: {
      title:"자주 묻는 질문",
      items:[
        { q:"수정은 몇 번 가능한가요?", a:"기본 2회 무상 수정을 제공합니다. 이후 수정은 회당 협의 금액이 청구됩니다." },
        { q:"파일 형식은 무엇으로 받나요?", a:"기본 PNG 파일로 납품합니다. PSD(원본) 파일은 별도 요청 시 추가 비용이 발생할 수 있습니다." },
        { q:"작업 기간은 얼마나 걸리나요?", a:"흉상 5~7일, 반신 7~10일, 전신 12~20일 정도 소요됩니다. 긴급 옵션 선택 시 단축 가능합니다." },
        { q:"선입금은 얼마인가요?", a:"총 금액의 50%를 작업 착수 전에 선입금합니다. 잔금은 최종 파일 전달 시 지급합니다." },
        { q:"레퍼런스 이미지를 꼭 첨부해야 하나요?", a:"필수는 아니지만, 원하시는 분위기나 스타일 레퍼런스가 있을수록 결과물이 더 만족스럽습니다." },
        { q:"캐릭터 설정이 복잡한 경우에도 가능한가요?", a:"네, 가능합니다. 복잡한 의상이나 소품이 많을 경우 가격이 조정될 수 있으니 사전에 말씀해 주세요." },
      ],
    },
    edit: { modalTitle:"작업물 수정", save:"저장", cancel:"취소", delConfirm:"이 작업물을 삭제할까요?" },
    footer:"© 2026 STUDIO. All works shown are for portfolio purposes.",
  },
  en: {
    nav: { commission:"Commission", pipeline:"Pipeline", pricing:"Pricing", manage:"✏ Manage", done:"Done" },
    hero: { tag:"Illustration · Character Design", title:"Bringing Characters\nto Life", sub:"Game illustration, fan art, character design and commission work. Browse my portfolio below and submit a request.", cta:"Start a Commission →" },
    about: { tag:"About", title:"Illustrator &\nCharacter Designer", desc:"I create character designs and illustrations for games and personal projects. My strength lies in expressive color palettes and atmospheric rendering.", tool:"Tools", period:"Avg. Turnaround", career:"Experience", periodVal:"5 – 20 days", careerVal:"2 years" },
    works: { title:"Selected Works", hint:'Click any work to view details. Works with "Before / After" show sketch comparisons. Drag to reorder in manage mode.', add:"+ Add Work", addS:"Add", cancel:"Cancel", searchPh:"Search by title or description…", noResult:"No results found" },
    slot: { tag:"Slot Status", open:"Open", closing:"Closing Soon", closed:"Closed", remaining:(n)=>`${n} slot${n>1?"s":""} left`, waitlist:"Waitlist available", next:"Next open:" },
    reviews: { title:"Client Reviews", avg:"Avg." },
    cta: { gs:"Get Started", ctaTitle:"Fill out the form\nfor an instant quote", ctaBtn:"Request Now →", pl:"Pipeline", plTitle:"Track Progress", plBtn:"View Board →", pr:"Pricing", prTitle:"Rates & Contract", prBtn:"See Pricing →" },
    modal: { about:"About This Work", tools:"Tools Used", process:"Process", before:"Before · Sketch", after:"After · Final", toBefore:"← View Sketch", toAfter:"View Final →" },
    cats: ["All","Background","Fan Art","Character Design","B&W","Game Study","Mascot"],
    upload: { title:"Title", cat:"Category", year:"Year", large:"Large (2×2)", medium:"Medium (1×2)", small:"Small (1×1)", img:"Image URL (final)", before:"Sketch image URL — optional", tools:"Tools (comma-separated: Procreate, Photoshop)", note:"Client note / work description", process:"Process steps (one per line)" },
    faq: {
      title:"FAQ",
      items:[
        { q:"How many revisions are included?", a:"2 free revisions are included. Additional revisions are available at an agreed fee." },
        { q:"What file formats do you deliver?", a:"Final delivery is PNG by default. PSD source files may be available for an additional fee." },
        { q:"How long does a commission take?", a:"Bust: 5–7 days, Half body: 7–10 days, Full body: 12–20 days. Rush orders can reduce this." },
        { q:"How much is the deposit?", a:"50% upfront before work begins. The remaining 50% is due upon final file delivery." },
        { q:"Do I need to provide reference images?", a:"Not required, but references help ensure the result matches your vision — the more detail, the better." },
        { q:"Can you handle complex character designs?", a:"Yes! Intricate outfits or many props may affect pricing — please mention them in advance." },
      ],
    },
    edit: { modalTitle:"Edit Work", save:"Save", cancel:"Cancel", delConfirm:"Delete this work?" },
    footer:"© 2026 STUDIO. All works for portfolio purposes.",
  },
};

const CAT_MAP_EN = { "All":"전체","Background":"배경 일러스트","Fan Art":"팬아트","Character Design":"캐릭터디자인","B&W":"흑백 캐릭터","Game Study":"게임 모작 일러스트","Mascot":"마스코트 디자인" };

const SNS = [
  { label:"Twitter", href:"https://x.com" },
  { label:"Pixiv",   href:"https://www.pixiv.net" },
  { label:"Instagram", href:"https://www.instagram.com" },
];

const initialWorks = [
  { id:1, title:"Frieren: Beyond Journey's End", category:"배경 일러스트", year:"2026", image:"https://res.cloudinary.com/dj6u66g7v/image/upload/제목_없는_아트워크_1_oeqf83", size:"large", tools:["Procreate","Photoshop"], clientNote:"프리렌 원작의 분위기를 살린 배경 일러스트. 광활한 여정의 끝, 노을과 고요한 자연을 담았습니다.", process:["섬네일로 구도 3종 시안 설계","원근 기반 배경 선화 작업","레이어별 채색 (하늘→중경→전경)","빛·조명 및 반사광 추가","최종 색 보정 및 대기 효과"] },
  { id:2, title:"Frieren", category:"팬아트", year:"2026", image:"https://res.cloudinary.com/dj6u66g7v/image/upload/KakaoTalk_20260622_105837104_f1zwxd", size:"medium", tools:["Procreate"], clientNote:"프리렌 캐릭터 팬아트. 조용하고 초연한 분위기 표현에 집중했습니다.", process:["러프 스케치 및 포즈 설정","선화 작업 (클린업)","기본 채색","마무리 보정"] },
  { id:3, title:"Fern", category:"팬아트", year:"2025", image:"https://res.cloudinary.com/dj6u66g7v/image/upload/hthht_uasiro", size:"medium", tools:["Procreate"], clientNote:"페른 캐릭터 팬아트. 마법사의 단호하고 진지한 면모를 담았습니다.", process:["러프 스케치","선화 작업","채색 및 음영 처리","마무리"] },
  { id:4, title:"Hatsune Miku", category:"캐릭터디자인", year:"2026", image:"https://res.cloudinary.com/dj6u66g7v/image/upload/12_czcgmy", size:"medium", tools:["Procreate","Photoshop"], clientNote:"하츠네 미쿠 캐릭터 디자인. 미래적이고 네온 감성의 색감을 적용한 개인 작업입니다.", process:["캐릭터 러프 및 포즈 확정","의상 디자인 세부 설계","선화 및 기본 채색","네온 효과 및 배경 작업","최종 보정"] },
  { id:5, title:"creation", category:"흑백 캐릭터", year:"2025", image:"https://res.cloudinary.com/dj6u66g7v/image/upload/제목_없는_아트워크_6_vo1m0v", size:"medium", tools:["Procreate"], clientNote:"흑백 단색으로 표현한 캐릭터 일러스트. 명암 대비와 붓 질감에 집중한 작업입니다.", process:["러프 스케치","선화 클린업","흑백 명암 단계별 작업","질감 브러시 마무리"] },
  { id:6, title:"Camellia", category:"게임 모작 일러스트", year:"2026", image:"https://res.cloudinary.com/dj6u66g7v/image/upload/제목_없는_아트워크_3_vhlvqu", before:"https://res.cloudinary.com/dj6u66g7v/image/upload/feffef_wuf3an", size:"medium", tools:["Procreate","Photoshop"], clientNote:"붕괴 스타레일 Camellia의 분위기를 담은 모작 일러스트. 스케치→완성본 비교 가능.", process:["레퍼런스 분석 및 구도 설계","러프 스케치 (before 이미지)","선화 및 기본 채색","에너지 이펙트 및 배경 작업","최종 합성 및 색보정"] },
  { id:7, title:"Neko", category:"마스코트 디자인", year:"2025", image:"https://res.cloudinary.com/dj6u66g7v/image/upload/제목_없는_아트워크_2_gutkuu", size:"medium", tools:["Procreate"], clientNote:"브랜드 마스코트용 고양이 캐릭터 디자인. 귀엽고 친근한 느낌을 목표로 했습니다.", process:["컨셉 러프 3종 제안","클라이언트 피드백 반영 후 확정","선화 및 채색","굿즈 시안 적용 및 납품"] },
];

const reviews = [
  { id:1, name:"별빛여우", work:"반신 일러스트", rating:5, date:"2026.05", comment:"디테일이 정말 살아있고, 수정 요청에도 빠르게 응답해주셨어요. 다음에도 꼭 다시 의뢰할게요!" },
  { id:2, name:"moonlit_dev", work:"캐릭터 디자인", rating:5, date:"2026.04", comment:"게임 타이틀에 딱 맞는 분위기로 작업해주셔서 만족스러웠습니다. 커뮤니케이션도 편했어요." },
  { id:3, name:"콩떡이", work:"마스코트", rating:4, date:"2026.03", comment:"귀여운 느낌을 잘 살려주셨고 작업 속도도 빨랐습니다. 다만 색감 옵션이 더 있으면 좋겠어요." },
];

const slotInfo = { total:5, filled:3, status:"open", nextOpen:"2026-07-01" };

const SPAN = {
  large:  { gridColumn:"span 2", gridRow:"span 2" },
  medium: { gridColumn:"span 1", gridRow:"span 2" },
  small:  { gridColumn:"span 1", gridRow:"span 1" },
};

// ─── Section ──────────────────────────────────────────────
function Section({ title, children }) {
  const c = useColors();
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontSize:10, fontWeight:800, color:c.steel, letterSpacing:"0.2em", textTransform:"uppercase", paddingBottom:10, marginBottom:14, borderBottom:`1px solid ${c.line}` }}>{title}</div>
      {children}
    </div>
  );
}

function EscBtn({ onClose }) {
  return (
    <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:6, padding:"5px 12px", color:"#fff", fontSize:11, fontWeight:800, cursor:"pointer" }}>ESC</button>
  );
}

// ─── Work Detail Modal ────────────────────────────────────
function WorkDetailModal({ work, onClose, t }) {
  const c = useColors();
  const [showBefore, setShowBefore] = useState(false);
  const hasBefore = !!work.before;
  const hasDetails = work.tools?.length || work.clientNote || work.process?.length;
  const ovStyle = { position:"fixed", inset:0, background:c.overlay, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:40 };

  useEffect(() => {
    const h = (e) => { if(e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!hasDetails) {
    return (
      <div onClick={onClose} style={ovStyle}>
        <div onClick={e=>e.stopPropagation()} style={{ position:"relative", maxWidth:860, width:"100%", borderRadius:16, overflow:"hidden", background:"#111", boxShadow:"0 40px 100px rgba(0,0,0,0.6)" }}>
          <div style={{ position:"relative", paddingTop:"65%" }}>
            <img src={work.image} alt={work.title} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain" }} />
            <EscBtn onClose={onClose} />
          </div>
          <div style={{ padding:"20px 24px", background:c.panel }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.steel, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{work.category} · {work.year}</div>
            <div style={{ fontSize:20, fontWeight:800, color:c.ink }}>{work.title}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={ovStyle}>
      <div onClick={e=>e.stopPropagation()} style={{ display:"grid", gridTemplateColumns:"1.15fr 1fr", maxWidth:1100, width:"100%", maxHeight:"88vh", borderRadius:20, overflow:"hidden", boxShadow:"0 40px 100px rgba(0,0,0,0.6)" }}>
        <div style={{ position:"relative", background:"#111", minHeight:520 }}>
          <img src={hasBefore?(showBefore?work.before:work.image):work.image} alt={work.title} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain" }} />
          {hasBefore && <div style={{ position:"absolute", top:16, left:16, fontSize:11, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", padding:"6px 12px", borderRadius:4, background:showBefore?c.steel:c.blue, color:"#fff" }}>{showBefore?t.modal.before:t.modal.after}</div>}
          <EscBtn onClose={onClose} />
          {hasBefore && <button onClick={()=>setShowBefore(v=>!v)} style={{ position:"absolute", bottom:20, left:"50%", transform:"translateX(-50%)", fontWeight:700, fontSize:12, padding:"10px 22px", background:"rgba(255,255,255,0.1)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, cursor:"pointer", backdropFilter:"blur(8px)", whiteSpace:"nowrap" }}>{showBefore?t.modal.toAfter:t.modal.toBefore}</button>}
        </div>
        <div style={{ background:c.panel, padding:"40px 36px", overflowY:"auto", maxHeight:"88vh" }}>
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:10, fontWeight:800, color:c.blue, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:8 }}>{work.category} · {work.year}</div>
            <div style={{ fontSize:26, fontWeight:800, letterSpacing:"-0.01em", lineHeight:1.25, color:c.ink }}>{work.title}</div>
          </div>
          {work.clientNote && <Section title={t.modal.about}><p style={{ fontSize:13, color:c.ink, lineHeight:1.85, margin:0 }}>{work.clientNote}</p></Section>}
          {work.tools?.length > 0 && <Section title={t.modal.tools}><div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{work.tools.map(tool=><span key={tool} style={{ fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:6, background:c.bg, border:`1px solid ${c.line}`, color:c.ink }}>{tool}</span>)}</div></Section>}
          {work.process?.length > 0 && (
            <Section title={t.modal.process}>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {work.process.map((step,i)=>(
                  <div key={i} style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                    <span style={{ fontSize:11, fontWeight:800, color:c.blue, minWidth:22, paddingTop:2, flexShrink:0 }}>{String(i+1).padStart(2,"0")}</span>
                    <div style={{ fontSize:13, color:c.ink, lineHeight:1.65, paddingBottom:i<work.process.length-1?12:0, borderBottom:i<work.process.length-1?`1px solid ${c.line}`:"none", width:"100%" }}>{step}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Edit Work Modal ──────────────────────────────────────
function EditWorkModal({ work, onSave, onClose, t }) {
  const c = useColors(); const s = gS(c); const u = t.upload;
  const [form, setForm] = useState({ title:work.title, category:work.category, year:work.year, image:work.image, before:work.before||"", size:work.size, tools:work.tools?.join(", ")||"", clientNote:work.clientNote||"", process:work.process?.join("\n")||"" });
  useEffect(() => { const h=(e)=>{if(e.key==="Escape")onClose();}; window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h); }, [onClose]);
  const handleSave = () => { onSave({...work,...form,before:form.before||undefined,tools:form.tools?form.tools.split(",").map(x=>x.trim()).filter(Boolean):[],process:form.process?form.process.split("\n").map(x=>x.trim()).filter(Boolean):[]}); onClose(); };
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:c.overlay, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:c.panel, borderRadius:20, padding:40, maxWidth:720, width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 40px 100px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize:20, fontWeight:800, color:c.ink, marginBottom:28 }}>{t.edit.modalTitle}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
          <input value={form.title}    onChange={e=>setForm({...form,title:e.target.value})}    placeholder={u.title}  style={s.input} />
          <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder={u.cat}    style={s.input} />
          <input value={form.year}     onChange={e=>setForm({...form,year:e.target.value})}     placeholder={u.year}   style={s.input} />
          <select value={form.size} onChange={e=>setForm({...form,size:e.target.value})} style={s.input}><option value="large">{u.large}</option><option value="medium">{u.medium}</option><option value="small">{u.small}</option></select>
          <input value={form.image}  onChange={e=>setForm({...form,image:e.target.value})}  placeholder={u.img}    style={{...s.input,gridColumn:"span 2"}} />
          <input value={form.before} onChange={e=>setForm({...form,before:e.target.value})} placeholder={u.before} style={{...s.input,gridColumn:"span 2"}} />
          <input value={form.tools}  onChange={e=>setForm({...form,tools:e.target.value})}  placeholder={u.tools}  style={{...s.input,gridColumn:"span 4"}} />
          <textarea value={form.clientNote} onChange={e=>setForm({...form,clientNote:e.target.value})} placeholder={u.note}    style={{...s.input,gridColumn:"span 4",resize:"vertical",minHeight:72}} />
          <textarea value={form.process}    onChange={e=>setForm({...form,process:e.target.value})}    placeholder={u.process} style={{...s.input,gridColumn:"span 4",resize:"vertical",minHeight:72}} />
          <div style={{ display:"flex", gap:8, gridColumn:"span 4" }}>
            <button onClick={handleSave} style={{...s.submit,flex:1}}>{t.edit.save}</button>
            <button onClick={onClose}   style={{...s.submit,flex:1,background:"transparent",color:c.steel,border:`1px solid ${c.line}`}}>{t.edit.cancel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WorkCard (이미지 스켈레톤 포함) ─────────────────────
function WorkCard({ work, index, onOpen, editMode, onDelete, onEdit, dragListeners, dragAttributes }) {
  const c = useColors();
  const [hover, setHover] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);  // ← 스켈레톤용

  return (
    <div
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      onClick={()=>!editMode && onOpen(work)}
      style={{ position:"relative", width:"100%", height:"100%", borderRadius:12, overflow:"hidden", background:c.ink, minHeight:160, cursor:editMode?"default":"pointer" }}
    >
      {/* ── 이미지 로딩 스켈레톤 ── */}
      {!imgLoaded && (
        <div style={{
          position:"absolute", inset:0, borderRadius:12,
          background:`linear-gradient(90deg, ${c.skelA} 25%, ${c.skelB} 50%, ${c.skelA} 75%)`,
          backgroundSize:"400px 100%",
          animation:"shimmer 1.4s infinite linear",
        }} />
      )}

      <img
        src={work.image}
        alt={work.title}
        onLoad={()=>setImgLoaded(true)}
        style={{
          width:"100%", height:"100%", objectFit:"cover",
          position:"absolute", inset:0,
          opacity: imgLoaded ? 1 : 0,
          transform: hover&&!editMode?"scale(1.04)":"scale(1)",
          transition:"opacity 0.3s ease, transform 0.5s ease",
        }}
      />

      {imgLoaded && (
        <div style={{ position:"absolute", inset:0, background:c.cardGrad, opacity:hover?1:0.7, transition:"opacity 0.3s ease" }} />
      )}

      <div style={{ position:"absolute", top:16, left:16, fontSize:12, fontWeight:700, color:"#fff", letterSpacing:"0.1em" }}>{String(index+1).padStart(2,"0")}</div>

      {work.before && !editMode && (
        <div style={{ position:"absolute", top:16, right:16, fontSize:10, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", padding:"5px 10px", borderRadius:4, background:"rgba(255,255,255,0.15)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)" }}>Before / After</div>
      )}

      {editMode && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:12 }}>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:6 }}>
            <div {...dragListeners} {...dragAttributes} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding:"5px 10px", color:"#fff", fontSize:14, cursor:"grab", userSelect:"none" }}>⠿</div>
            <button onClick={e=>{e.stopPropagation();onEdit(work);}}   style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding:"5px 10px", color:"#fff", fontSize:12, cursor:"pointer" }}>✏</button>
            <button onClick={e=>{e.stopPropagation();onDelete(work.id);}} style={{ background:"rgba(201,104,90,0.85)", border:"none", borderRadius:6, padding:"5px 10px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>×</button>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff", textShadow:"0 1px 4px rgba(0,0,0,0.5)" }}>{work.title}</div>
        </div>
      )}

      {!editMode && imgLoaded && (
        <div style={{ position:"absolute", bottom:18, left:18, right:18, color:"#fff", transform:hover?"translateY(0)":"translateY(4px)", transition:"transform 0.3s ease" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#A8B9C6", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:4 }}>{work.category} · {work.year}</div>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.01em" }}>{work.title}</div>
        </div>
      )}
    </div>
  );
}

// ─── Sortable wrapper ─────────────────────────────────────
function SortableWorkCard({ work, index, onOpen, editMode, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id:work.id });
  return (
    <div ref={setNodeRef} style={{ ...SPAN[work.size], transform:CSS.Transform.toString(transform), transition, opacity:isDragging?0.45:1, zIndex:isDragging?10:"auto" }}>
      <WorkCard work={work} index={index} onOpen={onOpen} editMode={editMode} onDelete={onDelete} onEdit={onEdit} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

// ─── Upload Form ──────────────────────────────────────────
function UploadForm({ onAdd, t }) {
  const c = useColors(); const s = gS(c); const u = t.upload; const tw = t.works;
  const [form, setForm] = useState({ title:"", category:"", year:"2026", image:"", before:"", size:"medium", tools:"", clientNote:"", process:"" });
  const [open, setOpen] = useState(false);
  const handleSubmit = (e) => { e.preventDefault(); if(!form.title||!form.image)return; onAdd({...form,id:Date.now(),before:form.before||undefined,tools:form.tools?form.tools.split(",").map(x=>x.trim()).filter(Boolean):[],process:form.process?form.process.split("\n").map(x=>x.trim()).filter(Boolean):[]}); setForm({title:"",category:"",year:"2026",image:"",before:"",size:"medium",tools:"",clientNote:"",process:""}); setOpen(false); };
  return (
    <div style={{ gridColumn:"1 / -1" }}>
      {!open ? (
        <button onClick={()=>setOpen(true)} style={{ width:"100%", padding:"18px", border:`1px dashed ${c.line}`, borderRadius:12, background:"transparent", color:c.steel, fontWeight:700, fontSize:13, cursor:"pointer" }}>{tw.add}</button>
      ) : (
        <form onSubmit={handleSubmit} style={{ border:`1px solid ${c.line}`, borderRadius:12, padding:24, background:c.panel, display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
          <input placeholder={u.title} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={s.input} required />
          <input placeholder={u.cat} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={s.input} />
          <input placeholder={u.year} value={form.year} onChange={e=>setForm({...form,year:e.target.value})} style={s.input} />
          <select value={form.size} onChange={e=>setForm({...form,size:e.target.value})} style={s.input}><option value="large">{u.large}</option><option value="medium">{u.medium}</option><option value="small">{u.small}</option></select>
          <input placeholder={u.img} value={form.image} onChange={e=>setForm({...form,image:e.target.value})} style={{...s.input,gridColumn:"span 2"}} required />
          <input placeholder={u.before} value={form.before} onChange={e=>setForm({...form,before:e.target.value})} style={{...s.input,gridColumn:"span 2"}} />
          <input placeholder={u.tools} value={form.tools} onChange={e=>setForm({...form,tools:e.target.value})} style={{...s.input,gridColumn:"span 4"}} />
          <textarea placeholder={u.note} value={form.clientNote} onChange={e=>setForm({...form,clientNote:e.target.value})} style={{...s.input,gridColumn:"span 4",resize:"vertical",minHeight:72}} />
          <textarea placeholder={u.process} value={form.process} onChange={e=>setForm({...form,process:e.target.value})} style={{...s.input,gridColumn:"span 4",resize:"vertical",minHeight:72}} />
          <div style={{ display:"flex", gap:8, gridColumn:"span 4" }}>
            <button type="submit" style={{...s.submit,flex:1}}>{tw.addS}</button>
            <button type="button" onClick={()=>setOpen(false)} style={{...s.submit,flex:1,background:"transparent",color:c.steel,border:`1px solid ${c.line}`}}>{tw.cancel}</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── SlotStatus ───────────────────────────────────────────
function SlotStatus({ t }) {
  const c = useColors(); const s = gS(c); const sl = t.slot;
  const remaining = slotInfo.total - slotInfo.filled;
  const statusColor = { open:c.green, closing:c.accent, closed:c.steel };
  const color = statusColor[slotInfo.status];
  return (
    <div style={{...s.panel,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:c.steel, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:12 }}>{sl.tag}</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:8 }}>
          <span style={{ fontSize:44, fontWeight:800, color:c.ink }}>{slotInfo.filled}</span>
          <span style={{ fontSize:20, fontWeight:700, color:c.steel }}>/ {slotInfo.total}</span>
        </div>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700, color }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block" }} />
          {{open:sl.open,closing:sl.closing,closed:sl.closed}[slotInfo.status]} · {remaining>0?sl.remaining(remaining):sl.waitlist}
        </div>
      </div>
      <div style={{ marginTop:16, fontSize:12, color:c.steel }}>{sl.next} {slotInfo.nextOpen}</div>
    </div>
  );
}

// ─── Reviews ──────────────────────────────────────────────
function Stars({ rating }) { const c=useColors(); return <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(i=><span key={i} style={{color:i<=rating?c.accent:c.line,fontSize:14}}>★</span>)}</div>; }

function ReviewCard({ review }) {
  const c=useColors(); const s=gS(c);
  return (
    <div style={s.panel}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div><div style={{ fontWeight:800, fontSize:14, color:c.ink, marginBottom:2 }}>{review.name}</div><div style={{ fontSize:11, color:c.steel, fontWeight:700 }}>{review.work} · {review.date}</div></div>
        <Stars rating={review.rating} />
      </div>
      <p style={{ fontSize:13, color:c.ink, lineHeight:1.7, margin:0 }}>{review.comment}</p>
    </div>
  );
}

// ─── About ────────────────────────────────────────────────
function About({ t }) {
  const c=useColors(); const s=gS(c); const a=t.about;
  return (
    <section style={{ maxWidth:1240, margin:"0 auto", padding:"0 40px 56px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr", gap:16 }}>
        <div style={{...s.panel,background:c.ink,color:"#fff"}}>
          <div style={{ fontSize:11, fontWeight:700, color:"#A8B9C6", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:12 }}>{a.tag}</div>
          <div style={{ fontSize:28, fontWeight:800, lineHeight:1.3, letterSpacing:"-0.01em", whiteSpace:"pre-line" }}>{a.title}</div>
        </div>
        <div style={s.panel}>
          <div style={{ fontSize:13, color:c.ink, lineHeight:1.9, marginBottom:16 }}>{a.desc}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[["tool","Procreate, Photoshop"],["period",a.periodVal],["career",a.careerVal]].map(([k,v])=>(
              <div key={k} style={{ padding:"12px 0", borderTop:`1px solid ${c.line}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:c.steel, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{a[k]}</div>
                <div style={{ fontSize:14, fontWeight:700, color:c.ink }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────
function FAQSection({ t }) {
  const c=useColors(); const [openIdx, setOpenIdx]=useState(null); const faq=t.faq;
  return (
    <section style={{ maxWidth:1240, margin:"0 auto", padding:"0 40px 80px" }}>
      <h2 style={{ fontSize:28, fontWeight:800, letterSpacing:"-0.01em", margin:"0 0 24px", color:c.ink }}>{faq.title}</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {faq.items.map((item,i)=>(
          <div key={i} style={{ border:`1px solid ${c.line}`, borderRadius:12, overflow:"hidden", background:c.panel }}>
            <button onClick={()=>setOpenIdx(openIdx===i?null:i)} style={{ width:"100%", padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"transparent", border:"none", cursor:"pointer", textAlign:"left" }}>
              <span style={{ fontSize:14, fontWeight:700, color:c.ink }}>{item.q}</span>
              <span style={{ fontSize:18, color:c.steel, transform:openIdx===i?"rotate(45deg)":"rotate(0deg)", transition:"transform 0.2s ease", flexShrink:0, marginLeft:16 }}>+</span>
            </button>
            {openIdx===i && <div style={{ padding:"0 24px 20px 24px", paddingTop:16, fontSize:13, color:c.steel, lineHeight:1.8, borderTop:`1px solid ${c.line}` }}>{item.a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── SNS + Toggles ───────────────────────────────────────
function SnsLinks() {
  const c=useColors();
  return <div style={{display:"flex",gap:20}}>{SNS.map(s=><a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{fontSize:13,fontWeight:600,color:c.steel,textDecoration:"none"}}>{s.label}</a>)}</div>;
}

function LangToggle({ lang, setLang }) {
  const c=useColors();
  return <div style={{display:"flex",gap:2,background:c.line,borderRadius:6,padding:2}}>{["ko","en"].map(l=><button key={l} onClick={()=>setLang(l)} style={{padding:"5px 12px",borderRadius:4,border:"none",cursor:"pointer",fontWeight:700,fontSize:11,letterSpacing:"0.08em",background:lang===l?c.ink:"transparent",color:lang===l?c.panel:c.steel,transition:"all 0.15s"}}>{l.toUpperCase()}</button>)}</div>;
}

function DarkToggle({ isDark, toggle }) {
  const c=useColors();
  return <button onClick={toggle} style={{background:c.panel,border:`1px solid ${c.line}`,borderRadius:6,padding:"6px 11px",cursor:"pointer",fontSize:14,lineHeight:1}}>{isDark?"☀️":"🌙"}</button>;
}

// ─── Main Home ────────────────────────────────────────────
export default function Home({ onNavigate }) {
  const [works,     setWorks]     = useState(initialWorks);
  const [lang,      setLang]      = useState("ko");
  const [filter,    setFilter]    = useState("전체");
  const [search,    setSearch]    = useState("");       // ← 텍스트 검색
  const [modalWork, setModalWork] = useState(null);
  const [editWork,  setEditWork]  = useState(null);
  const [editMode,  setEditMode]  = useState(false);
  const [isDark,    setIsDark]    = useState(()=>localStorage.getItem("studio-dark")==="1");

  const palette = isDark ? PALETTES.dark : PALETTES.light;
  const t = TEXTS[lang];

  const toggleDark = () => setIsDark(d=>{ localStorage.setItem("studio-dark",d?"0":"1"); return !d; });
  const switchLang = (l) => { setLang(l); setFilter("전체"); setSearch(""); };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint:{ distance:8 } }),
    useSensor(KeyboardSensor, { coordinateGetter:sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      setWorks(ws=>{ const oi=ws.findIndex(w=>w.id===active.id); const ni=ws.findIndex(w=>w.id===over.id); return arrayMove(ws,oi,ni); });
    }
  };

  const getDataCat = (cat) => lang==="en" ? (CAT_MAP_EN[cat]??cat) : cat;
  const dataCat = getDataCat(filter);

  // ── 텍스트 검색 + 카테고리 필터 복합 적용 ───────────────
  const filtered = works
    .filter(w => dataCat==="전체" || w.category===dataCat)
    .filter(w => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        w.title.toLowerCase().includes(q) ||
        (w.clientNote || "").toLowerCase().includes(q) ||
        (w.category || "").toLowerCase().includes(q)
      );
    });

  const addWork    = (w)       => setWorks(prev=>[w,...prev]);
  const deleteWork = (id)      => { if(window.confirm(t.edit.delConfirm)) setWorks(prev=>prev.filter(w=>w.id!==id)); };
  const saveWork   = (updated) => setWorks(prev=>prev.map(w=>w.id===updated.id?updated:w));

  return (
    <ThemeCtx.Provider value={palette}>
      <div style={{ fontFamily:"'Inter',sans-serif", background:palette.bg, minHeight:"100vh", color:palette.ink, transition:"background 0.25s,color 0.25s" }}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
          @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        `}</style>

        {modalWork && <WorkDetailModal work={modalWork} onClose={()=>setModalWork(null)} t={t} />}
        {editWork  && <EditWorkModal   work={editWork}  onSave={saveWork} onClose={()=>setEditWork(null)} t={t} />}

        {/* Nav */}
        <nav style={{ maxWidth:1240, margin:"0 auto", padding:"32px 40px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:800, fontSize:18, letterSpacing:"-0.01em" }}>STUDIO.</div>
          <div style={{ display:"flex", gap:20, alignItems:"center", fontSize:13, fontWeight:600 }}>
            <a href="#works"   style={{ color:palette.ink, textDecoration:"none" }}>Works</a>
            <a href="#reviews" style={{ color:palette.ink, textDecoration:"none" }}>Reviews</a>
            <SnsLinks />
            <button onClick={()=>onNavigate?.("form")}  style={{ background:"transparent",border:"none",cursor:"pointer",color:palette.steel,fontSize:13,fontWeight:600,fontFamily:"inherit" }}>{t.nav.commission}</button>
            <button onClick={()=>onNavigate?.("board")} style={{ background:"transparent",border:"none",cursor:"pointer",color:palette.steel,fontSize:13,fontWeight:600,fontFamily:"inherit" }}>{t.nav.pipeline}</button>
            <button onClick={()=>onNavigate?.("price")} style={{ background:"transparent",border:"none",cursor:"pointer",color:palette.steel,fontSize:13,fontWeight:600,fontFamily:"inherit" }}>{t.nav.pricing}</button>
            <LangToggle lang={lang} setLang={switchLang} />
            <DarkToggle isDark={isDark} toggle={toggleDark} />
          </div>
        </nav>

        {/* Hero */}
        <header style={{ maxWidth:1240, margin:"0 auto", padding:"64px 40px 56px" }}>
          <div style={{ background:palette.heroGrad, backgroundSize:"400% 400%", animation:"gradientShift 10s ease infinite", color:"#fff", borderRadius:16, padding:"64px 48px", display:"flex", flexDirection:"column", justifyContent:"space-between", minHeight:320 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#A8B9C6", letterSpacing:"0.25em", textTransform:"uppercase" }}>{t.hero.tag}</div>
            <div>
              <div style={{ fontSize:64, fontWeight:800, lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:16, whiteSpace:"pre-line" }}>{t.hero.title}</div>
              <div style={{ fontSize:15, color:"#C9D2D9", maxWidth:480, lineHeight:1.7, marginBottom:28 }}>{t.hero.sub}</div>
              <button onClick={()=>onNavigate?.("form")} style={{ fontWeight:700, fontSize:14, padding:"14px 28px", background:"transparent", color:"#fff", border:"1px solid rgba(255,255,255,0.4)", borderRadius:8, cursor:"pointer" }}>{t.hero.cta}</button>
            </div>
          </div>
        </header>

        <About t={t} />

        {/* Works */}
        <section id="works" style={{ maxWidth:1240, margin:"0 auto", padding:"0 40px 56px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h2 style={{ fontSize:28, fontWeight:800, letterSpacing:"-0.01em", margin:0, color:palette.ink }}>{t.works.title}</h2>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:13, color:palette.steel, fontWeight:600 }}>{filtered.length}{lang==="ko"?"건":" works"}</span>
              <button onClick={()=>setEditMode(m=>!m)} style={{ fontSize:12, fontWeight:700, padding:"7px 14px", borderRadius:6, border:`1px solid ${editMode?palette.accent:palette.line}`, background:editMode?palette.accent:"transparent", color:editMode?"#fff":palette.steel, cursor:"pointer" }}>
                {editMode ? t.nav.done : t.nav.manage}
              </button>
            </div>
          </div>

          {/* ── 텍스트 검색창 ── */}
          <div style={{ position:"relative", marginBottom:16 }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, color:palette.steel, pointerEvents:"none" }}>🔍</span>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder={t.works.searchPh}
              style={{ width:"100%", padding:"11px 14px 11px 40px", border:`1px solid ${palette.line}`, borderRadius:8, fontSize:13, outline:"none", background:palette.panel, color:palette.ink, fontFamily:"inherit", boxSizing:"border-box", transition:"border-color 0.15s" }}
            />
            {search && (
              <button onClick={()=>setSearch("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:palette.steel, fontSize:18, cursor:"pointer", lineHeight:1 }}>×</button>
            )}
          </div>

          {/* 카테고리 필터 */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:24 }}>
            {t.cats.map(c=>(
              <button key={c} onClick={()=>setFilter(lang==="en"?c:c)}
                style={{ padding:"8px 16px", borderRadius:999, border:`1px solid ${filter===c?palette.ink:palette.line}`, background:filter===c?palette.ink:"transparent", color:filter===c?palette.panel:palette.steel, fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s" }}>
                {c}
              </button>
            ))}
          </div>

          {/* 검색 결과 없음 */}
          {filtered.length === 0 && (
            <div style={{ textAlign:"center", padding:"64px 0", color:palette.steel }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
              <div style={{ fontWeight:700, fontSize:15, color:palette.ink }}>{t.works.noResult}</div>
              <button onClick={()=>{setSearch("");setFilter("전체");}} style={{ marginTop:16, fontSize:12, fontWeight:700, padding:"8px 18px", border:`1px solid ${palette.line}`, borderRadius:6, background:"transparent", color:palette.steel, cursor:"pointer" }}>
                필터 초기화
              </button>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={works.map(w=>w.id)} strategy={rectSortingStrategy}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gridAutoRows:180, gap:16 }}>
                {filtered.map((w,i)=>(
                  <SortableWorkCard key={w.id} work={w} index={i} onOpen={setModalWork} editMode={editMode} onDelete={deleteWork} onEdit={setEditWork} />
                ))}

              </div>
            </SortableContext>
          </DndContext>
          <div style={{ fontSize:12, color:palette.steel, marginTop:12 }}>{t.works.hint}</div>
        </section>

        {/* Reviews */}
        <section id="reviews" style={{ maxWidth:1240, margin:"0 auto", padding:"0 40px 56px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:20 }}>
            <h2 style={{ fontSize:28, fontWeight:800, letterSpacing:"-0.01em", margin:0, color:palette.ink }}>{t.reviews.title}</h2>
            <span style={{ fontSize:13, color:palette.steel, fontWeight:600 }}>{t.reviews.avg} {(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1)} / 5.0</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {reviews.map(r=><ReviewCard key={r.id} review={r} />)}
          </div>
        </section>

        {/* CTA bento */}
        <section style={{ maxWidth:1240, margin:"0 auto", padding:"0 40px 56px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr", gap:16 }}>
            <div style={{ background:palette.blue, borderRadius:12, padding:28, color:"#fff" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", opacity:0.8, marginBottom:8 }}>{t.cta.gs}</div>
              <div style={{ fontSize:26, fontWeight:800, marginBottom:16, letterSpacing:"-0.01em", whiteSpace:"pre-line" }}>{t.cta.ctaTitle}</div>
              <button onClick={()=>onNavigate?.("form")} style={{ fontWeight:700, fontSize:13, padding:"10px 18px", background:"#fff", color:palette.blue, border:"none", borderRadius:6, cursor:"pointer" }}>{t.cta.ctaBtn}</button>
            </div>
            <SlotStatus t={t} />
            <div style={{ background:palette.panel, border:`1px solid ${palette.line}`, borderRadius:12, padding:28 }}>
              <div style={{ fontSize:11, fontWeight:700, color:palette.steel, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:8 }}>{t.cta.pl}</div>
              <div style={{ fontSize:20, fontWeight:800, marginBottom:16, color:palette.ink }}>{t.cta.plTitle}</div>
              <button onClick={()=>onNavigate?.("board")} style={{ fontWeight:700, fontSize:13, padding:"10px 18px", background:palette.ink, color:palette.panel, border:"none", borderRadius:6, cursor:"pointer" }}>{t.cta.plBtn}</button>
            </div>
            <div style={{ background:palette.panel, border:`1px solid ${palette.line}`, borderRadius:12, padding:28 }}>
              <div style={{ fontSize:11, fontWeight:700, color:palette.steel, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:8 }}>{t.cta.pr}</div>
              <div style={{ fontSize:20, fontWeight:800, marginBottom:16, color:palette.ink }}>{t.cta.prTitle}</div>
              <button onClick={()=>onNavigate?.("price")} style={{ fontWeight:700, fontSize:13, padding:"10px 18px", background:palette.ink, color:palette.panel, border:"none", borderRadius:6, cursor:"pointer" }}>{t.cta.prBtn}</button>
            </div>
          </div>
        </section>

        <FAQSection t={t} />

        <footer style={{ maxWidth:1240, margin:"0 auto", padding:"0 40px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, color:palette.steel }}>
          <div>{t.footer}</div>
          <SnsLinks />
        </footer>
      </div>
    </ThemeCtx.Provider>
  );
}

// AI 코드 작성 도움: 클로드(Claude)
