# My AI Card
GEMINI AI 기반 명함 디자인 생성 웹 프로젝트
URL: https://build-card.netlify.app/

## 프로젝트 개요
본 프로젝트는 사용자가 입력한 정보를 기반으로
AI를 활용해 명함 디자인 이미지를 생성하는 웹 애플리케이션이다.
프론트엔드와 백엔드를 분리하여 구현하였다.

## 기술 스택
- Frontend: React, Tailwind CSS
- Backend: Node.js, Express
- AI API: Gemini Image Generation 2.5
- Deployment: Netlify, Render

## 프로젝트 구조
- my-ai-card
- ├─ backend/
- │ └─ server.js
- ├─ public/
- │ └─ sample(1단계 샘플 이미지)   
- ├─ src/
- │ └─app.js
- ├─ package.json
- └─ README.md

## 주요 기능
- 단면/양면 구조
- 텍스트·업로드한 이미지 객체 관리
- 드래그 및 슬라이더 기반 위치 조정
- AI 기반 배경 이미지 생성
- 실시간 미리보기
- 이미지 업로드
- 결과물 다운로드

## 참고 안내
보안상 API 키는 미포함