/*
SSE는 EventSource로 구현해야하는데, 지금 방식은 fetch + ReadableStream를 사용하고 있음.
이 방식은 사실 제대로 된 SSE 방식은 아님! -> 딱히 부르는 이름은 없음 FATCH 스트리밍, SSE-like, 커스텀 SSE...

SSE -> GET만 가능, 커스텀 헤더 불가 / 데이터 형식 자동 파싱, 자동 재연결 
  -> URL에 데이터를 담아 보냄(질문을 URL에 추가해서 보내게 됨)
    -> URL 길이 제한, 한글/특수문자 깨짐, 보안상 노출 등...
  -> 보통 단순 알림성 데이터에 사용

지금 -> POST 가능, 커스텀 헤더 가능 / 데이터 형식 직접 파싱, 직접 재연결 구현
  -> 질문을 BODY에 담아서 보내야 하는 경우 POST가 필수적!
    -> 여기서부터 정석 SSE는 불가

그럼 웹소켓을 뚫어야했던거 아닌가?
-> [질문-답]이 챗봇 특성상 순서도 정해져있고, 영원히 1:1 교환
  -> 웹소켓은 카톡처럼 N:M 교환인 경우에 사용하기 때문에 지금의 경우 과하고 복잡도도 높음!
  -> 웹소켓은 연결도 계속 유지되는데 우리는 어차피 질문 들어오면 그 순간에만 연결 유지하면 됨.
  -> 그리고 질문=요청 답=출력 으로 보면, 결국 요청 보낸 이후에는 계속 서버의 단방향 데이터만 받는 시스템.
  -> LLM 토큰만 실시간으로 받을 필요가 있기 때문에 -> 양방향 실시간인 웹소켓 보다는 단방향 실시간인 SSE 사용
*/

/**
 * @param {string} question - 유저 질문
 * @param {string} userId - 유저 ID
 * @param {(token: string) => void} onToken - 토큰 받을 때마다 호출
 * @param {(sources: Array) => void} onSources - 출처 받았을 때 호출
 * @param {() => void} onDone - 스트리밍 완료 시 호출
 * @returns {() => void} abort 함수 (중지 버튼용)
 */
// 이벤트 핸들러 네이밍 컨벤션 -> [ON + 이벤트명] 형태는 ~할때 실행되는 함수라는 암묵적 의미
export function streamChat(question, userId, onToken, onSources, onDone) {
  // 스트리밍 도중에 강제 중지할 수 있는 컨트롤러
  // 브라우저 내장 WEB API.
  const controller = new AbortController();

  // 비동기함수 -> 내부에서 도중 강제 중지인 abort 함수를 바로 반환하기 위함
  (async () => {
    try {
      // /api/v1/chat에 POST 요청 보내기
      // 스트림(세션)을 여기서 열고, 이후 누가 DONE을 보내기 전까지 영원히 열려있음.
      const response = await fetch(`/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, user_id: userId }),
        // 이후 [controller.abort()] 함수의 말을 듣게 미리 명령. controller.signal과 controller.abort()는 쌍
        signal: controller.signal,
      });
      
      //다음 두 과정 준비
      const reader = response.body.getReader(); // 우편함에서 편지 가져오고 뜯어서 편지지 한 장씩 꺼내기
      const decoder = new TextDecoder(); // 편지 번역하기

      while (true) {
        const { done, value } = await reader.read(); // 데이터 올때까지 기다렸다가 오면 DONE, VALUE 반환
        if (done) break; // 스트림 종료

        const text = decoder.decode(value); 
        const lines = text.split("\n").filter((l) => l.startsWith("data: ")); // 여러줄 오면 분리

        for (const line of lines) {
          // data: 로 시작하는게 SSE 데이터 형식
          // 서버에서 해당 양식의 데이터를 주면 data: 부분을 자르고 그 외 부분만 사용
          const data = line.replace("data: ", ""); 

          //서버가 DONE을 보내면 스트림 종료
          if (data === "[DONE]") {
            onDone();
            return;
          }
          
          // 서버가 출처 보낼땐 앞에 [SOURCES] 붙임 -> 포장 떼고 내용만 저장
          if (data.startsWith("[SOURCES]")) {
            const sources = JSON.parse(data.replace("[SOURCES]", ""));
            onSources(sources);
            continue;
          }
          
          //위 두 케이스(종료, 출처)가 아니면 일반 데이터임으로 받아서 화면에 렌더
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