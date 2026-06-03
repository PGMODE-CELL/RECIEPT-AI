import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "huh", "backend"))

from mangum import Mangum
from huh.backend.main import app
handler = Mangum(app)
