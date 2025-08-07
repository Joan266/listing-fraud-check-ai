# Dockerfile para la API de backend (para ejecutarse en Cloud Run)

# Usa una imagen oficial de Python como imagen base.
FROM python:3.10-slim

# Establece variables de entorno para Python.
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Establece el directorio de trabajo.
WORKDIR /app

# Copia e instala las dependencias. Esta es una capa separada para aprovechar el almacenamiento en caché de Docker.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia el código de tu aplicación y los archivos de Alembic.
COPY ./app /app/app

# Define el comando para ejecutar la aplicación usando gunicorn.
# Esta es la forma "shell" que permite que la variable $PORT se reemplace correctamente.
CMD exec gunicorn -k uvicorn.workers.UvicornWorker -w 2 --timeout 120 --bind "0.0.0.0:${PORT}" app.main:app
