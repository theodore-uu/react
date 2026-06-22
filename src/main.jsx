// AI 코드 작성 도움: 클로드(Claude)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // App 컴포넌트를 불러옵니다.

document.body.style.margin = "0";
document.body.style.padding = "0";

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
// index.html에 있는 id가 'root'인 div 태그를 찾아서 그 안에 리액트 앱을 그립니다.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)