const KEY = "gamedocs.rooms";

export const DUMMY_ROOMS = [
  {
    id: "room_1",
    title: "UE5 Nanite 렌더링 파이프라인",
    preview: "Nanite는 가상화된 지오메트리 시스템으로 수십억 개의 폴리곤을...",
    date: "2026-06-04",
    messages: [
      { id: "m1", role: "user", text: "UE5 Nanite 렌더링 파이프라인 설명해줘" },
      { id: "m2", role: "ai", text: "Nanite는 가상화된 지오메트리 시스템으로 수십억 개의 폴리곤을 실시간으로 렌더링할 수 있습니다.\n\n**핵심 특징:**\n- 화면 픽셀 수에 맞게 지오메트리를 자동 LOD 처리\n- 기존 LOD 워크플로우 불필요\n- 포토그래메트리 에셋에 최적화\n\n클러스터 계층 구조를 사용하여 카메라 거리에 따라 적절한 디테일 레벨을 선택합니다.", sources: [{ title: "UE5 Nanite Architecture Deep Dive", doc: "UE5_Nanite_Architecture_Deep_Dive.pdf" }], streaming: false },
      { id: "m3", role: "user", text: "Nanite가 지원하지 않는 메시 타입은?" },
      { id: "m4", role: "ai", text: "Nanite가 현재 지원하지 않는 메시 타입:\n\n- **스켈레탈 메시** (애니메이션 캐릭터)\n- **스플라인 메시**\n- **랜드스케이프**\n- **절차적 메시** (일부)\n- 반투명/마스크드 머티리얼이 적용된 메시\n\n이런 경우 전통적인 LOD 시스템을 병행해서 사용하는 것이 좋습니다.", sources: [], streaming: false },
    ],
  },
  {
    id: "room_2",
    title: "Unity DOTS 멀티스레딩 패턴",
    preview: "DOTS의 Job System을 활용하면 메인 스레드 병목을 크게 줄일 수...",
    date: "2026-06-03",
    messages: [
      { id: "m5", role: "user", text: "Unity DOTS 멀티스레딩 어떻게 써?" },
      { id: "m6", role: "ai", text: "Unity DOTS의 Job System을 활용하면 메인 스레드 병목을 크게 줄일 수 있습니다.\n\n**기본 패턴:**\n```csharp\npublic struct MoveJob : IJobParallelFor {\n    public NativeArray<float3> positions;\n    public float deltaTime;\n    public void Execute(int i) {\n        positions[i] += new float3(0, 1, 0) * deltaTime;\n    }\n}\n```\n\n**주의사항:**\n- NativeArray 사용 → 반드시 Dispose() 호출\n- BurstCompile 어트리뷰트로 최적화\n- 구조체는 값 타입으로 처리됨", sources: [{ title: "Unity DOTS Multithreading Guide", doc: "Unity_DOTS_Multithreading_Guide.md" }], streaming: false },
    ],
  },
  {
    id: "room_3",
    title: "PBR 셰이더 최적화 기법",
    preview: "모바일에서 PBR 셰이더를 최적화할 때 가장 먼저 고려해야 할 것은...",
    date: "2026-06-02",
    messages: [
      { id: "m7", role: "user", text: "모바일에서 PBR 셰이더 최적화 방법" },
      { id: "m8", role: "ai", text: "모바일 PBR 최적화 핵심 전략:\n\n**1. 샘플러 최소화**\n- 텍스처 채널 패킹 (R=Metallic, G=Roughness, B=AO)\n- 불필요한 샘플러 제거\n\n**2. 연산 단순화**\n- Full GGX 대신 Simplified GGX 사용\n- IBL 큐브맵 Mip 레벨 활용\n- 실시간 라이팅 최소화\n\n**3. Shader LOD**\n- 카메라 거리에 따라 셰이더 복잡도 전환\n- 고급 반사 효과는 원거리에서 제거", sources: [{ title: "PBR Shader Optimization Techniques", doc: "PBR_Shader_Optimization_Techniques.pdf" }], streaming: false },
      { id: "m9", role: "user", text: "URP에서 커스텀 셰이더 작성할 때 주의점은?" },
      { id: "m10", role: "ai", text: "URP 커스텀 셰이더 작성 시 주의사항:\n\n- **HLSL Include 경로** — `#include \"Packages/com.unity.render-pipelines.universal/...\"` 사용\n- **RenderPipeline 태그** 반드시 명시\n- **SRP Batcher 호환** — UnityPerMaterial CBUFFER 구조 준수\n- Built-in 파이프라인 셰이더 그대로 사용 불가\n\n```hlsl\nCBUFFER_START(UnityPerMaterial)\n    float4 _BaseColor;\n    float _Metallic;\nCBUFFER_END\n```", sources: [], streaming: false },
    ],
  },
  {
    id: "room_4",
    title: "Halo Infinite AI 행동 트리",
    preview: "Halo Infinite의 AI는 계층적 행동 트리와 유틸리티 AI를 결합해...",
    date: "2026-06-01",
    messages: [
      { id: "m11", role: "user", text: "Halo Infinite AI 설계 어떻게 됐어?" },
      { id: "m12", role: "ai", text: "Halo Infinite의 AI는 계층적 행동 트리와 유틸리티 AI를 결합한 하이브리드 구조입니다.\n\n**핵심 구성 요소:**\n- **Behavior Tree** — 전투 우선순위 결정\n- **Utility AI** — 상황별 점수 기반 행동 선택\n- **Sensing System** — 시야·청각·촉각 통합\n- **Squad AI** — 팀 단위 전술 조율\n\n특히 적 AI가 플레이어 스킬에 따라 동적으로 난이도를 조정하는 DDA 시스템이 포함되어 있습니다.", sources: [{ title: "Halo Infinite AI System Postmortem", doc: "Halo_Infinite_AI_System_Postmortem.pdf" }], streaming: false },
    ],
  },
  {
    id: "room_5",
    title: "모바일 드로우콜 배칭",
    preview: "드로우콜 배칭의 핵심은 같은 머티리얼을 사용하는 오브젝트를 하나의...",
    date: "2026-05-30",
    messages: [
      { id: "m13", role: "user", text: "모바일 드로우콜 배칭 최적화 방법 알려줘" },
      { id: "m14", role: "ai", text: "드로우콜 배칭의 핵심은 같은 머티리얼을 사용하는 오브젝트를 하나의 드로우콜로 묶는 것입니다.\n\n**Unity 배칭 종류:**\n\n1. **Static Batching** — 움직이지 않는 오브젝트, 빌드 시 메시 결합\n2. **Dynamic Batching** — 300 버텍스 이하 메시 자동 배칭\n3. **GPU Instancing** — 동일 메시 대량 배치 시 최적\n4. **SRP Batcher** — 셰이더 상태 변경 최소화\n\n**체크리스트:**\n- 아틀라스 텍스처 사용\n- 머티리얼 공유\n- 오브젝트 수 최소화", sources: [{ title: "Mobile DrawCall Batching Checklist", doc: "Mobile_DrawCall_Batching_Checklist.txt" }], streaming: false },
    ],
  },
];

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function loadRooms(userId) {
  if (!userId) return [];
  try {
    const res = await fetch(`${BASE_URL}/api/v1/users/${userId}/sessions`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((s) => ({
      id: s.session_id,
      title: s.session_name,
      date: s.last_active_at?.slice(0, 10) ?? "",
      messages: [],
    }));
  } catch (e) {
    console.error("[loadRooms] 네트워크 오류:", e);
    return [];
  }
}

export async function createRoom(userId, sessionName = "새 채팅") {
  const res = await fetch(`${BASE_URL}/api/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, session_name: sessionName }),
  });
  if (!res.ok) {
    throw new Error(`Session creation failed: ${res.status}`);
  }
  const data = await res.json();

  // 사이드바 목록 갱신 이벤트
  window.dispatchEvent(new Event("gamedocs:rooms"));

  return {
    id: data.session_id,
    title: data.session_name,
    date: data.created_at?.slice(0, 10) ?? "",
    messages: [],
  };
}

export async function loadMessages(sessionId) {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/sessions/${sessionId}/messages`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((m) => ({
      id: m.id,
      role: m.role === "USER" ? "user" : "ai",
      text: m.content_ko,
      sources: m.retrieved_chunk_ids ?? [],  // 출처 복원
      streaming: false,
      isLoading: false,
    }));
  } catch {
    return [];
  }
}

export async function deleteRoom(sessionId) {
  await fetch(`${BASE_URL}/api/v1/sessions/${sessionId}`, {
    method: "DELETE",
  });
}