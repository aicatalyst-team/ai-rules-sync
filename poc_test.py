#!/usr/bin/env python3
"""PoC Test Script for ai-rules-sync on OpenShift"""
import json, sys, time, urllib.request, urllib.error

SERVICE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://ai-rules-sync.poc-ai-rules-sync.svc.cluster.local:8080"
results = []

def test(name, desc, fn):
    start = time.time()
    try:
        result = fn()
        dur = time.time() - start
        results.append({"scenario_name": name, "status": "pass", "output": str(result)[:500], "error_message": None, "duration_seconds": round(dur, 2)})
        print(f"PASS: {name} ({dur:.1f}s)")
    except Exception as e:
        dur = time.time() - start
        results.append({"scenario_name": name, "status": "fail", "output": "", "error_message": str(e)[:500], "duration_seconds": round(dur, 2)})
        print(f"FAIL: {name}: {e}")

def http_get(path, timeout=30):
    req = urllib.request.Request(f"{SERVICE_URL}{path}")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8"), resp.status

def test_playground():
    body, status = http_get("/web/index.html")
    assert status == 200
    assert "agentsync" in body.lower() or "html" in body.lower()
    return f"Status: {status}, Length: {len(body)}"

def test_core_lib():
    body, status = http_get("/src/core/agentsync.js")
    assert status == 200
    assert "function" in body or "export" in body
    return f"Status: {status}, Length: {len(body)}"

def test_css():
    body, status = http_get("/web/style.css")
    assert status == 200
    return f"Status: {status}, CSS loaded"

test("playground-html", "Web playground loads", test_playground)
test("core-library", "Core JS library loads", test_core_lib)
test("playground-css", "Stylesheet loads", test_css)

passed = sum(1 for r in results if r["status"] == "pass")
print(f"\nPassed: {passed}/{len(results)}")
print("\n--- JSON RESULTS ---")
print(json.dumps(results, indent=2))
