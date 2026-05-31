from setuptools import setup, find_packages

setup(
    name="receiptai-backend",
    version="1.0.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "fastapi>=0.115.0",
        "uvicorn[standard]>=0.30.0",
        "sqlalchemy>=2.0.0",
        "alembic>=1.13.0",
        "pydantic>=2.0.0",
        "python-jose[cryptography]>=3.3.0",
        "passlib[bcrypt]>=1.7.4",
        "python-multipart>=0.0.9",
        "python-dotenv>=1.0.0",
        "cryptography>=42.0.0",
        "slowapi>=0.1.9",
        "stripe>=7.0.0",
        "pyotp>=2.9.0",
        "apscheduler>=3.10.0",
        "httpx>=0.27.0",
        "aiofiles>=23.0.0",
        "jinja2>=3.1.0",
    ],
    entry_points={
        "console_scripts": [
            "receiptai=app.cli:main",
        ],
    },
    python_requires=">=3.12",
    author="ReceiptAI",
    description="ReceiptAI backend — accounting & invoicing platform",
    license="MIT",
)
