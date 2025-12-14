import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;   
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

//  명함 배경 전용 공통 프롬프트 (카드/텍스트/프레임 금지)
const BASE_PROMPT = `
웹에서 사용할 인쇄용 명함의 추상 배경 이미지를 생성한다.

요구사항:
- 화면 전체를 하나의 배경 텍스처로 채울 것
- 카드, 명함, 사각형, 모서리, 테두리, 프레임, 그림자, 여백, 경계선 등을 그리지 말 것
- 상부와 하부가 톤 차이 나며 나뉘는 경계도 넣지 말 것
- 텍스트, 숫자, 로고, 아이콘, 심볼, 사람, 캐릭터, 사물을 넣지 말 것
- 단색 또는 단순한 색 조합과 미세한 질감/그라데이션만 표현할 것
- 사진처럼 입체적인 물체가 아니라, 추상적인 배경 패턴과 질감만 표현할 것
- 7:4 비율의 가로형 배경으로 만들 것
`;

// API 호출 시 지수 백오프(Exponential Backoff)를 사용하여 재시도하는 함수
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }

      // 403 Forbidden 오류는 즉시 중단
      if (response.status === 403) {
        throw new Error("API returned status 403: Check your API Key and plan.");
      }

      // 기타 오류일 경우 재시도
      throw new Error(`API returned status ${response.status}`);
    } catch (error) {
      // 마지막 시도에서는 오류를 다시 던짐
      if (i === retries - 1 || error.message.includes("403")) {
        throw error;
      }

      // 지수적 딜레이: 1초, 2초, 4초...
      const delay = Math.pow(2, i) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

app.post("/api/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "프롬프트가 필요합니다." });
  }

  if (!GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY가 서버 환경 변수에 설정되지 않았습니다." });
  }

  // 사용자 프롬프트와 공통 규칙을 합쳐서 최종 프롬프트 생성
  const userPrompt = prompt.trim();
  const finalPrompt = `${BASE_PROMPT}\n\n사용자 추가 설명: ${userPrompt}`;

  // API 요청 페이로드 구성
  const payload = {
    contents: [{ parts: [{ text: finalPrompt }] }],
    generationConfig: {
      // 이미지만 필요하므로 IMAGE만 명시 (텍스트 응답 불필요)
      responseModalities: ["IMAGE"],
    },
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // 응답에서 base64 인코딩된 이미지 데이터를 찾기
    const imageBase64 =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
        ?.inlineData?.data || null;

    if (imageBase64) {
      // 클라이언트에게 이미지 데이터만 전송
      res.json({ imageUrl: imageBase64 });
    } else {
      // 이미지 생성 실패 또는 필터링 오류 처리
      const errorMessage =
        data.error?.message ||
        "이미지 생성 실패: 콘텐츠 필터링에 걸렸을 수 있습니다.";
      console.error("이미지 생성 실패:", data);
      return res.status(500).json({ error: errorMessage });
    }
  } catch (err) {
    // fetchWithRetry에서 발생한 오류(403)
    console.error("서버 오류:", err.message);
    res.status(500).json({ error: `API 요청 오류: ${err.message}` });
  }
});

app.listen(PORT, () =>
  console.log(`백엔드 실행 완료 http://localhost:${PORT}`)
);
