import fs from "fs";

const results = {
    answers: [],
    sqlQueries: [],
    execTime: [],
    meanTime: 0,
}

async function fetchData() {
    for (let i = 0; i < 10; i++) {
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
                    username: "sql-translator-user",
                    password: "sql-translator-user",
                    database: "movies",
                    schema: "movies",
                },
                query: "Give me the name of actors who acted in Steven Spielberg movies.",
            }),
        });
        const data = await response.json();
        results.answers.push(data.answer);
        results.sqlQueries.push(data.sqlQuery);
        results.execTime.push(data.executionTime);
    }

    results.meanTime = results.execTime.reduce((a, b) => a + b) / results.execTime.length;
    console.log(results);

    fs.writeFile('resultsx.json', JSON.stringify(results, null, 2), (err) => {
        if (err) throw err;
        console.log('Results saved to results.json');
    });
}

fetchData().then();