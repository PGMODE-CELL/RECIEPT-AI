import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "huh", "backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import warnings
warnings.filterwarnings("ignore")

from mangum import Mangum
from huh.backend.main import app
handler = Mangum(app, lifespan="off")
