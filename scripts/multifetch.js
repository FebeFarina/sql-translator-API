import fs from "fs";

const results = {
    answers: [],
    sqlQueries: [],
    execTime: [],
    meanTime: 0,
}

async function fetchData() {
    console.log("Fetching data...");
    for (let i = 0; i < 25; i++) {
        const response = await fetch("http://localhost:3001", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                databaseInfo: {
                    databaseType: "postgres",
                    host: "localhost",
                    port: 5432,
                    username: "postgres",
                    password: "postgres",
                    database: "movies",
                    schema: "public",
                },
                query: "List the top 10 most popular movies, including their titles, release dates, and the number of genres they belong to.",
            }),
        });
        const data = await response.json();
        results.answers.push(data.answer);
        results.sqlQueries.push(data.sqlQuery);
        results.execTime.push(data.executionTime);
        console.log(`Iteration ${i + 1} completed`);
    }

    results.meanTime = results.execTime.reduce((a, b) => a + b) / results.execTime.length;
    console.log(results);

    fs.writeFile('resultsx.json', JSON.stringify(results, null, 2), (err) => {
        if (err) throw err;
        console.log('Results saved to results.json');
    });
}

fetchData().then();