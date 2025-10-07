# 🚀 Debezium Real-Time Chat - CDC Learning Project

[![Hacktoberfest 2025](https://img.shields.io/badge/Hacktoberfest-2025-orange.svg)](https://hacktoberfest.com/participation/)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/) 
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Debezium](https://img.shields.io/badge/Debezium-CDC-red.svg)](https://debezium.io/)

> ⭐ **If you find this project helpful, please consider giving it a star!** It helps others discover this learning resource and motivates us to keep improving it. Thank you! ⭐

## 🎉 Participating in Hacktoberfest 2025!

This project is **officially participating** in [Hacktoberfest 2025](https://hacktoberfest.com/participation/)! 🚀

**What this means for contributors:**
- ✅ All valid PRs count towards your **6 accepted PRs** goal
- 🏆 Earn **digital badges** and exclusive **Hacktoberfest 2025 swag**
- 🌱 **TreeNation contribution** for every 6th accepted PR (making the world greener!)
- 🎯 Perfect for learning **Change Data Capture**, **Event-Driven Architecture**, and **Real-Time Data Streaming**

**Hacktoberfest 2025 Details:**
- 📅 **Registration**: September 15 - October 31, 2025
- 📅 **Contribution Period**: October 1 - October 31, 2025
- 🎯 **Goal**: 6 high-quality accepted PRs
- 🏆 **Rewards**: Digital badges, exclusive T-shirts, and tree contributions

## 🎓 Perfect for Learning Change Data Capture (CDC)!

This application is a **WebSocket-based FastAPI project** that demonstrates **real-time Change Data Capture (CDC)** using Debezium and Kafka. It's designed as an **educational resource** to help developers understand:

- 🔄 **Change Data Capture** fundamentals
- 📡 **Real-time data streaming** concepts  
- 🏗️ **Event-driven architecture** patterns
- 🔌 **WebSocket** implementations
- 📊 **Database replication** techniques

**Debezium** enables CDC to capture row-level changes in databases, allowing applications to respond to those changes instantly. This README provides installation, configuration, and usage details for the application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Debezium Configuration](#debezium-configuration)
- [Application Configuration](#application-configuration)
- [Usage](#usage)
- [Features](#features)
- [Project Structure](#project-structure)
- [Makefile Commands](#makefile-commands)
- [Documentation](#documentation)
- [License](#license)

## Prerequisites

- **Docker**: Required to run containers for the application and associated services.
- **Docker Compose**: Manages the multi-container environment.
- **Bruno API Client** (optional): Used for creating and managing requests to Debezium connectors.

## Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/AndrGab/debezium.git
   cd debezium
   ```

2. **Build and Run the Containers**:

   ```bash
   make build
   make up
   ```

   This builds the FastAPI application and starts PostgreSQL, Kafka, Zookeeper, Debezium Connect, and the FastAPI service, exposing configured ports for each service.

## Debezium Configuration

### 1. Change WAL Level in PostgreSQL

To enable logical replication, set the PostgreSQL Write-Ahead Logging (WAL) level to `logical`:

```sql
ALTER SYSTEM SET wal_level = logical;
```

**Restart the database contains after system changes**

Verify the WAL level:

```sql
SELECT * FROM pg_settings WHERE name = 'wal_level';
```

### 2. Create the `super_heroes` Table

Run the following SQL commands in PostgreSQL to set up the `super_heroes` table for CDC:

```sql
CREATE TABLE public.super_heroes (
    id serial4 NOT NULL,
    "name" varchar(255) NOT NULL,
    secret_identity varchar(255) NOT NULL,
    powers varchar(255) NOT NULL,
    CONSTRAINT super_heroes_pkey PRIMARY KEY (id)
);
```

Insert initial data:

```sql
INSERT INTO super_heroes ("name", secret_identity, powers)
    VALUES ('SuperMan', 'Clark Kent', 'flight, x-ray vision, strength, heat vision');
```

### 3. Set Replica Identity

Set the replica identity of the `super_heroes` table to `FULL` for Debezium to capture detailed row-level changes:

```sql
ALTER TABLE super_heroes REPLICA IDENTITY FULL;
```

### 4. Create the Debezium Source Connector

Use a POST request (0.0.0.0:8083/connectors) to create a source connector for the `super_heroes` table. You can use [Bruno](https://usebruno.com) or another API client to send the following JSON configuration:

```json
{
  "name": "source-connector-super-heroes",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "tester_db",
    "database.port": "5432",
    "database.user": "postgres",
    "database.password": "postgres",
    "database.dbname": "postgres",
    "database.server.name": "postgres",
    "table.include.list": "public.super_heroes",
    "plugin.name": "pgoutput",
    "slot.name": "slotheroes",
    "topic.prefix": "cdc-using-debezium-super-heroes"
  }
}
```

## Application Configuration

Key configurations are located in `app/settings.py` and `pyproject.toml`, including:

- **Kafka Host and Topic**: Ensures alignment with Debezium's Kafka topics.
- **Server Metadata**: Customizable in `pyproject.toml` for project name, version, and contact information.

## Usage

1. **Access the Application**:

   - Navigate to `http://localhost:8000` in your browser.
   - Each client receives a unique ID and connects to a WebSocket to receive real-time messages.

2. **WebSocket Messaging**:
   - Clients connect via `/ws/{client_id}`.
   - Database events (create, update, delete) trigger notifications across connected clients.

## Features

- **Real-Time Database Monitoring**: Listens for PostgreSQL changes via Kafka and broadcasts them.
- **WebSocket Notifications**: WebSocket connections distribute messages to all connected clients.
- **User Interface**: Messages display in a chat interface with styles indicating operation type.
- **Educational Focus**: Perfect for learning CDC, event-driven architecture, and real-time data streaming.

## 🎓 Learning Objectives

By working with this project, you'll gain hands-on experience with:

### 🔄 Change Data Capture (CDC)
- Understand how CDC captures database changes in real-time
- Learn about Debezium connectors and their configuration
- Practice with PostgreSQL logical replication

### 📡 Event-Driven Architecture
- Implement event-driven patterns using Kafka
- Learn about message brokers and event streaming
- Understand pub/sub messaging patterns

### 🔌 Real-Time Communication
- Build WebSocket connections for real-time updates
- Implement connection management and broadcasting
- Handle client disconnections and reconnections

### 🏗️ Microservices Architecture
- Separate concerns between database, message broker, and API
- Implement scalable, decoupled systems
- Learn containerization with Docker Compose

## 🎯 How to Contribute During Hacktoberfest 2025

### 📋 Getting Started
1. **Register** for [Hacktoberfest 2025](https://hacktoberfest.com/participation/) (Sept 15 - Oct 31)
2. **Fork** this repository
3. **Check** our [HACKTOBERFEST.md](HACKTOBERFEST.md) for available issues
4. **Pick** an issue labeled `hacktoberfest` or `good first issue`
5. **Make** your contribution between **October 1-31, 2025**

### 🏷️ Issue Labels to Look For
- `hacktoberfest` - Official Hacktoberfest issues
- `good first issue` - Perfect for beginners
- `help wanted` - Needs community attention
- `bug` - Issues that need fixing
- `enhancement` - New features to implement

### ✅ What Counts as Valid Contributions
- 🐛 **Bug fixes** and improvements
- ✨ **New features** and enhancements
- 📚 **Documentation** improvements
- 🎨 **UI/UX** enhancements
- 🧪 **Tests** and test coverage
- 🔧 **Code optimization** and refactoring

### 🚫 What Doesn't Count
- Spam or low-quality contributions
- Duplicate PRs
- Whitespace-only changes
- Generated files
- PRs without associated issues

### 🏆 Rewards for Contributors
- **Digital Badges**: Unlock badges for each accepted PR
- **Exclusive Swag**: T-shirts for "Super Contributors" (first 10,000)
- **Tree Contributions**: Every 6th PR helps plant trees via TreeNation
- **Learning**: Hands-on experience with modern technologies

## Project Structure

```plaintext
debezium-tester-app/
├── app/
│   ├── internal/
│   │   ├── consumer.py            # Kafka consumer handling
│   │   ├── connection_manager.py   # WebSocket connection manager
│   ├── routes/
│   │   ├── websockets.py           # WebSocket route definitions
│   ├── templates/
│   │   ├── index.html              # Frontend template
│   ├── static/
│   │   ├── script.js               # Client-side WebSocket logic
│   │   ├── styles.css              # UI styling
│   ├── main.py                     # Main FastAPI app entry
│   ├── settings.py                 # Application configurations
├── Dockerfile
├── docker-compose.yaml             # Docker services configuration
├── pyproject.toml                  # Project metadata
├── docs/                           # Documentation directory
│   ├── bruno_requests/             # Bruno requests for API interactions
│   └── queries/                    # Example SQL queries for PostgreSQL setup
```

## Makefile Commands

- **Build the Docker Image**: Builds the application Docker image.

  ```bash
  make build
  ```

- **Start Containers**: Launches the application and associated services in detached mode.

  ```bash
  make up
  ```

- **Run Linter**: Checks for code style issues and fixes them with `ruff`.

  ```bash
  make linter
  ```

- **Format Code**: Applies code formatting with `ruff`.
  ```bash
  make format
  ```

## Documentation

The `/docs` directory contains:

- **bruno_requests/**: A collection of example Bruno requests for setting up and testing Debezium connectors.
- **queries/**: Example SQL queries for configuring PostgreSQL, including table creation and WAL configuration.

These documents provide helpful resources for configuring the application environment and understanding its capabilities.

## 🌟 Contributors

<a href="https://github.com/andrgab/debezium/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=andrgab/debezium" alt="Contributors">
</a>


## License

This project is licensed under the MIT License.
