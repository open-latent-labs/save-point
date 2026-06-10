# services/flag_model.py
from FlagEmbedding import BGEM3FlagModel

_flag_model = None

def get_flag_model() -> BGEM3FlagModel:
    global _flag_model
    if _flag_model is None:
        _flag_model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=False)
    return _flag_model