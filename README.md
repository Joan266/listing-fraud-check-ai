# FraudCheck.ai MVP 🕵️‍♂️

An AI-powered web application to help travelers detect and avoid online rental fraud.

## About The Project

This project is the backend service for the FraudCheck.ai MVP. Its purpose is to provide an API that can analyze rental listing details to identify potential red flags associated with common scams. The core value is to provide travelers with a quick, AI-powered "second opinion" for peace of mind.

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

For a full development environment, you will need to run the services in separate terminals.

1.  **Terminal 1: Start Redis**
    This command starts a Redis container in the background.
    ```sh
    docker run -d -p 6379:6379 --name fraudcheck-redis redis
    ```

2.  **Terminal 2: Start the FastAPI Server**
    This runs the main web application. The database will be created automatically the first time you run this.
    ```sh
    uvicorn app.main:app --reload
    ```
    The API will be available at `http://127.0.0.1:8000`.

3.  **Terminal 3 & 4: Start the RQ Workers**
    These processes will listen for and execute background jobs.
    ```sh
    # In Terminal 3
    python analysis_worker.py

    # In Terminal 4
    python chat_worker.py
    ```

4.  **Terminal 5: Start the Monitoring Dashboard (Optional)**
    This allows you to see the status of your jobs in a web browser.
    ```sh
    rq-dashboard
    ```
    The dashboard will be available at `http://localhost:9181`.

---

## API Endpoints

The primary endpoints are:

* `POST /extract-data`: Handles the initial text paste to extract listing data.
* `POST /analysis`: Starts the full fraud analysis pipeline.
* `GET /analysis/{check_id}`: Polls for the status and result of an analysis.
* `POST /chat`: Handles post-analysis follow-up questions.

You can interact with all endpoints via the interactive docs at **`http://127.0.0.1:8000/docs`**.