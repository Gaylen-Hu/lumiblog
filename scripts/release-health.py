#!/usr/bin/env python3
"""Summarize the last 30 minutes of anonymous Nginx timings (active log plus rotation)."""
import collections
import math
from pathlib import Path
import time

cutoff = time.time() - 1800
groups = collections.defaultdict(list)
for name in ('myblog-health.log.1', 'myblog-health.log'):
    path = Path('/var/log/nginx') / name
    if not path.is_file():
        continue
    with path.open() as lines:
        for line in lines:
            parts = line.split()
            if len(parts) != 4:
                continue
            timestamp, host, status, elapsed = parts
            if float(timestamp) >= cutoff:
                groups[host].append((int(status), float(elapsed)))

for host, requests in sorted(groups.items()):
    errors = sum(status >= 500 for status, _ in requests)
    times = sorted(duration for _, duration in requests)
    print(f'{host} n={len(times)} 5xx={errors} 5xx_pct={100*errors/len(times):.2f} p95_ms={times[math.ceil(.95*len(times))-1]*1000:.0f}')
if not groups:
    print('No samples in the last 30 minutes')
