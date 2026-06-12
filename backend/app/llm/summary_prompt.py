from app.models.enums import Category

_CATEGORY_VALUES = [e.value for e in Category]

_FEW_SHOT = """\
### Example
Document: "This document covers the Unity Physics API including Rigidbody, Collider, \
and PhysicsMaterial. It lists all public methods and properties with usage examples."

Output:
{
  "category": "physics",
  "summary": "이 문서는 Unity 물리 엔진 API 레퍼런스로, Rigidbody·Collider·PhysicsMaterial의 \
공개 메서드와 속성을 정리합니다. 각 항목에 사용 예시가 포함되어 있어 물리 기반 게임 오브젝트 구현에 활용할 수 있습니다."
}
### End of Example
"""

_TEMPLATE = """\
You are an expert classifier and summarizer for game development documents.

{few_shot}

Now analyze the document below and respond ONLY with a single JSON object. \
No markdown fences, no explanation, just the raw JSON.

Output schema (use exactly these field names):
{{
  "category": "<one of: {category_values}>",
  "summary":    "<Korean summary, 3-5 sentences>"
}}

Classification rules:
- scripting        : C# code, API usage, MonoBehaviour, scripting runtime
- rendering        : Shaders, materials, cameras, lighting, URP/HDRP
- editor           : Editor extensions, custom inspectors, build settings, asset pipeline
- physics          : Rigidbody, colliders, joints, raycasting, collision detection
- math             : Vector, Quaternion, Matrix operations, interpolation
- ui               : uGUI, UI Toolkit, canvas, layout, RectTransform
- xr               : VR/AR, XR Interaction Toolkit, immersive experiences
- animation        : Animator, animation clips, Timeline, rigging, blend trees
- input            : Input System, keyboard/touch/gamepad input, action mapping
- performance      : Profiling, GC, memory, draw calls, optimization
- audio            : AudioSource, AudioClip, audio mixer, spatial sound
- networking       : Netcode, multiplayer, synchronization, RPC, transport

Document text (first {max_chars} characters):
{text}

JSON:"""


def build_summary_prompt(text: str, max_chars: int = 8000) -> str:
    return _TEMPLATE.format(
        few_shot=_FEW_SHOT,
        category_values=" | ".join(_CATEGORY_VALUES),
        max_chars=max_chars,
        text=text[:max_chars],
    )