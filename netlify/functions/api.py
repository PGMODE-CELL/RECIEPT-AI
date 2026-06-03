import sys, os, warnings
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
warnings.filterwarnings("ignore")

from mangum import Mangum
from backend.main import app

handler = Mangum(app, lifespan="off")
