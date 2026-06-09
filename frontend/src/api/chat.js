const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/**
 * SSE 스트리밍으로 챗봇 답변 받기
 * @param {string} question - 유저 질문
 * @param {string} userId - 유저 ID
 * @param {(token: string) => void} onToken - 토큰 받을 때마다 호출
 * @param {(sources: Array) => void} onSources - 출처 받았을 때 호출
 * @param {() => void} onDone - 스트리밍 완료 시 호출
 * @returns {() => void} abort 함수 (중지 버튼용)
 */
export function streamChat(question, userId, onToken, onSources, onDone) {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, user_id: userId }),
        signal: controller.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "");

          if (data === "[DONE]") {
            onDone();
            return;
          }

          if (data.startsWith("[SOURCES]")) {
            const sources = JSON.parse(data.replace("[SOURCES]", ""));
            onSources(sources);
            continue;
          }

          onToken(data);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("SSE 오류:", err);
        onDone();
      }
    }
  })();

  // 중지 버튼용 abort 함수 반환
  return () => controller.abort();
}