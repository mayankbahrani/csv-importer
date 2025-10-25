const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool();

pool.connect((err, client, release) => {
    if (err) {
        process.stdout.write(`\nERROR: Failed to connect to PostgreSQL. Check .env and server status.\n${err.stack}\n`);
        process.exit(1);
    }
    console.log('Successfully connected to PostgreSQL!');
    release();
});

const transformRecord = (record) => {
    const json = {};
    for (const key in record) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) continue;

        const value = record[key];
        const parts = key.split('.');
        let current = json;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (i === parts.length - 1) {
                current[part] = value;
            } else {
                if (!current[part] || typeof current[part] !== 'object') {
                    current[part] = {};
                }
                current = current[part];
            }
        }
    }
    return json;
};

const mapToPostgresSchema = (jsonObject) => {
    const { name, age, address, ...additional_info_fields } = jsonObject;

    let parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0) {
        parsedAge = 0;
    }

    const fullName = `${name?.firstName || ''} ${name?.lastName || ''}`.trim();
    const finalName = fullName.length > 0 ? fullName : 'Unknown User';

    const pgData = {
        name: finalName,
        age: parsedAge,
        address: address && Object.keys(address).length > 0 ? JSON.stringify(address) : null,
    };

    const additionalInfo = { ...additional_info_fields };

    pgData.additional_info = Object.keys(additionalInfo).length > 0
        ? JSON.stringify(additionalInfo)
        : null;

    return pgData;
};

async function generateAgeReport() {
    const queryText = `
        SELECT
            CASE
                WHEN age < 20 THEN '< 20'
                WHEN age >= 20 AND age <= 40 THEN '20 to 40'
                WHEN age > 40 AND age <= 60 THEN '40 to 60'
                ELSE '> 60'
            END AS "Age-Group",
            COUNT(*)::int AS count
        FROM users
        WHERE age IS NOT NULL
        GROUP BY 1
        ORDER BY min(age);
    `;

    try {
        const { rows: totalRows } = await pool.query('SELECT COUNT(*) AS total FROM users');
        const totalUsers = totalRows[0].total;

        if (totalUsers === '0') {
             console.log('\n--- Age Distribution Report ---\nNo records found to analyze.\n-------------------------------\n');
             return;
        }

        const { rows: distributionRows } = await pool.query(queryText);

        console.log('\n--- Age Distribution Report ---');
        console.log('Total Records:', totalUsers);
        console.log('Age-Group\t\t% Distribution');
        console.log('--------------------------------');

        distributionRows.forEach(row => {
            const percentage = ((row.count / totalUsers) * 100).toFixed(2);
            process.stdout.write(`${row["Age-Group"].padEnd(15)}\t${percentage}\n`);
        });
        console.log('--------------------------------\n');

    } catch (err) {
        console.error('Failed to generate Age Report:', err.message);
    }
}


app.post('/process-csv', async (req, res) => {
    const filePath = process.env.CSV_FILE_PATH;

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(500).json({ error: 'Configuration Error: CSV_FILE_PATH not set in .env or file not found.' });
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.trim().split('\n');

        if (lines.length < 2) {
            return res.status(400).json({ message: 'CSV file is empty or missing data rows.' });
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const records = lines.slice(1);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let insertCount = 0;
            for (const recordLine of records) {
                const values = recordLine.split(',').map(v => v.trim());

                const flatRecord = headers.reduce((obj, header, index) => {
                    if (values[index] !== undefined) {
                        obj[header] = values[index];
                    }
                    return obj;
                }, {});

                const nestedJson = transformRecord(flatRecord);
                const pgData = mapToPostgresSchema(nestedJson);

                try {
                    const queryText = `
                        INSERT INTO users (name, age, address, additional_info)
                        VALUES ($1, $2, $3::jsonb, $4::jsonb)
                    `;
                    await client.query(queryText, [
                        pgData.name,
                        pgData.age,
                        pgData.address,
                        pgData.additional_info
                    ]);

                    insertCount++;
                } catch (insertError) {
                    process.stdout.write(`\nFAILED to insert record #${insertCount + 1} (Line: ${insertCount + 2} in CSV):\n`);
                    process.stdout.write(`Raw CSV Line: ${recordLine}\n`);
                    process.stdout.write(`Mapped Data (age, name): ${pgData.age}, ${pgData.name}\n`);
                    process.stdout.write(`PG Error: ${insertError.message}\n`);

                    throw insertError;
                }
            }

            await client.query('COMMIT');
            await generateAgeReport();

            res.status(200).json({
                message: 'Data imported and report generated successfully.',
                count: insertCount
            });

        } catch (dbErr) {
            await client.query('ROLLBACK');
            console.error('Database Transaction Rolled Back. Check logs above for specific row error.');
            res.status(500).json({ error: 'Database insertion failed during bulk process.' });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('File Read/Parse Error:', err);
        res.status(500).json({ error: 'Failed to read or parse the CSV file.' });
    }
});


app.get('/', (req, res) => {
    res.send('CSV Importer API Running. POST to /process-csv to start import and analysis.');
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});