# FraudCheck.ai MVP 🕵️‍♂️

An AI-powered web application to help travelers detect and avoid online rental fraud, built for the Google Maps Platform Awards hackathon.

---

## 🚀 Live Demo & Video Walkthrough

* **Live Application**: [https://safelease-23cf0.web.app/](https://safelease-23cf0.web.app/)

---

## About The Project

FraudCheck.ai is an intelligent tool designed to give travelers peace of mind. By pasting a rental listing, users can initiate a comprehensive forensic analysis that leverages AI and Google Maps Platform services to identify common red flags associated with online scams. Our mission is to make the online rental market safer by providing a powerful, easy-to-use "second opinion" on any listing.

### How It Works

The user's journey is simple, but powered by a sophisticated backend:

1.  **Paste & Extract**: A user pastes the full text of a rental listing. An AI model then intelligently extracts key data points like the address, price, and host details.
2.  **Verify & Edit**: The user is presented with the extracted information and an interactive map to verify the address. They can drag the pin on the map to correct the location, which uses the **Geocoding API** to get the precise address.
3.  **Full Analysis**: Once confirmed, a series of parallel background jobs perform a deep analysis, including:
    * **Location Analysis**: Using the **Places API** and **Geocoding API** to validate the address and analyze the neighborhood.
    * **Image Forensics**: Reverse image searches and AI detection to check for stolen or AI-generated photos.
    * **Price Sanity Check**: An AI model evaluates if the price is reasonable for the location.
    * **Reputation Analysis**: Searching the web for negative feedback associated with the host.
4.  **View Results**: The user receives a comprehensive report with an **Authenticity Score**, a detailed explanation of all findings, and an interactive map displaying the verified location.
5.  **Ask Questions**: The user can ask follow-up questions about the report in a chat interface.

---

## Google Maps Platform Integration

The Google Maps Platform is the backbone of our location intelligence and a critical component of our fraud detection capabilities.

* **Geocoding API**: This is the first and most critical step. We use it to:
    * **Validate the Address**: Confirm that the listing's address is a real, locatable place.
    * **Correct User Input**: Allow users to visually confirm and correct the location on a map, with reverse geocoding providing the updated, accurate address.
    * **Standardize Location Data**: Convert any address into a standardized format with coordinates for other analysis steps.

* **Places API**: We use this to enrich our understanding of the listing's location by:
    * **Gathering Neighborhood Context**: Performing "Nearby Searches" for essential amenities like supermarkets, parks, and transit stations.
    * **Fetching Place Details**: Retrieving rich details like public ratings and reviews, which are compared against the listing for inconsistencies.

* **Maps JavaScript API**: This provides the interactive map experience central to the user's verification process. We use it to:
    * **Visualize the Location**: Display a clear, interactive map with a draggable marker.
    * **Display Neighborhood Data**: Show the locations of nearby amenities found with the Places API.
    * **Enhance User Experience**: Provide a dark mode map style to match the application's theme.

---

## Architecture and Technology Stack



* **Frontend**: React, Redux, Tailwind CSS
* **Backend**: FastAPI (Python)
* **Database**: PostgreSQL (on Google Cloud SQL)
* **Task Queue**: Redis & RQ (Redis Queue)
* **AI & Machine Learning**: Google Generative AI (Gemini)
* **Deployment**:
    * **API**: Google Cloud Run
    * **Workers**: Google Compute Engine
    * **Frontend**: Firebase Hosting

---

## Setup Instructions

For detailed local setup and installation instructions, please see the **[INSTALL.md](INSTALL.md)** file.

---

## Key Features

* **AI-Powered Data Extraction**: Intelligently parses unstructured listing text.
* **Interactive Location Verification**: Allows users to visually confirm and correct the property's address.
* **Multi-Layered Fraud Analysis**: A comprehensive suite of checks that go beyond a simple web search.
* **Interactive and Detailed Reporting**: Presents results in an easy-to-understand dashboard with scores and actionable recommendations.
* **Conversational Q&A**: An AI-powered chat assistant to help users understand their results.