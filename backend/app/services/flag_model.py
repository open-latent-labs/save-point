# services/flag_model.py
try:
    from FlagEmbedding import BGEM3FlagModel
    _AVAILABLE = True
except Exception:
    BGEM3FlagModel = None
    _AVAILABLE = False

_flag_model = None

def get_flag_model():
    global _flag_model
    if not _AVAILABLE:
        raise RuntimeError("FlagEmbedding을 로드할 수 없습니다. torch 환경을 확인하세요.")
    if _flag_model is None:
        _flag_model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=False)
    return _flag_model