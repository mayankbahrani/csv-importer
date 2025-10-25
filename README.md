CSV Data Importer and Age Group Analyzer API
This project implements a robust backend service using Node.js (Express.js) and PostgreSQL to handle the custom conversion of CSV data (including nested/complex properties via dot notation) into nested JSON objects, store the data, and generate a real-time age distribution analysis report.

Key Features
Custom CSV Parsing: Implements custom logic to parse CSV files without reliance on third-party csv-to-json packages.

Nested JSON Conversion: Converts dot-separated CSV headers (e.g., name.firstName, address.city) into a nested JSON structure.

PostgreSQL Mapping: Maps the processed data to a structured table, utilizing JSONB columns (address, additional_info) for storing complex and non-mandatory properties.

Transactional Bulk Import: Uses a PostgreSQL transaction to ensure data integrity during the import of large files.

Age Distribution Report: Calculates and prints the required age distribution report (< 20, 20-40, 40-60, > 60) directly to the console upon successful import.

Configuration: Reads the CSV file path from the environment configuration (.env).

🛠️ Tech Stack
Runtime: Node.js

Framework: Express.js

Database: PostgreSQL (pg library)

Configuration: dotenv

Data Handling: fs (Node built-in for file reading)

⚙️ Setup and Installation
Follow these steps to get the project running on your local machine.

Prerequisites

Node.js (v18+) and npm

PostgreSQL server running locally (e.g., managed via Homebrew or Docker)

1. Clone the Repository

Bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
2. Install Dependencies

Bash
npm install express pg dotenv
3. Database Setup

You need to create the database and the required table structure.

A. Create Database and User

Connect to your PostgreSQL server (e.g., via psql or a GUI tool) and create the necessary credentials.

SQL
CREATE USER csv_user WITH PASSWORD 'secretpassword';
CREATE DATABASE csv_importer_db WITH OWNER csv_user;
B. Create the users Table

Connect to csv_importer_db and execute the following schema definition. Note the use of jsonb for complex properties.

SQL
CREATE TABLE public.users (
    id serial4 NOT NULL,
    "name" varchar NOT NULL,      -- Mapped from name.firstName + name.lastName
    age int4 NULL,                -- Mapped from age
    address jsonb NULL,           -- Mapped from address.*
    additional_info jsonb NULL,   -- Mapped from all remaining properties (gender, contact.*, etc.)
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Grant privileges to your application user
GRANT ALL PRIVILEGES ON TABLE users TO csv_user;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO csv_user;
4. Configuration (.env)

Create a file named .env in the root of the project and populate it with your credentials and the CSV file path.

Code snippet
# Database Credentials
PGUSER=csv_user
PGPASSWORD=secretpassword
PGDATABASE=csv_importer_db
PGHOST=localhost
PGPORT=5432

# Application Configuration
PORT=3000
CSV_FILE_PATH=./users.csv  # Path to the CSV file to be imported
5. Add CSV Data

Ensure you have a CSV file (e.g., users.csv) in your project root with the required structure:

Code snippet
name.firstName,name.lastName,age,address.line1,address.city,gender,is_active
Amit,Sharma,38,101 Cloud Tower,Bangalore,male,true
Priya,Verma,25,2B Ocean View,Mumbai,female,true
🏃 Running the Application
1. Start the Server

Bash
node index.js
The console will confirm the database connection and server port.

2. Trigger the Import

Use Postman, Insomnia, or curl to send a POST request to the processing endpoint. No file upload is necessary, as the server reads the path from the .env file.

Method: POST

URL: http://localhost:3000/process-csv

Body: (Can be empty JSON {})
