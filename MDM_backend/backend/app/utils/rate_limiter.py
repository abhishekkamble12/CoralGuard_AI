import time
from collections import defaultdict, deque


class InMemoryRateLimiter:
    def __init__(self, limit_per_minute: int) -> None:
        self.limit = limit_per_minute
        self.requests = defaultdict(deque)

    def allowed(self, key: str) -> bool:
        now = time.time()
        window = 60
        queue = self.requests[key]
        while queue and now - queue[0] > window:
            queue.popleft()
        if len(queue) >= self.limit:
            return False
        queue.append(now)
        return True
