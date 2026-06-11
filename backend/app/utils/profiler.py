# 리소스 사용량 검사

from contextlib import asynccontextmanager
import psutil
import os
import time

@asynccontextmanager
async def profile(label: str):
    process = psutil.Process(os.getpid())
    ram_before = process.memory_info().rss / 1024 / 1024
    cpu_before = process.cpu_percent(interval=None)
    start = time.time()

    ctx = {}
    yield ctx

    ram_after = process.memory_info().rss / 1024 / 1024
    cpu_after = process.cpu_percent(interval=None)
    print(f"\n{'='*60}")
    print(f"[{label}]")
    print(f"  소요 시간: {time.time() - start:.2f}초")
    print(f"  CPU 사용률: {cpu_after:.1f}%")
    print(f"  RAM 사용량: {ram_after:.1f}MB (변화: {ram_after - ram_before:+.1f}MB)")
    if ctx.get("extra"):
        print(f"  {ctx['extra']}")
    print(f"{'='*60}")