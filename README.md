CSV Data Importer and Age Group Analyzer API
This project implements a robust backend service using Node.js (Express.js) and PostgreSQL to handle custom CSV data conversion into nested JSON objects, store the data, and generate a real-time age distribution analysis report.

🚀 Key Features
Custom CSV Parsing: Parses CSV files without relying on third-party csv-to-json packages.
Nested JSON Conversion: Converts dot-separated CSV headers (e.g., name.firstName, address.city) into nested JSON structures.
PostgreSQL Mapping: Maps processed data to structured tables using JSONB columns (address, additional_info) for complex or optional properties.
Transactional Bulk Import: Ensures data integrity during large imports using PostgreSQL transactions.
Age Distribution Report: Calculates and prints age distribution (< 20, 20-40, 40-60, > 60) directly to the console upon import.
Environment Configuration: Reads CSV file path and database credentials from .env.

🛠️ Tech Stack
Runtime: Node.js
Framework: Express.js
Database: PostgreSQL (pg library)
Configuration: dotenv
Data Handling: Node fs module

⚙️ Setup and Installation

Prerequisites
Node.js v18+ and npm
PostgreSQL server running locally (via Homebrew, Docker, or native installation)
1. Clone the Repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
2. Install Dependencies
npm install express pg dotenv
3. Database Setup

A. Create Database and User
Connect to PostgreSQL and run:
CREATE USER csv_user WITH PASSWORD 'secretpassword';
CREATE DATABASE csv_importer_db WITH OWNER csv_user;

B. Create users Table
CREATE TABLE public.users (
    id serial4 NOT NULL,
    "name" varchar NOT NULL,      -- Concatenation of name.firstName + name.lastName
    age int4 NULL,                -- Mapped from age
    address jsonb NULL,           -- Mapped from address.*
    additional_info jsonb NULL,   -- Mapped from remaining properties (gender, contact.*, etc.)
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Grant privileges
GRANT ALL PRIVILEGES ON TABLE users TO csv_user;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO csv_user;

4. Configuration (.env)
Create a .env file in the project root:

# Database Credentials
PGUSER=csv_user
PGPASSWORD=secretpassword
PGDATABASE=csv_importer_db
PGHOST=localhost
PGPORT=5432

# Application Configuration
PORT=3000
CSV_FILE_PATH=./users.csv
5. Add CSV Data
Example users.csv:
name.firstName,name.lastName,age,address.line1,address.city,gender,is_active
Amit,Sharma,38,101 Cloud Tower,Bangalore,male,true
Priya,Verma,25,2B Ocean View,Mumbai,female,true
Ravi,Kumar,19,5 Star Street,Delhi,male,true
Sneha,Patel,42,12 Palm Lane,Chennai,female,true
Anil,Joshi,65,88 Lake Road,Kolkata,male,true
Neha,Mehta,28,77 River Drive,Pune,female,true

Running the Application

1. Start the Server
node index.js
Server will confirm database connection and the listening port.

2. Trigger the CSV Import
Use Postman, Insomnia, or curl:
Method: POST
URL: http://localhost:3000/process-csv
Body: Empty JSON {}

--- Age Distribution Report ---
Total Records: 6
Age-Group               % Distribution
--------------------------------
< 20                    16.67
20 to 40                50.00
40 to 60                16.67
> 60                    16.67
--------------------------------
