import sys, os, warnings
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "huh", "backend"))
warnings.filterwarnings("ignore")

from mangum import Mangum
from main import app
handler = Mangum(app, lifespan="off")
