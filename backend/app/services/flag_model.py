# 싱글톤 패턴으로 모델 로드
from FlagEmbedding import BGEM3FlagModel

_flag_model = None

# 첫 호출에만 모델 로드, 이후에는 만들어진 인스턴스를 반환하여 재사용
def get_flag_model() -> BGEM3FlagModel:
    global _flag_model
    if _flag_model is None:
         #cpu 환경이기 때문에 fp16를 끔. gpu 사용 가능하면 true로
        _flag_model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=False)
    return _flag_model