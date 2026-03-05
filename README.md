# HomePedia 🏠

> Transforming the French real estate industry through Big Data, AI, and interactive visualization.

HomePedia is an advanced real estate market analysis application for France. It aggregates, processes, and visualizes property data, demographic statistics, and community sentiment to empower buyers, investors, and analysts with actionable insights.

---

## 🎯 Project Goals

HomePedia aims to **transform the real estate industry** by:

- Collecting and centralizing multi-source real estate and demographic data across French communes.
- Applying AI-powered sentiment analysis on community reviews to surface qualitative insights.
- Delivering an interactive, map-driven dashboard that makes complex data accessible to everyone.

---

## 🏗️ Architecture Overview

The application is built on a **Big Data** architecture combining batch processing, hybrid storage, and an interactive front end:

```
[Web Scraping] ──► [Landing Zone: MongoDB] ──► [Spark Processing] ──► [PostgreSQL]
                                                       │
                                              [AI Sentiment Analysis]
                                                       │
                                          [Streamlit Dashboard + Mapbox]
```

---

## 🛠️ Technologies

| Layer | Technology | Role |
|---|---|---|
| **Data Collection** | Python · BeautifulSoup · ThreadPoolExecutor | Multi-threaded web scraping |
| **NoSQL Storage** | **MongoDB** | Raw data & textual reviews (Landing Zone) |
| **Relational Storage** | **PostgreSQL** | Structured, standardized metrics |
| **Big Data Processing** | **Apache Spark** · **Hadoop** | Distributed data processing & storage |
| **AI / NLP** | Transformers / VADER | Sentiment analysis & Word Cloud generation |
| **Visualization** | **Streamlit** | Interactive web dashboard |
| **Mapping** | **Mapbox** / Leaflet | Choropleth maps & heat maps |

---

## 📦 Modules

### 1. Multi-threaded Scraping & NoSQL Landing Zone
- Scrapes real estate and community data from public sources (e.g., bien-dans-ma-ville.fr).
- Uses `BeautifulSoup` with `ThreadPoolExecutor` for high-performance parallel scraping.
- Stores raw records and textual reviews in **MongoDB** (schema-flexible, non-tabular data).
- Implements User-Agent rotation for robust, uninterrupted collection.

### 2. SQL Pipeline & Relational Standardization
- Transforms and loads cleansed numeric data into **PostgreSQL**.
- Uses batch update scripts (`execute_batch`) to populate the `v_commune_2023` table.
- Standardizes key metrics: population, average age, active population, and more.

### 3. AI Sentiment Analysis & NLP
- Analyses community reviews stored in MongoDB using NLP models.
- Generates sentiment scores (positive / neutral / negative) per commune.
- Produces Word Cloud datasets covering topics such as safety, quality of life, and amenities.

### 4. Interactive Dashboard (Streamlit + Mapbox)
- **Choropleth & heat maps** at city, department, and region level via Mapbox or Leaflet.
- **Customizable filters** by city, department, and region.
- **Global indicators** and statistical charts (price trends, demographic breakdowns, sentiment scores).

---

## 🗺️ Project Milestones

| Milestone | Focus |
|---|---|
| **Milestone 1** – Data Architecture & Scraping | Data collection and hybrid storage (MongoDB + PostgreSQL) |
| **Milestone 2** – Big Data Processing & AI | Spark processing and AI sentiment analysis |
| **Milestone 3** – Data Visualization & UI | Streamlit dashboard and interactive Mapbox maps |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Docker & Docker Compose (for Hadoop/Spark cluster, MongoDB, PostgreSQL)
- A Mapbox API key

### Installation

```bash
# Clone the repository
git clone https://github.com/HomePedia-EPTITECH/HomePedia.git
cd HomePedia

# Install Python dependencies
pip install -r requirements.txt

# Start infrastructure services
docker-compose up -d
```

### Running the Dashboard

```bash
streamlit run app/dashboard.py
```

---

## 📁 Repository Structure

```
HomePedia/
├── Docs/                  # Project documentation & specifications
├── scraping/              # Web scraping module (BeautifulSoup + ThreadPoolExecutor)
├── ingestion/             # MongoDB landing zone ingestion scripts
├── pipeline/              # PostgreSQL batch pipeline & SQL scripts
├── processing/            # Apache Spark jobs (Hadoop integration)
├── ai/                    # NLP sentiment analysis & Word Cloud generation
├── app/                   # Streamlit dashboard
│   └── dashboard.py
├── docker-compose.yml     # Infrastructure orchestration
├── requirements.txt       # Python dependencies
└── README.md
```

---

## 📄 License

This project is developed as part of the **Epitech** curriculum. All rights reserved.
