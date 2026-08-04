import asyncio
import time
import httpx

FASTAPI_URL = "http://localhost:5000/health"

async def benchmark_endpoint(url: str, requests_count: int = 100):
    print(f"\n[BENCHMARK] Running {requests_count} async GET requests against: {url}")
    start_time = time.perf_counter()
    
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for _ in range(requests_count)]
        responses = await asyncio.gather(*tasks)

    duration = time.perf_counter() - start_time
    successful = sum(1 for r in responses if r.status_code == 200)
    rps = requests_count / duration
    avg_latency_ms = (duration / requests_count) * 1000

    print(f"  ➜ Total Time: {duration:.4f}s")
    print(f"  ➜ Successful: {successful}/{requests_count}")
    print(f"  ➜ Throughput: {rps:.2f} Requests/sec")
    print(f"  ➜ Avg Latency: {avg_latency_ms:.2f} ms")

if __name__ == "__main__":
    try:
        asyncio.run(benchmark_endpoint(FASTAPI_URL, 100))
    except Exception as e:
        print(f"Benchmark error (ensure FastAPI server is running): {e}")
