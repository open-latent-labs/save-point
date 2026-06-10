from __future__ import annotations

import re
import unicodedata


def preprocess_text(text: str) -> str:
    if not text:
        return ""

    text = unicodedata.normalize("NFC", text)
    text = text.replace("﻿", "")  # BOM
    text = "".join(
        c for c in text
        if unicodedata.category(c) != "Cc" or c in ("\n", "\t")
    )

    text = re.sub(r"([a-zA-Z])-\n([a-zA-Z])", r"\1\2", text)

    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)

    text = re.sub(r"[ \t]+", " ", text)

    text = re.sub(r"\n{3,}", "\n\n", text)

    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines).strip()

    return text
