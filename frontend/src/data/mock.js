// 정적 카피 / 메뉴 / mock 대화 데이터 모음
// 실제 API 연동 시 getMockAnswer 를 fetch 호출로 교체하면 됩니다.

export const BRAND = "GameDocs";

export const HERO = {
  titleLine1: "게임 개발의 모든 문서를",
  titleLine2: "검색하고, 질문하세요",
  subtitle:
    "Unity·UE5 공식 레퍼런스부터 포스트모템·성능 최적화 사례까지, AI가 요약·분류해 바로 답해 드립니다.",
  placeholder: "엔진 API를 검색하거나 개발 문제를 질문해 보세요",
  searchLabel: "AI 검색",
  suggestLabel: "추천 검색",
};

export const SUGGESTIONS = [
  "UE5 Nanite 렌더링 파이프라인",
  "Unity DOTS 멀티스레딩",
  "Halo Infinite AI 설계",
  "PBR 셰이더 최적화",
  "모바일 드로우콜 배칭",
];

// 사이드바 문서 카테고리 (백엔드 Category enum과 동일한 키 사용)
export const CATEGORIES = [
  { key: "SCRIPTING",   label: "스크립팅",    color: "#5BC8FF" },
  { key: "RENDERING",   label: "렌더링",      color: "#C792EA" },
  { key: "EDITOR",      label: "에디터",      color: "#8A93FF" },
  { key: "PHYSICS",     label: "물리",        color: "#FF7A85" },
  { key: "MATH",        label: "수학",        color: "#36E0A1" },
  { key: "UI",          label: "UI",          color: "#FFB454" },
  { key: "XR",          label: "XR",          color: "#FF9F7F" },
  { key: "ANIMATION",   label: "애니메이션",  color: "#7FD9FF" },
  { key: "INPUT",       label: "입력",        color: "#B5FF7F" },
  { key: "PERFORMANCE", label: "성능/최적화", color: "#FFD700" },
  { key: "AUDIO",       label: "오디오",      color: "#DA8FFF" },
  { key: "NETWORKING",  label: "네트워킹",    color: "#FF6B9D" },
  { key: "OTHER",       label: "기타",        color: "#9E9E9E" },
];

// 데모용 기본 최근 기록 (localStorage 가 비어 있을 때 노출)
export const DEFAULT_HISTORY = [
  "UE5 Lumen 글로벌 일루미네이션",
  "Unity ECS 엔티티 쿼리",
  "스카이림 오픈월드 스트리밍",
];

// ─── Mock AI 답변 ───────────────────────────────────────────────
// 키워드가 매칭되면 해당 답변을, 아니면 일반 답변을 반환합니다.
const ANSWERS = [
  {
    match: ["nanite", "나나이트"],
    text:
      "UE5의 Nanite는 가상화 마이크로폴리곤 지오메트리 시스템으로, 수억 개의 트라이앵글을 픽셀 단위 디테일로 렌더링하면서도 일정한 비용을 유지합니다.\n\n핵심 동작은 다음과 같습니다.\n• 메시를 계층적 클러스터(약 128 트라이앵글 단위)로 분할해 저장합니다.\n• 화면 공간 오차를 기준으로 적절한 LOD 클러스터를 GPU에서 실시간 선택합니다.\n• 비저블 클러스터만 소프트웨어/하드웨어 래스터라이저로 그려 드로우콜과 폴리곤 부하를 분리합니다.\n\n주의점: 스키닝 메시·투명 머티리얼·테셀레이션에는 제약이 있으며, World Position Offset 사용 시 별도 비용이 발생합니다.",
    sources: [
      { title: "Unreal Engine 5 — Nanite Virtualized Geometry", url: "https://docs.unrealengine.com" },
      { title: "Nanite Rendering Pipeline 개요", url: "https://dev.epicgames.com" },
    ],
  },
  {
    match: ["dots", "ecs", "멀티스레딩", "job system"],
    text:
      "Unity DOTS(Data-Oriented Tech Stack)는 ECS, C# Job System, Burst 컴파일러로 구성된 데이터 지향 스택입니다.\n\n• ECS: 데이터(Component)를 캐시 친화적인 연속 메모리(Archetype Chunk)에 배치해 메모리 지역성을 극대화합니다.\n• Job System: 작업을 워커 스레드에 분산하고, 의존성 그래프로 레이스 컨디션을 방지합니다.\n• Burst: IL을 고도로 최적화된 네이티브 SIMD 코드로 컴파일합니다.\n\n실무 팁: SystemBase 대신 ISystem + Burst 조합이 오버헤드가 더 낮고, EntityQuery 캐싱과 IJobEntity 사용으로 메인 스레드 병목을 줄일 수 있습니다.",
    sources: [
      { title: "Unity DOTS — Entities & Job System", url: "https://docs.unity3d.com" },
      { title: "Burst User Guide", url: "https://docs.unity3d.com" },
    ],
  },
  {
    match: ["halo", "ai 설계", "behavior tree", "행동 트리"],
    text:
      "대규모 슈터의 적 AI는 보통 계층적 의사결정 구조로 설계됩니다.\n\n• Behavior Tree로 전투/엄폐/후퇴 같은 고수준 행동을 모듈화합니다.\n• 인지(Perception) 시스템이 시야·소리·피격 자극을 수집해 블랙보드에 기록합니다.\n• 전술 위치는 영향력 맵(Influence Map)과 엄폐 포인트 쿼리로 평가합니다.\n• 그룹 단위 조율을 위해 분대(Squad) 매니저가 역할을 분배합니다.\n\n핵심은 '똑똑함'보다 '읽히는 행동'입니다. 플레이어가 AI의 의도를 예측할 수 있도록 애니메이션·사운드로 의도를 노출하는 것이 체감 품질을 좌우합니다.",
    sources: [
      { title: "Game AI Pro — Behavior Trees in Practice", url: "https://www.gameaipro.com" },
      { title: "Influence Maps for Tactical Reasoning", url: "https://www.gdcvault.com" },
    ],
  },
  {
    match: ["pbr", "셰이더", "shader 최적화", "shader"],
    text:
      "PBR 셰이더 최적화는 시각 품질을 유지하면서 GPU 사이클을 줄이는 작업입니다.\n\n• 텍스처: 메탈릭·러프니스·AO를 한 텍스처의 RGB 채널에 패킹해 샘플 수를 줄입니다.\n• 분기: 동적 if 분기를 줄이고 셰이더 베리언트(키워드)로 분리합니다.\n• 연산: 정규화·역제곱근 등 고비용 연산을 최소화하고 하프 정밀도(half)를 적극 활용합니다.\n• 라이팅: 모바일은 풀 BRDF 대신 근사 모델(예: 단순화된 GGX)을 사용합니다.\n\n프로파일링은 추측보다 우선입니다. 플랫폼별 GPU 프로파일러로 ALU/텍스처 바운드 여부를 먼저 확인하세요.",
    sources: [
      { title: "Physically Based Rendering — Optimization Notes", url: "https://google.github.io/filament" },
      { title: "Mobile Shader Best Practices", url: "https://docs.unity3d.com" },
    ],
  },
  {
    match: ["드로우콜", "배칭", "draw call", "batching"],
    text:
      "모바일에서 드로우콜은 CPU 병목의 주범이라 배칭이 핵심입니다.\n\n• Static Batching: 움직이지 않는 오브젝트를 결합 메시로 병합합니다(메모리 비용 증가 주의).\n• Dynamic Batching: 작은 메시를 런타임에 합치지만 정점 수 한계가 있습니다.\n• GPU Instancing: 동일 메시/머티리얼을 한 번의 드로우콜로 다수 렌더링합니다.\n• SRP Batcher: 머티리얼이 같은 셰이더 베리언트를 공유하면 상수 버퍼 바인딩을 줄여줍니다.\n\n가장 큰 효과는 머티리얼/아틀라스 통합으로 배치를 깨뜨리지 않는 것입니다. 텍스처 아틀라싱과 머티리얼 수 축소를 먼저 적용하세요.",
    sources: [
      { title: "Unity — Draw Call Batching", url: "https://docs.unity3d.com" },
      { title: "Optimizing Graphics Performance (Mobile)", url: "https://docs.unity3d.com" },
    ],
  },
  {
    match: ["lumen"],
    text:
      "UE5 Lumen은 실시간 동적 글로벌 일루미네이션·리플렉션 솔루션입니다.\n\n• 씬을 거리 필드/메시 카드로 표현해 간접광을 추적합니다.\n• 소프트웨어 레이트레이싱(기본)과 하드웨어 레이트레이싱(고사양) 경로를 모두 지원합니다.\n• Final Gather 단계에서 스크린 트레이스 + 월드 공간 프로브로 노이즈를 줄입니다.\n\n성능 팁: Lumen Scene 디테일과 Final Gather 퀄리티를 분리해 조정하고, 콘솔/PC 타깃에 따라 하드웨어 RT 전환 여부를 결정하세요.",
    sources: [
      { title: "Unreal Engine 5 — Lumen Global Illumination", url: "https://docs.unrealengine.com" },
    ],
  },
];

const GENERIC = (q) => ({
  text:
    `"${q}" 에 대해 게임 엔진 기술 문서 관점에서 정리했어요.\n\n` +
    "• 먼저 공식 레퍼런스에서 핵심 개념과 API 시그니처를 확인하는 것을 권장합니다.\n" +
    "• 실제 적용 시에는 타깃 플랫폼(모바일/콘솔/PC)별 제약과 성능 특성을 함께 고려해야 합니다.\n" +
    "• 비슷한 사례의 포스트모템을 참고하면 흔한 함정을 피할 수 있습니다.\n\n" +
    "더 구체적인 엔진 버전이나 상황(예: 'UE5.4에서 ~', 'Unity URP에서 ~')을 알려 주시면 더 정확히 답해 드릴게요.",
  sources: [
    { title: "Unity Documentation", url: "https://docs.unity3d.com" },
    { title: "Unreal Engine Documentation", url: "https://docs.unrealengine.com" },
  ],
});

export function getMockAnswer(query) {
  const q = (query || "").toLowerCase();
  const hit = ANSWERS.find((a) => a.match.some((m) => q.includes(m.toLowerCase())));
  if (hit) return { text: hit.text, sources: hit.sources };
  return GENERIC(query);
}
