# worker.Dockerfile for the RQ workers (to be run on Compute Engine)

# Use the same base Python image for consistency.
FROM python:3.10-slim

# Set environment variables.
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory.
WORKDIR /app

# Copy and install dependencies.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the entire project context into the image.
# The workers need access to the application code and worker scripts.
COPY . .

# The CMD is intentionally left blank.
# We will specify the command to run (e.g., `alembic upgrade head` or `python analysis_worker.py`)
# when we launch the container on the VM.
