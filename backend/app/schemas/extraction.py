from dataclasses import dataclass, field
from enum import Enum


class ExtractionMethod(str, Enum):
    NATIVE = "native"
    PADDLE = "paddle"
    SURYA = "surya"


@dataclass
class PageResult:
    page_number: int
    text: str
    method: ExtractionMethod
    quality_score: float


@dataclass
class DocumentExtractionResult:
    file_path: str
    pages: list[PageResult] = field(default_factory=list)

    @property
    def full_text(self) -> str:
        return "\n\n".join(p.text for p in self.pages if p.text.strip())
