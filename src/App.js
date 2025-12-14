import React, { useState, useCallback, useRef, useEffect } from "react";

// 폰트 옵션
const FONT_OPTIONS = {
  pretendard: {
    label: "Pretendard",
    css: "'Pretendard', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    canvas:
      "Pretendard, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  notoSans: {
    label: "Noto Sans KR",
    css: "'Noto Sans KR', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    canvas:
      "'Noto Sans KR', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  nanumGothic: {
    label: "Nanum Gothic",
    css: "'Nanum Gothic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    canvas:
      "'Nanum Gothic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  notoSerif: {
    label: "Noto Serif KR",
    css: "'Noto Serif KR', 'serif'",
    canvas: "Noto Serif KR, serif",
  },
  nanumMyeongjo: {
    label: "Nanum Myeongjo",
    css: "'Nanum Myeongjo', 'serif'",
    canvas: "Nanum Myeongjo, serif",
  },
  roboto: {
    label: "Roboto (영문)",
    css: "Roboto, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    canvas:
      "Roboto, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};

// 인트로 페이지에서 보여줄 실제 샘플 카드
const SAMPLE_CARDS = [
  {
    id: 0,
    prompt: '"가을과 어울리는 명함 배경"',
    image: "/samples/card1.png",
  },
  {
    id: 1,
    prompt: '"어두운 배경, 모던한 느낌의 명함 배경"',
    image: "/samples/card2.png",
  },
  {
    id: 2,
    prompt: '"노란색과 흰색이 어우러진 밝고 화사한 명함 배경"',
    image: "/samples/card3.png",
  },
];

// 기본값
const DEFAULT_FONT_KEY = "pretendard";
const DEFAULT_TEXT_COLOR = "#ffffff";

// 텍스트 기본 폰트 크기(px, 프리뷰에서 fallback용 – 실제는 카드 높이 기준으로 다시 계산)
const BASE_FONT_SIZE = 18;

// 캔버스 기준 텍스트 크기 비율 (HEIGHT에 대한 비율, 모든 텍스트 동일)
const BASE_FONT_RATIO = 0.06;

// 캔버스 크기 (다운로드용)
const CARD_WIDTH = 1050;
const CARD_HEIGHT = 600;

// 업로드 이미지(아이콘/로고 등) 기본 높이 비율 (명함 높이 대비)
const IMAGE_BASE_RATIO = 0.18;

// 프리뷰 내에서 텍스트/이미지 크기를 계산할 때 사용할 “고정 기준 높이”
const PREVIEW_HEIGHT_BASE = 300;

// 텍스트 색상 프리셋
const TEXT_COLOR_PRESETS = [
  { value: "#ffffff", label: "화이트" },
  { value: "#111827", label: "딥 그레이" },
  { value: "#000000", label: "블랙" },
  { value: "#4F46E5", label: "인디고" },
  { value: "#0EA5E9", label: "시안" },
  { value: "#F97316", label: "오렌지" },
  { value: "#22C55E", label: "그린" },
  { value: "#E5E7EB", label: "라이트 그레이" },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// 새 필드가 추가될 때 기본 위치를 결정하는 헬퍼
const getDefaultPosition = (index) => {
  const presets = [
    { x: 50, y: 40 },
    { x: 50, y: 50 },
    { x: 15, y: 20 },
    { x: 15, y: 80 },
    { x: 15, y: 88 },
    { x: 15, y: 94 },
  ];
  return presets[index] || { x: 50, y: 50 };
};

const App = () => {
  // 단계 (1: 소개, 2: 텍스트 입력, 3: 디자인 편집, 4: 검토 & 다운로드)
  const [step, setStep] = useState(1);

  // 단면 / 양면
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [activeSide, setActiveSide] = useState("front"); // 'front' | 'back'

  // 배경 이미지 (앞면 / 뒷면)
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);

  // 이미지 생성 상태
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 앞면 / 뒷면 텍스트 필드들 (동적 배열)
  // { id, value, x, y }
  const [frontFields, setFrontFields] = useState([]);
  const [backFields, setBackFields] = useState([]);

  // 앞면 / 뒷면 이미지들 (로고, QR 등)
  // { id, src, x, y, scale }
  const [frontImages, setFrontImages] = useState([]);
  const [backImages, setBackImages] = useState([]);

  // 텍스트별 스타일 (폰트/색상/크기/굵기) - key: field.id
  const [textStyles, setTextStyles] = useState({});

  // 선택된 텍스트 필드 / 드래그 중인 텍스트 필드
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [activeFieldId, setActiveFieldId] = useState(null);

  // 선택된 이미지 / 드래그 중인 이미지
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [activeImageId, setActiveImageId] = useState(null);

  // 드래그 감도
  const [dragSensitivity, setDragSensitivity] = useState(1);

  // 전체 적용 토글 (현재 면 기준)
  const [applyToAll, setApplyToAll] = useState(false);

  // 2단계에서 사용할 임시 입력 (텍스트 한 줄)
  const [tempValue, setTempValue] = useState("");

  // 유니크 id 생성을 위한 ref
  const idRef = useRef(0);
  const imageIdRef = useRef(0);

  // 캔버스 다운로드용
  const canvasRef = useRef(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // 드래그 관련
  const previewRef = useRef(null);
  const lastMousePosRef = useRef(null);

  // 인트로 샘플 슬라이더
  const [activeSample, setActiveSample] = useState(0);

  // steps 정보
  const steps = [
    { id: 1, title: "소개" },
    { id: 2, title: "텍스트 입력" },
    { id: 3, title: "디자인 편집" },
    { id: 4, title: "검토 & 다운로드" },
  ];

  // 현재 활성 면의 필드들 / 이미지들
  const fields = activeSide === "front" ? frontFields : backFields;
  const images = activeSide === "front" ? frontImages : backImages;

  // 현재 선택된 필드 / 스타일
  const currentField = fields.find((f) => f.id === selectedFieldId) || null;

  const getTextStyle = (fieldId) => {
    const base = {
      size: 1,
      color: DEFAULT_TEXT_COLOR,
      fontKey: DEFAULT_FONT_KEY,
      bold: false,
    };
    if (!fieldId) return base;
    return { ...base, ...(textStyles[fieldId] || {}) };
  };

  const currentStyle = currentField
    ? getTextStyle(currentField.id)
    : getTextStyle(null);
  const currentSizeScale = currentStyle.size ?? 1;

  // 현재 선택된 이미지
  const currentImage =
    images.find((img) => img.id === selectedImageId) || null;

  // 활성 면의 필드를 업데이트하는 헬퍼
  const updateActiveFields = (updater) => {
    if (activeSide === "front") {
      setFrontFields((prev) => updater(prev));
    } else {
      setBackFields((prev) => updater(prev));
    }
  };

  // 활성 면의 이미지를 업데이트하는 헬퍼
  const updateActiveImages = (updater) => {
    if (activeSide === "front") {
      setFrontImages((prev) => updater(prev));
    } else {
      setBackImages((prev) => updater(prev));
    }
  };

  // 인트로 샘플 슬라이더 자동 재생
  useEffect(() => {
    if (step !== 1 || SAMPLE_CARDS.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSample((prev) => (prev + 1) % SAMPLE_CARDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [step]);

  // 백엔드에 이미지 생성 요청
  // - 앞면에서 생성할 때: frontImage 설정 + (양면이고 backImage 비어 있으면) backImage도 동일하게 설정
  // - 뒷면에서 생성할 때: backImage만 설정
  const generateImage = useCallback(
    async () => {
      if (!prompt.trim()) {
        setError("이미지 프롬프트를 입력해 주세요.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch("https://my-ai-card-backend.onrender.com/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim() }),
        });

        const data = await res.json();

        if (res.ok && data.imageUrl) {
          const fullImage = `data:image/png;base64,${data.imageUrl}`;

          if (activeSide === "front") {
            // 앞면 생성 → 항상 앞면 + 뒷면 동기화
            setFrontImage(fullImage);

            if (isDoubleSided) {
              // 여기서 무조건 앞면과 동일하게 만들어준다.
              setBackImage(fullImage);
            }
          } else {
            // 뒷면에서 생성 → 뒷면만 교체, 앞면은 유지
            setBackImage(fullImage);
          }
        } else {
          const backendErrorMessage =
            data.error ||
            "이미지 생성 실패: 서버 응답 오류 또는 콘텐츠 필터링에 걸렸을 수 있습니다.";
          setError(backendErrorMessage);
          console.error("Backend Response Error:", data);
        }
      } catch (err) {
        console.error("Error:", err);
        setError(
          "서버에 연결할 수 없습니다. 백엔드 서버(http://localhost:5000)가 실행 중인지 확인하세요."
        );
      } finally {
        setLoading(false);
      }
    },
    [prompt, activeSide, isDoubleSided]
  );


  // 새 텍스트 줄 추가 (+) - 현재 활성 면에 추가
  const addField = () => {
    if (!tempValue.trim()) return;

    const id = `field-${idRef.current++}`;
    const { x, y } = getDefaultPosition(fields.length);

    const newField = {
      id,
      value: tempValue.trim(),
      x,
      y,
    };

    if (activeSide === "front") {
      setFrontFields((prev) => [...prev, newField]);
    } else {
      setBackFields((prev) => [...prev, newField]);
    }

    setTextStyles((prev) => ({
      ...prev,
      [id]: {
        size: 1,
        color: DEFAULT_TEXT_COLOR,
        fontKey: DEFAULT_FONT_KEY,
        bold: false,
      },
    }));

    setSelectedFieldId(id);
    setTempValue("");
  };

  // 필드 삭제 - 현재 활성 면에서 삭제
  const removeField = (id) => {
    const remaining = fields.filter((f) => f.id !== id);

    if (activeSide === "front") {
      setFrontFields((prev) => prev.filter((f) => f.id !== id));
    } else {
      setBackFields((prev) => prev.filter((f) => f.id !== id));
    }

    setTextStyles((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    if (selectedFieldId === id) {
      setSelectedFieldId(remaining.length ? remaining[0].id : null);
    }
  };

  // 이미지 업로드 (현재 활성 면 기준)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const id = `img-${imageIdRef.current++}`;
      const newImage = {
        id,
        src: reader.result,
        x: 50,
        y: 50,
        scale: 1, // 카드 높이 비율에 곱해질 배율 (1.0 = 기본)
      };
      updateActiveImages((prev) => [...prev, newImage]);
      setSelectedImageId(id);
    };
    reader.readAsDataURL(file);

    // 같은 파일 다시 선택 가능하도록 초기화
    e.target.value = "";
  };

  // 이미지 삭제
  const removeImage = (id) => {
    updateActiveImages((prev) => prev.filter((img) => img.id !== id));
    if (selectedImageId === id) {
      const remaining = images.filter((img) => img.id !== id);
      setSelectedImageId(remaining.length ? remaining[0].id : null);
    }
  };

  // 단계 이동
  const goNext = () => {
    if (step === 2) {
      const hasAnyValue =
        frontFields.some((f) => f.value && f.value.trim()) ||
        backFields.some((f) => f.value && f.value.trim());
      if (!hasAnyValue) {
        const ok = window.confirm(
          "아직 추가된 텍스트가 없습니다. 그래도 다음 단계로 이동할까요?"
        );
        if (!ok) return;
      }
    }
    if (step === 3) {
      // 최소한 앞면 배경은 있어야 다음으로 넘어가도록
      if (!frontImage) {
        const ok = window.confirm(
          "아직 생성된 배경 이미지가 없습니다. 그대로 다음 단계로 이동할까요?"
        );
        if (!ok) return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const goPrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const resetAll = () => {
    setStep(1);
    setPrompt("");
    setFrontImage(null);
    setBackImage(null);
    setError("");
    setFrontFields([]);
    setBackFields([]);
    setFrontImages([]);
    setBackImages([]);
    setTextStyles({});
    setSelectedFieldId(null);
    setActiveFieldId(null);
    setSelectedImageId(null);
    setActiveImageId(null);
    setDragSensitivity(1);
    setActiveSample(0);
    setApplyToAll(false);
    setTempValue("");
    setIsDoubleSided(false);
    setActiveSide("front");
  };

  // 드래그 시작 - 텍스트
  const handleMouseDown = (fieldId) => (e) => {
    e.preventDefault();
    setActiveFieldId(fieldId);
    setActiveImageId(null);
    setSelectedFieldId(fieldId);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  // 드래그 시작 - 이미지
  const handleImageMouseDown = (imageId) => (e) => {
    e.preventDefault();
    setActiveImageId(imageId);
    setActiveFieldId(null);
    setSelectedImageId(imageId);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  // 드래그 이동 (텍스트 or 이미지)
  const handleMouseMove = (e) => {
    if ((!activeFieldId && !activeImageId) || !lastMousePosRef.current) return;

    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    const deltaXPercent =
      ((e.clientX - lastMousePosRef.current.x) / rect.width) *
      100 *
      dragSensitivity;
    const deltaYPercent =
      ((e.clientY - lastMousePosRef.current.y) / rect.height) *
      100 *
      dragSensitivity;

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (activeFieldId) {
      updateActiveFields((prev) =>
        prev.map((f) => {
          if (f.id !== activeFieldId) return f;
          const newX = clamp(f.x + deltaXPercent, 0, 100);
          const newY = clamp(f.y + deltaYPercent, 0, 100);
          return {
            ...f,
            x: Math.round(newX * 10) / 10, // 소수점 1자리까지 라운딩
            y: Math.round(newY * 10) / 10,
          };
        })
      );
    } else if (activeImageId) {
      updateActiveImages((prev) =>
        prev.map((img) => {
          if (img.id !== activeImageId) return img;
          const newX = clamp(img.x + deltaXPercent, 0, 100);
          const newY = clamp(img.y + deltaYPercent, 0, 100);
          return {
            ...img,
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10,
          };
        })
      );
    }
  };

  // 드래그 종료
  const stopDragging = () => {
    setActiveFieldId(null);
    setActiveImageId(null);
    lastMousePosRef.current = null;
  };

  // 캔버스로 최종 PNG 다운로드 
  const downloadCardAsImage = (side) => {
    const bgImage = side === "front" ? frontImage : backImage;
    const currentFields = side === "front" ? frontFields : backFields;
    const currentImages = side === "front" ? frontImages : backImages;

    if (!bgImage) {
      alert(
        side === "front"
          ? "먼저 앞면 배경 이미지를 생성해 주세요."
          : "먼저 뒷면 배경 이미지를 생성해 주세요."
      );
      return;
    }

    if (!currentFields.length && !currentImages.length) {
      const ok = window.confirm(
        "텍스트와 이미지가 모두 비어 있습니다. 배경만 PNG로 저장할까요?"
      );
      if (!ok) return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setDownloadLoading(true);

    const ctx = canvas.getContext("2d");
    const WIDTH = CARD_WIDTH;
    const HEIGHT = CARD_HEIGHT;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const startDrawing = () => {
      const bg = new Image();
      bg.src = bgImage;

      bg.onload = () => {
        (async () => {
          ctx.clearRect(0, 0, WIDTH, HEIGHT);

          // object-fit: cover
          const imgRatio = bg.width / bg.height;
          const canvasRatio = WIDTH / HEIGHT;

          let sx, sy, sWidth, sHeight;

          if (imgRatio > canvasRatio) {
            sHeight = bg.height;
            sWidth = bg.height * canvasRatio;
            sx = (bg.width - sWidth) / 2;
            sy = 0;
          } else {
            sWidth = bg.width;
            sHeight = bg.width / canvasRatio;
            sx = 0;
            sy = (bg.height - sHeight) / 2;
          }

          // 배경 그리기
          ctx.drawImage(bg, sx, sy, sWidth, sHeight, 0, 0, WIDTH, HEIGHT);

          // 오버레이 이미지 로드 & 그리기 (프리뷰와 동일한 비율로)
          const overlayImageEntries = await Promise.all(
            currentImages.map(
              (imgItem) =>
                new Promise((resolve) => {
                  const im = new Image();
                  im.onload = () => resolve({ imgItem, im });
                  im.onerror = () => resolve(null);
                  im.src = imgItem.src;
                })
            )
          );

          overlayImageEntries.forEach((entry) => {
            if (!entry) return;
            const { imgItem, im } = entry;
            const cx = (imgItem.x / 100) * WIDTH;
            const cy = (imgItem.y / 100) * HEIGHT;
            const scale = imgItem.scale ?? 1;

            const targetHeight = HEIGHT * IMAGE_BASE_RATIO * scale;
            const aspect = im.width && im.height ? im.width / im.height : 1;
            const drawHeight = targetHeight;
            const drawWidth = targetHeight * aspect;

            ctx.drawImage(
              im,
              cx - drawWidth / 2,
              cy - drawHeight / 2,
              drawWidth,
              drawHeight
            );
          });

          // 텍스트 그리기
          const getCanvasFontFamily = (fieldId) => {
            const style = getTextStyle(fieldId);
            const fontKey =
              style.fontKey && FONT_OPTIONS[style.fontKey]
                ? style.fontKey
                : DEFAULT_FONT_KEY;
            return FONT_OPTIONS[fontKey].canvas;
          };

          const drawField = (field) => {
            if (!field.value) return;

            const x = (field.x / 100) * WIDTH;
            const y = (field.y / 100) * HEIGHT;

            const style = getTextStyle(field.id);
            const sizeScale = style.size ?? 1;
            const fontSize = Math.round(
              HEIGHT * BASE_FONT_RATIO * sizeScale
            );
            const weight = style.bold ? 700 : 400;

            ctx.font = `${weight} ${fontSize}px ${getCanvasFontFamily(
              field.id
            )}`;
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";

            const styleColor = style.color || DEFAULT_TEXT_COLOR;

            ctx.save();
            ctx.fillStyle = styleColor;
            ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
            ctx.shadowBlur = fontSize * 0.07;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillText(field.value, x, y);
            ctx.restore();
          };

          currentFields.forEach(drawField);

          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download =
            side === "front"
              ? "business-card-front.png"
              : "business-card-back.png";
          link.click();

          setDownloadLoading(false);
        })().catch((err) => {
          console.error("캔버스 렌더링 중 오류:", err);
          alert("이미지 생성 중 문제가 발생했습니다. 다시 시도해 주세요.");
          setDownloadLoading(false);
        });
      };

      bg.onerror = () => {
        alert("배경 이미지를 불러오지 못했습니다. 다시 시도해 주세요.");
        setDownloadLoading(false);
      };
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts
        .ready.then(startDrawing)
        .catch((err) => {
          console.error("폰트 로드 대기 중 오류:", err);
          startDrawing();
        });
    } else {
      startDrawing();
    }
  };

  // 공통 미리보기 컴포넌트
  //  - fields: 이 프리뷰에 표시할 텍스트 배열
  //  - images: 이 프리뷰에 표시할 이미지 배열
  //  - image: 배경 이미지 (앞/뒷면 구분해서 전달)
  //  - interactive: true면 드래그 가능(3단계), false면 단순 미리보기(4단계)
  const BusinessCardPreview = ({
    loading = false,
    fields,
    images = [],
    image,
    interactive = true,
  }) => {
    const localRef = useRef(null);

    // 텍스트 울렁거림 방지를 위해, 텍스트/이미지 크기 계산용 높이는 고정값 사용
    const effectiveHeight = PREVIEW_HEIGHT_BASE;

    return (
      <div
        ref={interactive ? previewRef : localRef}
        className="relative w-full max-w-xl mx-auto border border-slate-200 rounded-xl overflow-hidden shadow-[0_18px_45px_rgba(15,23,42,0.18)] bg-slate-900/5"
        style={{ aspectRatio: "7 / 4" }}
        onMouseMove={interactive ? handleMouseMove : undefined}
        onMouseUp={interactive ? stopDragging : undefined}
        onMouseLeave={interactive ? stopDragging : undefined}
      >
        {image ? (
          <img
            src={image}
            alt="Generated Card Background"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <p className="text-slate-400 text-sm text-center px-4">
              아직 생성된 배경 이미지가 없습니다.
              <br />
              아래에서 프롬프트를 입력하고 이미지를 생성해 주세요.
            </p>
          </div>
        )}

        {/* 업로드된 이미지들 (로고 등) – 카드 높이 기준 비율로 크기 계산 */}
        {images.map((img) => {
          const scale = img.scale ?? 1;
          const heightPx = Math.round(
            effectiveHeight * IMAGE_BASE_RATIO * scale
          );
          return (
            <img
              key={img.id}
              src={img.src}
              alt="overlay"
              className={
                "absolute pointer-events-auto " +
                (interactive ? "cursor-move" : "cursor-default")
              }
              style={{
                left: `${img.x}%`,
                top: `${img.y}%`,
                transform: "translate3d(-50%, -50%, 0)",
                height: `${heightPx}px`,
                width: "auto",
              }}
              onMouseDown={
                interactive ? handleImageMouseDown(img.id) : undefined
              }
            />
          );
        })}

        {/* 텍스트 필드들 렌더링 – 카드 높이 기준 비율로 폰트 크기 계산 */}
        {fields.map((field) => {
          if (!field.value) return null;

          const style = getTextStyle(field.id);
          const sizeScale = style.size ?? 1;
          const fontKey =
            style.fontKey && FONT_OPTIONS[style.fontKey]
              ? style.fontKey
              : DEFAULT_FONT_KEY;
          const fontFamily = FONT_OPTIONS[fontKey].css;
          const color = style.color || DEFAULT_TEXT_COLOR;
          const fontWeight = style.bold ? 700 : 400;

          const fontSizePx = Math.round(
            (effectiveHeight * BASE_FONT_RATIO * sizeScale) ||
            BASE_FONT_SIZE * sizeScale
          );

          return (
            <div
              key={field.id}
              className={
                "absolute " +
                (interactive ? "cursor-move" : "cursor-default")
              }
              style={{
                left: `${field.x}%`,
                top: `${field.y}%`,
                transform: "translate3d(-50%, -50%, 0)",
                fontFamily,
                color,
                fontSize: `${fontSizePx}px`,
                fontWeight,
              }}
              onMouseDown={
                interactive ? handleMouseDown(field.id) : undefined
              }
            >
              {field.value}
            </div>
          );
        })}

        {/* 로딩 오버레이 (이미지 생성 중일 때) */}
        {loading && (
          <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-tr from-indigo-500/40 via-sky-400/40 to-emerald-400/40 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-gradient-to-tr from-purple-500/40 via-indigo-400/40 to-pink-400/40 blur-3xl" />

            <div className="relative w-40 h-28 rounded-xl border border-slate-500/50 bg-slate-900/80 shadow-2xl overflow-hidden animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
              <div className="relative h-full w-full p-3 flex flex-col justify-between">
                <div className="h-2 w-10 rounded-full bg-slate-600/80" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-24 rounded-full bg-slate-500/80" />
                  <div className="h-2 w-16 rounded-full bg-slate-600/70" />
                  <div className="h-2 w-20 rounded-full bg-slate-700/70" />
                </div>
                <div className="h-2 w-14 rounded-full bg-slate-600/80 ml-auto" />
              </div>
            </div>

            <p className="mt-4 text-[11px] text-slate-200/85 text-center px-4">
              Gemini가 프롬프트를 바탕으로
              <br className="sm:hidden" /> 명함 배경을 그려내는 중입니다...
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <canvas ref={canvasRef} className="hidden" />

      {/* 헤더 */}
      <header className="border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/40">
              <span className="text-xs font-bold tracking-tight">AI</span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                Card Studio
              </p>
              <p className="text-[11px] text-slate-400">
                Gemini 기반 명함 디자인 생성기
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
            <span className="px-2 py-1 rounded-full border border-slate-700/70">
              ✔
            </span>
            <span className="hidden md:inline">
              Step {step} / 4 · {steps[step - 1].title}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* 스텝 인디케이터 */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s) => (
              <div key={s.id} className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold ${s.id === step
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/40"
                      : s.id < step
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                >
                  {s.id < step ? "✓" : s.id}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{s.title}</p>
              </div>
            ))}
          </div>
          <div className="w-full h-1 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* 메인 카드 */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-[0_30px_80px_rgba(15,23,42,0.7)] backdrop-blur-md p-5 md:p-7">
          {/* 1단계: 소개 */}
          {step === 1 && (
            <div className="mt-2 grid md:grid-cols-[1.2fr,1.1fr] gap-8 items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
                  몇 단계만에 완성하는{" "}
                  <span className="text-indigo-400 font-bold">
                    AI 명함 디자인
                  </span>
                </h1>
                <p className="text-sm md:text-[15px] text-slate-300 leading-relaxed mb-4">
                  Card Studio는{" "}
                  <span className="font-semibold text-slate-100">
                    Gemini 이미지 생성
                  </span>
                  을 기반으로,
                  <br className="hidden md:block" />
                  사용자가 정의한{" "}
                  <span className="font-semibold">텍스트 정보들</span>과
                  <br className="hidden md:block" />
                  <span className="font-semibold">이미지</span>를
                  배경 위에 자유롭게 배치해
                  <br className="hidden md:block" />
                  명함을 만들어주는 웹 도구입니다.
                </p>
                <ul className="text-xs md:text-sm text-slate-300 space-y-1.5 mb-6">
                  <li>· AI로 배경 자동 생성 (프롬프트 입력)</li>
                  <li>· 드래그 & 슬라이더로 텍스트 위치 정밀 조정</li>
                  <li>· 텍스트별 폰트 · 색상 · 크기 · 굵기 커스터마이징</li>
                  <li>· 이미지(회사 로고/QR 등)파일 업로드 및 배치</li>
                  <li>· 인쇄에 적합한 명함 비율 PNG로 다운로드 (단면/양면)</li>
                </ul>
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={goNext}
                    className="btn-gradient btn-gradient-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                    > 
                    시작하기
                    {/* <span className="text-xs">→</span> */}
                  </button>
                  <p className="text-xs text-slate-400">
                    약 3~5분이면 첫 명함 시안을 완성할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* 샘플 갤러리 */}
              <div className="hidden md:flex justify-end">
                <div className="relative w-full max-w-md">
                  <div className="absolute -top-6 -left-6 w-28 h-28 rounded-3xl bg-gradient-to-tr from-indigo-500/40 via-sky-500/40 to-emerald-400/40 blur-3xl" />
                  <div className="absolute -bottom-10 -right-8 w-32 h-32 rounded-full bg-gradient-to-tr from-purple-500/30 via-sky-500/30 to-amber-400/30 blur-3xl" />

                  <div className="relative bg-slate-900/80 border border-slate-700 rounded-2xl p-4 shadow-[0_20px_60px_rgba(15,23,42,0.9)] overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-slate-400">
                        샘플 갤러리
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300">
                        실제 생성 예시
                      </span>
                    </div>

                    <div className="relative mt-2 aspect-[7/4] w-full">
                      {SAMPLE_CARDS.map((card, idx) => {
                        const isActive = idx === activeSample;
                        return (
                          <div
                            key={card.id}
                            className={`absolute inset-0 rounded-xl shadow-xl border border-white/10 transition-all duration-700 ease-out origin-center ${isActive
                                ? "opacity-100 translate-x-0 scale-100 rotate-0 z-20"
                                : "opacity-0 translate-x-6 scale-95 rotate-1 z-10"
                              }`}
                          >
                            <div className="w-full h-full rounded-xl overflow-hidden relative">
                              <img
                                src={card.image}
                                alt={card.prompt}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/35" />
                              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-[10px] text-slate-100/85">
                                  <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur border border-white/15">
                                    Gemini · AI 배경
                                  </span>
                                  <span className="opacity-90"></span>
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                  <p className="text-[10px] text-slate-100/85 line-clamp-2">
                                    {card.prompt}
                                  </p>
                                </div>
                                <div className="text-[9px] text-slate-100/85 opacity-90">
                                  * 이 프롬프트 조합으로 생성된 실제 배경 예시입니다.
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {SAMPLE_CARDS.map((card, idx) => {
                          const isActive = idx === activeSample;
                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => setActiveSample(idx)}
                              className={`h-1.5 rounded-full transition-all duration-300 ${isActive
                                  ? "w-6 bg-indigo-400"
                                  : "w-2 bg-slate-600"
                                }`}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 text-right">
                        프롬프트 입력 시, 위 예시들을 참고해 스타일을 조합해보세요.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2단계: 텍스트 입력 */}
          {step === 2 && (
            <div className="mt-2">
              <h2 className="text-xl md:text-2xl font-semibold mb-2">
                2단계. 명함에 들어갈 텍스트 추가
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mb-5">
                이름, 직책, 회사명, 연락처 등{" "}
                <span className="font-semibold">명함에 들어갈 내용을 한 줄씩</span>{" "}
                입력한 뒤 <span className="font-semibold">추가</span>해보세요.
              </p>

              {/* 단면 / 양면 선택 카드 */}
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsDoubleSided(false);
                    setActiveSide("front");
                    setSelectedFieldId(null);
                    setSelectedImageId(null);
                  }}
                  className={`text-left border rounded-xl px-4 py-3 text-xs md:text-sm transition ${!isDoubleSided
                      ? "border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/20"
                      : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
                    }`}
                >
                  <p className="font-semibold mb-1">단면 명함</p>
                  <p className="text-[11px] text-slate-400">
                    한 면만 사용하는 기본 명함 레이아웃
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDoubleSided(true);
                    setActiveSide("front");
                    setSelectedFieldId(null);
                    setSelectedImageId(null);
                  }}
                  className={`text-left border rounded-xl px-4 py-3 text-xs md:text-sm transition ${isDoubleSided
                      ? "border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/20"
                      : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
                    }`}
                >
                  <p className="font-semibold mb-1">양면 명함</p>
                  <p className="text-[11px] text-slate-400">
                    앞·뒷면을 각각 디자인할 수 있는 레이아웃
                  </p>
                </button>
              </div>

              {/* 현재 편집 중인 면 & 탭 */}
              <p className="text-[11px] text-slate-400 mb-1">
                현재 편집 중인 면:{" "}
                <span className="font-semibold text-slate-100">
                  {activeSide === "front" ? "앞면" : "뒷면"}
                  {!isDoubleSided && " (단면)"}
                </span>
              </p>

              {isDoubleSided && (
                <div className="inline-flex mb-3 rounded-full border border-slate-700 bg-slate-900/60 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSide("front");
                      setTempValue("");
                      setSelectedFieldId(null);
                      setSelectedImageId(null);
                    }}
                    className={`px-3 py-1 rounded-full ${activeSide === "front"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-300"
                      }`}
                  >
                    앞면 텍스트
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSide("back");
                      setTempValue("");
                      setSelectedFieldId(null);
                      setSelectedImageId(null);
                    }}
                    className={`px-3 py-1 rounded-full ${activeSide === "back"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-300"
                      }`}
                  >
                    뒷면 텍스트
                  </button>
                </div>
              )}

              {/* 입력 폼 */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4 max-w-xl">
                <input
                  type="text"
                  placeholder="입력"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="flex-1 border border-slate-700 bg-slate-900/70 rounded-lg px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addField();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addField}
                  className="px-4 py-2 text-xs md:text-sm rounded-lg border border-slate-600 text-slate-100 bg-transparent hover:bg-slate-800/80 transition flex items-center gap-1"
                >
                  <span className="text-base leading-none">+</span>
                </button>
              </div>

              {/* 현재까지 추가된 텍스트 리스트 (현재 면 기준) */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-900/70 text-xs md:text-sm text-slate-200 space-y-1.5">
                {fields.length === 0 ? (
                  <p className="text-slate-500">
                    아직 추가된 텍스트가 없습니다. 위 입력칸에 내용을 입력한 뒤
                    ‘+’를 눌러보세요.
                  </p>
                ) : (
                  fields.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-2 py-1 border-b border-slate-800/60 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-100 truncate">
                          {f.value}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeField(f.id)}
                        className="px-2 py-1 text-[11px] rounded-lg border border-rose-500/60 text-rose-300 hover:bg-rose-500/10"
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={goPrev}
                  className="px-4 py-2 text-xs md:text-sm border border-slate-600 rounded-xl text-slate-200 hover:bg-slate-800/80 transition"
                >
                  이전 단계
                </button>
                <button
                  onClick={goNext}
                  className="btn-gradient btn-gradient-primary px-5 py-2.5 text-xs md:text-sm"
                >
                  다음 단계 (디자인 편집)
                </button>
              </div>
            </div>
          )}

          {/* 3단계: 디자인 편집 */}
          {step === 3 && (
            <div className="mt-2 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold">
                    3단계. 배경 생성 & 텍스트 / 이미지 배치
                  </h2>
                  <p className="text-xs md:text-sm text-slate-300">
                    프롬프트로 명함 배경을 생성하고, 텍스트와 로고/QR 이미지를
                    드래그·슬라이더로 정밀하게 배치하세요.
                  </p>
                </div>
              </div>

              {/* 앞면 / 뒷면 탭 (여기서도 전환 가능) */}
              {isDoubleSided && (
                <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/60 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSide("front");
                      setSelectedFieldId(null);
                      setSelectedImageId(null);
                    }}
                    className={`px-3 py-1 rounded-full ${activeSide === "front"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-300"
                      }`}
                  >
                    앞면 편집
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSide("back");
                      setSelectedFieldId(null);
                      setSelectedImageId(null);
                    }}
                    className={`px-3 py-1 rounded-full ${activeSide === "back"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-300"
                      }`}
                  >
                    뒷면 편집
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                현재 편집 중인 면:{" "}
                <span className="font-semibold text-slate-100">
                  {activeSide === "front" ? "앞면" : "뒷면"}
                </span>
              </p>

              {/* 프리뷰 (현재 활성 면만, 드래그 가능) */}
              <BusinessCardPreview
                loading={loading}
                fields={fields}
                images={images}
                image={activeSide === "front" ? frontImage : backImage}
                interactive={true}
              />

              {error && (
                <div className="mt-1 p-3 bg-rose-900/40 border border-rose-700/60 text-rose-100 rounded-lg text-xs">
                  <p className="font-semibold text-[11px]">⚠ 오류 발생</p>
                  <p className="mt-1">{error}</p>
                </div>
              )}

              <div className="grid md:grid-cols-[1.4fr,1fr] gap-6 mt-2">
                {/* 프롬프트 & 스타일 */}
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="prompt-input"
                      className="block text-xs font-semibold mb-1 text-slate-200"
                    >
                      배경 이미지 프롬프트
                    </label>
                    <textarea
                      id="prompt-input"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="w-full p-3 border border-slate-700 bg-slate-900/70 rounded-lg text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 resize-none"
                      placeholder="예) 흰색과 검정색의 조합, 깔끔한 명함 배경"
                      disabled={loading}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      * 명함 디자인에 대한 설명을 구체적으로 프롬프트에 포함하면
                      보다 안정적인 배경이 나올 수 있습니다.
                    </p>
                    {isDoubleSided && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        * 앞면에서 생성하면 기본적으로 앞·뒷면에 같은 배경이
                        적용되고, 뒷면에서 다시 생성하면 뒷면만 별도로 변경됩니다.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={generateImage}
                    disabled={loading}
                    className="btn-gradient btn-gradient-primary text-xs md:text-sm justify-center px-5 py-2.5"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        배경 이미지 생성 중...
                      </>
                    ) : activeSide === "front" ? (
                      "배경 이미지 생성 ✦"
                    ) : (
                      "뒷면 배경 이미지 생성 ✦"
                    )}
                  </button>

                  {/* 선택 항목 스타일 + 전체 적용 토글 */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* 폰트 선택 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-200">
                          폰트 선택
                        </label>
                      </div>
                      <select
                        value={currentStyle.fontKey || DEFAULT_FONT_KEY}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!fields.length) return;

                          if (applyToAll) {
                            setTextStyles((prev) => {
                              const next = { ...prev };
                              fields.forEach((f) => {
                                next[f.id] = {
                                  ...getTextStyle(f.id),
                                  fontKey: value,
                                };
                              });
                              return next;
                            });
                          } else if (currentField) {
                            setTextStyles((prev) => ({
                              ...prev,
                              [currentField.id]: {
                                ...getTextStyle(currentField.id),
                                fontKey: value,
                              },
                            }));
                          }
                        }}
                        className="w-full border border-slate-700 bg-slate-900/70 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-50 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500"
                      >
                        {Object.entries(FONT_OPTIONS).map(([key, opt]) => (
                          <option key={key} value={key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 색상 선택 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-200">
                          텍스트 색상
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={currentStyle.color || DEFAULT_TEXT_COLOR}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!fields.length) return;

                            if (applyToAll) {
                              setTextStyles((prev) => {
                                const next = { ...prev };
                                fields.forEach((f) => {
                                  next[f.id] = {
                                    ...getTextStyle(f.id),
                                    color: value,
                                  };
                                });
                                return next;
                              });
                            } else if (currentField) {
                              setTextStyles((prev) => ({
                                ...prev,
                                [currentField.id]: {
                                  ...getTextStyle(currentField.id),
                                  color: value,
                                },
                              }));
                            }
                          }}
                          className="w-10 h-10 p-0 border border-slate-600 rounded-lg bg-slate-900"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {TEXT_COLOR_PRESETS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => {
                                if (!fields.length) return;
                                if (applyToAll) {
                                  setTextStyles((prev) => {
                                    const next = { ...prev };
                                    fields.forEach((f) => {
                                      next[f.id] = {
                                        ...getTextStyle(f.id),
                                        color: c.value,
                                      };
                                    });
                                    return next;
                                  });
                                } else if (currentField) {
                                  setTextStyles((prev) => ({
                                    ...prev,
                                    [currentField.id]: {
                                      ...getTextStyle(currentField.id),
                                      color: c.value,
                                    },
                                  }));
                                }
                              }}
                              className="w-6 h-6 rounded-full border border-slate-700 hover:ring-2 hover:ring-indigo-400/70 transition"
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 크기 조절 */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold mb-1 text-slate-200">
                        텍스트 크기
                      </label>
                      <div>
                        <input
                          type="range"
                          min="0.6"
                          max="1.6"
                          step="0.05"
                          value={currentSizeScale}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!fields.length) return;

                            if (applyToAll) {
                              setTextStyles((prev) => {
                                const next = { ...prev };
                                fields.forEach((f) => {
                                  next[f.id] = {
                                    ...getTextStyle(f.id),
                                    size: value,
                                  };
                                });
                                return next;
                              });
                            } else if (currentField) {
                              setTextStyles((prev) => ({
                                ...prev,
                                [currentField.id]: {
                                  ...getTextStyle(currentField.id),
                                  size: value,
                                },
                              }));
                            }
                          }}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                          <span>작게</span>
                          <span>{currentSizeScale.toFixed(2)}x</span>
                          <span>크게</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bold 토글 */}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
                    <button
                      type="button"
                      onClick={() => {
                        if (!fields.length) return;
                        const targetIds = applyToAll
                          ? fields.map((f) => f.id)
                          : currentField
                            ? [currentField.id]
                            : [];

                        if (!targetIds.length) return;

                        const baseBold = currentField
                          ? getTextStyle(currentField.id).bold
                          : false;
                        const newValue = !baseBold;

                        setTextStyles((prev) => {
                          const next = { ...prev };
                          targetIds.forEach((id) => {
                            next[id] = {
                              ...getTextStyle(id),
                              bold: newValue,
                            };
                          });
                          return next;
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] border transition ${currentStyle.bold
                          ? "bg-indigo-500 text-white border-indigo-400"
                          : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
                        }`}
                    >
                      Bold 적용
                    </button>
                  </div>

                  {/* 전체 적용 토글 UI (현재 면 기준) */}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
                    <button
                      type="button"
                      onClick={() => setApplyToAll((prev) => !prev)}
                      className={`w-9 h-5 flex items-center rounded-full px-0.5 transition ${applyToAll ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow transform transition ${applyToAll ? "translate-x-4" : ""
                          }`}
                      />
                    </button>
                    <span>
                      이 스타일을{" "}
                      <span className="font-semibold">
                        현재 면의 모든 텍스트
                      </span>
                      에 동시에 적용
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    * 토글이 켜져 있는 동안 폰트/색상/크기/굵기를 변경하면 현재
                    선택된 면의 모든 텍스트에 한 번에 반영됩니다.
                  </p>
                </div>

                {/* 위치/드래그 + 이미지 업로드 컨트롤 */}
                <div className="border border-slate-800 bg-slate-900/80 rounded-xl p-4 text-xs text-slate-200 space-y-5">
                  {/* 텍스트 위치 */}
                  <div>
                    <h3 className="text-[13px] font-semibold mb-2">
                      텍스트 위치 / 드래그 설정
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3">
                      먼저 조정할 텍스트를 선택한 뒤, 슬라이더로 X/Y를 정밀하게
                      변경할 수 있습니다. (현재:{" "}
                      {activeSide === "front" ? "앞면" : "뒷면"})
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {fields.length === 0 ? (
                        <span className="text-[11px] text-slate-500">
                          2단계에서 텍스트를 추가하면 여기서 선택하여 조정할 수
                          있습니다.
                        </span>
                      ) : (
                        fields.map((f, idx) => {
                          const label =
                            f.value?.length > 10
                              ? f.value.slice(0, 10) + "…"
                              : f.value || `텍스트 ${idx + 1}`;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                setSelectedFieldId(f.id);
                                setSelectedImageId(null);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] border ${selectedFieldId === f.id
                                  ? "bg-indigo-500 text-white border-indigo-400 shadow-sm"
                                  : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
                                }`}
                            >
                              {label}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {currentField ? (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-semibold">
                              X 위치
                            </label>
                            <span className="text-[11px] text-slate-400">
                              {currentField.x.toFixed(1)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={currentField.x}
                            onChange={(e) =>
                              updateActiveFields((prev) =>
                                prev.map((f) =>
                                  f.id === currentField.id
                                    ? {
                                      ...f,
                                      x: parseFloat(e.target.value),
                                    }
                                    : f
                                )
                              )
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-semibold">
                              Y 위치
                            </label>
                            <span className="text-[11px] text-slate-400">
                              {currentField.y.toFixed(1)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={currentField.y}
                            onChange={(e) =>
                              updateActiveFields((prev) =>
                                prev.map((f) =>
                                  f.id === currentField.id
                                    ? {
                                      ...f,
                                      y: parseFloat(e.target.value),
                                    }
                                    : f
                                )
                              )
                            }
                            className="w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        선택된 텍스트가 없습니다.
                      </p>
                    )}
                  </div>

                  {/* 이미지 업로드 및 위치 설정 */}
                  <div className="pt-3 border-t border-slate-800">
                    <h3 className="text-[13px] font-semibold mb-2">
                      이미지(로고 / QR 등) 업로드 & 배치
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-2">
                      회사 로고, QR코드 등 이미지를 업로드해 명함 위에 배치할 수
                      있습니다. (현재:{" "}
                      {activeSide === "front" ? "앞면" : "뒷면"})
                    </p>

                    <div className="flex items-center gap-2 mb-2">
                      <label className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[11px] hover:bg-slate-800 cursor-pointer">
                        이미지 업로드
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-slate-500">
                        PNG / JPG 권장 (로고/아이콘/QR 등)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {images.length === 0 ? (
                        <span className="text-[11px] text-slate-500">
                          업로드된 이미지가 없습니다.
                        </span>
                      ) : (
                        images.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => {
                              setSelectedImageId(img.id);
                              setSelectedFieldId(null);
                            }}
                            className={`px-2 py-1 rounded-lg text-[11px] border flex items-center gap-1 ${selectedImageId === img.id
                                ? "bg-emerald-500 text-white border-emerald-400"
                                : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
                              }`}
                          >
                            <span className="inline-block w-4 h-4 overflow-hidden rounded bg-slate-800">
                              <img
                                src={img.src}
                                alt="thumb"
                                className="w-full h-full object-cover"
                              />
                            </span>
                            <span>이미지</span>
                          </button>
                        ))
                      )}
                    </div>

                    {currentImage ? (
                      <div className="space-y-3 mt-1">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-semibold">
                              X 위치 (이미지)
                            </label>
                            <span className="text-[11px] text-slate-400">
                              {currentImage.x.toFixed(1)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={currentImage.x}
                            onChange={(e) =>
                              updateActiveImages((prev) =>
                                prev.map((img) =>
                                  img.id === currentImage.id
                                    ? {
                                      ...img,
                                      x: parseFloat(e.target.value),
                                    }
                                    : img
                                )
                              )
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-semibold">
                              Y 위치 (이미지)
                            </label>
                            <span className="text-[11px] text-slate-400">
                              {currentImage.y.toFixed(1)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={currentImage.y}
                            onChange={(e) =>
                              updateActiveImages((prev) =>
                                prev.map((img) =>
                                  img.id === currentImage.id
                                    ? {
                                      ...img,
                                      y: parseFloat(e.target.value),
                                    }
                                    : img
                                )
                              )
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[11px] font-semibold">
                              이미지 크기
                            </label>
                            <span className="text-[11px] text-slate-400">
                              {(currentImage.scale ?? 1).toFixed(2)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.4"
                            max="2"
                            step="0.05"
                            value={currentImage.scale ?? 1}
                            onChange={(e) =>
                              updateActiveImages((prev) =>
                                prev.map((img) =>
                                  img.id === currentImage.id
                                    ? {
                                      ...img,
                                      scale: parseFloat(e.target.value),
                                    }
                                    : img
                                )
                              )
                            }
                            className="w-full"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeImage(currentImage.id)}
                          className="mt-1 px-3 py-1.5 rounded-lg border border-rose-500/60 text-rose-300 text-[11px] hover:bg-rose-500/10"
                        >
                          선택한 이미지 삭제
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1">
                        조정할 이미지를 위에서 선택하세요.
                      </p>
                    )}

                    <div className="pt-3 border-t border-slate-800 mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-semibold">
                          드래그 감도 (텍스트 & 이미지 공통)
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {dragSensitivity.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="2"
                        step="0.1"
                        value={dragSensitivity}
                        onChange={(e) =>
                          setDragSensitivity(parseFloat(e.target.value))
                        }
                        className="w-full"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        * 값이 낮을수록 미세하게, 높을수록 빠르게 이동합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button
                  onClick={goPrev}
                  className="px-4 py-2 text-xs md:text-sm border border-slate-700 rounded-xl text-slate-200 hover:bg-slate-800/80 transition"
                >
                  이전 단계
                </button>
                <button
                  onClick={goNext}
                  className="btn-gradient btn-gradient-primary px-5 py-2.5 text-xs md:text-sm"
                >
                  다음 단계 (최종 확인)
                </button>
              </div>
            </div>
          )}

          {/* 4단계: 검토 & 다운로드 */}
          {step === 4 && (
            <div className="mt-2 space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold mb-2">
                4단계. 최종본 검토 & PNG 다운로드
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mb-3">
                최종 명함 디자인입니다. 필요하다면 이전 단계로 돌아가 배경, 텍스트
                위치, 폰트, 색상, 이미지 배치를 다시 조정할 수 있습니다.
              </p>

              {/* 양면일 때는 둘 다 미리보기, 단면이면 앞면만 */}
              {isDoubleSided ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1">
                      앞면 미리보기
                    </p>
                    <BusinessCardPreview
                      loading={false}
                      fields={frontFields}
                      images={frontImages}
                      image={frontImage}
                      interactive={false}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1">
                      뒷면 미리보기
                    </p>
                    <BusinessCardPreview
                      loading={false}
                      fields={backFields}
                      images={backImages}
                      image={backImage}
                      interactive={false}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-slate-400 mb-1">
                    단면 미리보기
                  </p>
                  <BusinessCardPreview
                    loading={false}
                    fields={frontFields}
                    images={frontImages}
                    image={frontImage}
                    interactive={false}
                  />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 text-xs md:text-sm text-slate-200 mt-2">
                <div className="border border-slate-800 rounded-xl p-3 bg-slate-900/70">
                  <h3 className="font-semibold text-[13px] mb-2">
                    입력한 명함 텍스트 (앞면 / 뒷면)
                  </h3>
                  <div className="space-y-1.5 text-slate-300">
                    <p className="text-[11px] text-slate-400 mt-1">· 앞면</p>
                    {frontFields.length === 0 ? (
                      <p className="text-slate-500">앞면 텍스트가 없습니다.</p>
                    ) : (
                      frontFields.map((f, idx) => (
                        <p key={f.id}>
                          <span className="text-slate-400">
                            F{idx + 1}:
                          </span>{" "}
                          {f.value || "-"}
                        </p>
                      ))
                    )}

                    {isDoubleSided && (
                      <>
                        <p className="text-[11px] text-slate-400 mt-3">
                          · 뒷면
                        </p>
                        {backFields.length === 0 ? (
                          <p className="text-slate-500">
                            뒷면 텍스트가 없습니다.
                          </p>
                        ) : (
                          backFields.map((f, idx) => (
                            <p key={f.id}>
                              <span className="text-slate-400">
                                B{idx + 1}:
                              </span>{" "}
                              {f.value || "-"}
                            </p>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="border border-slate-800 rounded-xl p-3 bg-slate-900/70">
                  <h3 className="font-semibold text-[13px] mb-2">
                    텍스트 배치 좌표 (%, 중심 기준)
                  </h3>
                  <div className="space-y-1.5 text-slate-300">
                    <p className="text-[11px] text-slate-400 mt-1">· 앞면</p>
                    {frontFields.length === 0 ? (
                      <p className="text-slate-500">앞면 배치 정보 없음</p>
                    ) : (
                      frontFields.map((f, idx) => (
                        <p key={f.id}>
                          <span className="text-slate-400">
                            F{idx + 1}:
                          </span>{" "}
                          X {f.x.toFixed(1)}%, Y {f.y.toFixed(1)}%
                        </p>
                      ))
                    )}

                    {isDoubleSided && (
                      <>
                        <p className="text-[11px] text-slate-400 mt-3">
                          · 뒷면
                        </p>
                        {backFields.length === 0 ? (
                          <p className="text-slate-500">뒷면 배치 정보 없음</p>
                        ) : (
                          backFields.map((f, idx) => (
                            <p key={f.id}>
                              <span className="text-slate-400">
                                B{idx + 1}:
                              </span>{" "}
                              X {f.x.toFixed(1)}%, Y {f.y.toFixed(1)}%
                            </p>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-1 p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px] text-slate-300">
                *{" "}
                <span className="font-semibold">
                  “PNG로 다운로드” 버튼을 클릭하면
                </span>
                , 배경과 텍스트, 업로드한 이미지(로고/QR 등)가 합쳐진{" "}
                <span className="font-semibold">
                  명함 규격(3.5 x 2inch @ 300dpi 수준)의 PNG
                </span>
                가 생성됩니다.
                {isDoubleSided
                  ? " 앞면과 뒷면을 각각 PNG로 저장해서 인쇄소에 전달할 수 있습니다."
                  : " 단면 이미지를 PNG로 저장해서 인쇄소에 전달할 수 있습니다."}
              </div>

              <div className="flex justify-between mt-4">
                <button
                  onClick={goPrev}
                  className="px-4 py-2 text-xs md:text-sm border border-slate-700 rounded-xl text-slate-200 hover:bg-slate-800/80 transition"
                >
                  이전 단계 (수정하기)
                </button>
                <div className="flex flex-wrap gap-2">
                  {isDoubleSided ? (
                    <>
                      <button
                        onClick={() => downloadCardAsImage("front")}
                        disabled={downloadLoading}
                       className="btn-gradient btn-gradient-emerald px-5 py-2.5 text-xs md:text-sm inline-flex items-center gap-2"
                      >
                        앞면 PNG 다운로드
                      </button>
                      <button
                        onClick={() => downloadCardAsImage("back")}
                        disabled={downloadLoading}
                       className="btn-gradient btn-gradient-emerald px-5 py-2.5 text-xs md:text-sm inline-flex items-center gap-2"
                      >
                        뒷면 PNG 다운로드
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => downloadCardAsImage("front")}
                      disabled={downloadLoading}
                      className="btn-gradient btn-gradient-emerald px-5 py-2.5 text-xs md:text-sm inline-flex items-center gap-2"
                    >
                      PNG로 다운로드
                    </button>
                  )}

                  <button
                    onClick={resetAll}
                    className="px-4 py-2 text-xs md:text-sm border border-rose-500/60 text-rose-300 rounded-xl hover:bg-rose-500/10 transition"
                  >
                    처음부터 다시
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;