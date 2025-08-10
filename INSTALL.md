# Installation & Local Setup

Follow these steps to get your local development environment for FraudCheck.ai running.

---

## Prerequisites

* Python 3.10+
* Docker & Docker Compose
* A Google Cloud Platform account with the following APIs enabled:
    * Google Maps Platform (Geocoding, Places, Maps JavaScript)
    * Google Generative AI (Gemini)
    * Custom Search API

---

## Installation & Setup

1.  **Clone the repository**
    ```sh
    git clone [https://github.com/joan266/listing-fraud-check-ai.git](https://github.com/joan266/listing-fraud-check-ai.git)
    cd listing-fraud-check-ai
    ```

2.  **Create and activate a virtual environment**
    ```sh
    python -m venv venv
    source venv/bin/activate
    # On Windows, use: venv\Scripts\activate
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
    * Edit the `.env` file and add your `GOOGLE_API_KEY`, `GOOGLE_GEMINI_API_KEY`, and other credentials. This file is pre-configured to use a local SQLite database for easy setup.

---

## Running the Application

For a full development environment, you will need to run the services in separate terminals.

1.  **Terminal 1: Start Redis**
    This command starts a Redis container in the background, which is required for the task queue.
    ```sh
    docker run -d -p 6379:6379 --name fraudcheck-redis redis
    ```

2.  **Terminal 2: Start the FastAPI Server**
    This runs the main web application. The database (`fraudcheck.db`) will be created automatically the first time you run this.
    ```sh
    uvicorn app.main:app --reload
    ```
    The API will be available at `http://127.0.0.1:8000`. You can view the interactive API docs at `http://127.0.0.1:8000/api/v1/docs`.

3.  **Terminal 3 & 4: Start the RQ Workers**
    These processes will listen for and execute the background analysis jobs. You need to run at least one worker for each queue type.
    ```sh
    # In Terminal 3 (for fast jobs)
    python analysis_worker.py
    ```
    ```sh
    # In Terminal 4 (for heavy jobs like image analysis)
    # Note: The same script listens to both queues. You can run multiple instances.
    python analysis_worker.py
    ```

4.  **Terminal 5: Start the Frontend**
    This command starts the React development server.
    ```sh
    cd frontend
    npm install
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.

5.  **Terminal 6: Start the Monitoring Dashboard (Optional)**
    This allows you to see the status of your background jobs in a web browser.
    ```sh
    rq-dashboard
    ```
    The dashboard will be available at `http://localhost:9181`.