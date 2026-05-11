"""
Dummy Celery app to prevent import errors and NameErrors
since we migrated to the internal FastAPI router.
"""

class DummyTask:
    def __init__(self, *args, **kwargs):
        pass
    def __call__(self, fn):
        return fn

class DummyConf:
    def __init__(self):
        self.beat_schedule = {}
    def update(self, *args, **kwargs):
        pass

class DummyCelery:
    def __init__(self, *args, **kwargs):
        self.conf = DummyConf()
        
    def task(self, *args, **kwargs):
        # If the decorator is called without parens: @celery_app.task
        if len(args) == 1 and callable(args[0]):
            return args[0]
        # If called with parens: @celery_app.task(...)
        return DummyTask()

celery_app = DummyCelery()
