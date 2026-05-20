# Use a Python 3.11 image with uv pre-installed for the builder stage
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS builder

# Set environment variables for uv to compile bytecode, copy links, and use system python
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_PREFERENCE=only-system

WORKDIR /app

# Copy lock and project files first to leverage Docker layer caching
COPY uv.lock pyproject.toml /app/

# Install dependencies (without installing the project itself)
RUN uv sync --frozen --no-install-project --no-dev

# Copy application files and build the project
COPY . /app
RUN uv sync --frozen --no-dev

# Use a matching Python 3.11 slim base image for production
FROM python:3.11-slim-bookworm

WORKDIR /app

# Copy the built application and virtual environment from builder
COPY --from=builder /app /app

# Prepend the virtual environment's bin directory to PATH
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

# Expose port 8080 (Google Cloud Run default port)
EXPOSE 8080

# Run the FastAPI application using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
