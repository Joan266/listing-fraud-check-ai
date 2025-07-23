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
* [Google Cloud Vision](https://cloud.google.com/vision)
* [Google Generative AI (Gemini)](https://ai.google.dev/)

---

## Getting Started

Follow these steps to get your local development environment running.

### Prerequisites

* Python 3.10+
* Docker (for running Redis easily)
* A Google Cloud Platform account with the required APIs enabled.

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
    * Edit the `.env` file and add your `GOOGLE_API_KEY` and other credentials.

---

### Running the Application

You'll need to run four separate services in four different terminals for the full development environment.

1.  **Terminal 1: Start Redis**
    ```sh
    docker run -d -p 6379:6379 --name fraudcheck-redis redis
    ```

2.  **Terminal 2: Start the Analysis Worker**
    *(This worker handles all the heavy and fast analysis tasks.)*
    ```sh
    python analysis_worker.py
    ```

3.  **Terminal 3: Start the Chat Worker**
    *(This worker handles real-time chat functionality.)*
    ```sh
    python chat_worker.py
    ```

4.  **Terminal 4: Start the FastAPI Server**
    ```sh
    uvicorn app.main:app --reload
    ```
The API will be available at `http://127.0.0.1:8000`.

---

### Monitoring Background Jobs

To monitor the status of your queues and jobs, run the RQ Dashboard in a separate terminal:
```sh
rq-dashboard