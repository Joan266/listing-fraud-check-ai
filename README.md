# FraudCheck.ai MVP 🕵️‍♂️

An AI-powered web application to help travelers detect and avoid online rental fraud.

## About The Project

This project is the backend service for the FraudCheck.ai MVP. Its purpose is to provide an API that can analyze rental listing details (address, images, description) to identify potential red flags associated with common online scams. The core value is to provide travelers with a quick, AI-powered "second opinion" for peace of mind and financial protection.

### Built With

* [Python](https://www.python.org/)
* [FastAPI](https://fastapi.tiangolo.com/)
* [Redis](https://redis.io/) & [RQ (Redis Queue)](https://python-rq.org/)
* [SQLAlchemy](https://www.sqlalchemy.org/)
* [Google Maps Platform APIs](https://mapsplatform.google.com/)

---

## Getting Started

Follow these steps to get your local development environment running.

### Prerequisites

* Python 3.10+
* Docker (for running Redis easily)
* A Google Cloud Platform account with the Maps Platform APIs enabled.

### Installation & Setup

1.  **Clone the repository**
    ```sh
    git clone [https://github.com/your_username/your_repository_name.git](https://github.com/your_username/your_repository_name.git)
    cd your_repository_name
    ```

2.  **Create and activate a virtual environment**
    ```sh
    python -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies**
    ```sh
    pip install -r requirements.txt
    ```

4.  **Set up your environment variables**
    * Copy the example file:
        ```sh
        cp .env.example .env
        ```
    * Edit the `.env` file and add your `GOOGLE_API_KEY`.

### Running the Application

You'll need to run three separate services in three different terminals.

1.  **Terminal 1: Start Redis**
    ```sh
    docker run -d -p 6379:6379 --name fraudcheck-redis redis
    ```

2.  **Terminal 2: Start the RQ Worker**
    ```sh
    python worker.py
    ```

3.  **Terminal 3: Start the FastAPI Server**
    ```sh
    uvicorn app.main:app --reload
    ```
The API will be available at `http://127.0.0.1:8000`.

---
## Usage

You can test the address validation endpoint using `curl`:

1.  **Submit a job:**
    ```sh
    curl -X POST "[http://127.0.0.1:8000/api/v1/checks](http://127.0.0.1:8000/api/v1/checks)" \
    -H "Content-Type: application/json" \
    -d '{
      "address": "Plaça de Catalunya, 1, 08002 Barcelona, Spain"
    }'
    ```
    This will return a `job_id`.

2.  **Poll for the result:**
    ```sh
    # Replace YOUR_JOB_ID with the one you received
    curl [http://127.0.0.1:8000/api/v1/checks/YOUR_JOB_ID](http://127.0.0.1:8000/api/v1/checks/YOUR_JOB_ID)
    ```