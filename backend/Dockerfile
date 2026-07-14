FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Run model preloader to cache all-MiniLM-L6-v2 in the image
COPY preload_models.py ./
RUN python preload_models.py

# Copy the rest of the application (including local models/ directory)
COPY . .

EXPOSE 8000

# Use sh -c so Railway's $PORT env variable is properly shell-expanded at runtime
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
