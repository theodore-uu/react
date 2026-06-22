// AI 코드 작성 도움: 클로드(Claude)

import React, { useState } from "react";
import Home from "./Home";
import CommissionManager from "./CommissionManagerV2";

// ============================================================
// App — 홈(포트폴리오) ↔ 커미션 데스크 전환
// ============================================================

export default function App() {
  const [page, setPage] = useState("home"); // "home" | "form" | "board" | "price"

  if (page === "home") {
    return <Home onNavigate={setPage} />;
  }

  return <CommissionManager initialTab={page} onBack={() => setPage("home")} />;
}

// AI 코드 작성 도움: 클로드(Claude)