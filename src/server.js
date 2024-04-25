import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { SqlToolkit } from "langchain/agents/toolkits/sql";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { SemanticSimilarityExampleSelector } from "@langchain/core/example_selectors";
import {
  FewShotPromptTemplate,
  PromptTemplate,
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { createRetrieverTool } from "langchain/tools/retriever";
import { SqlDatabase } from "langchain/sql_db";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

import cors from "cors";
import express from "express";
import fs from "fs";
import { DataSource } from "typeorm";

import { examples } from "./examples.js";

async function queryAsList(database, query) {
  const res = JSON.parse(
    await database.run(query)
  )
    .flat()
    .filter((el) => el != null);
  const justValues = res.map((item) =>
    Object.values(item)[0]
      .replace(/\b\d+\b/g, "")
      .trim()
  );
  return justValues;
}

const connect = async (params) => {
  const datasource = new DataSource({
    type: params.databaseInfo.databaseType,
    host: params.databaseInfo.host,
    port: params.databaseInfo.port,
    username: params.databaseInfo.username,
    password: params.databaseInfo.password,
    database: params.databaseInfo.database,
    schema: params.databaseInfo.schema
  });
  console.log("Connecting to database");
  try {
    await datasource.initialize();
    console.log("Connected to database");
  } catch (e) {
    console.log("Error connecting to database");
    console.log(e);
  }

  return datasource;
};

export const app = express();
app.use(express.text());
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.post("/", async (req, res) => {
  try {

    console.log("Creating database connection...");

    const datasource = new DataSource({
      type: req.body.databaseInfo.databaseType,
      host: req.body.databaseInfo.host,
      port: req.body.databaseInfo.port,
      username: req.body.databaseInfo.username,
      password: req.body.databaseInfo.password,
      database: req.body.databaseInfo.database,
      schema: req.body.databaseInfo.schema
    });

    console.log("Connecting to database");

    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: datasource,
    });

    const tables = db.allTables;
    const schema = req.body.databaseInfo.schema;
    const tablesWithSchema = tables.map(table => `${schema}.${table.tableName}`);


    console.log("Tables in database: ", tablesWithSchema.join(", "));

    let properNouns = await queryAsList(db, "SELECT parada_nombre FROM titsa.paradas");
    properNouns = properNouns.concat(await queryAsList(db, "SELECT linea_nombre_largo FROM titsa.lineas"));

    console.log(properNouns.length + " proper nouns found")
    console.log(properNouns.slice(0, 10) + "...")

    const vectorDb = await MemoryVectorStore.fromTexts(
      properNouns,
      {},
      new OpenAIEmbeddings()
    );

    console.log("Creating tools...")

    const description = `Use to look up values to filter on.
    Input is an approximate spelling of the proper noun, output is valid proper nouns.
    Use the noun most similar to the search.`;
    const retrieverTool = createRetrieverTool(retriever, {
      description,
      name: "search_proper_nouns",
    });

    const retriever = vectorDb.asRetriever(15);

    console.log("Tools created")

    const llm = new ChatOpenAI({ model: "gpt-4", temperature: 0 });
    const sqlToolKit = new SqlToolkit(db, llm);
    const tools = tools = [...sqlToolKit.getTools(), retrieverTool];

    const exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
      examples,
      new OpenAIEmbeddings(),
      HNSWLib,
      {
        k: 5,
        inputKeys: ["input"],
      }
    );

    const SQL_PREFIX = `You are an agent designed to interact with a SQL database.
    Given an input question, create a syntactically correct {dialect} query to run, then look at the results of the query and return the answer.
    Unless the user specifies a specific number of examples they wish to obtain, always limit your query to at most {top_k} results using the LIMIT clause.
    You can order the results by a relevant column to return the most interesting examples in the database.
    Never query for all the columns from a specific table, only ask for a the few relevant columns given the question.
    You have access to tools for interacting with the database.
    Only use the below tools.
    Only use the information returned by the below tools to construct your final answer.
    You MUST double check your query before executing it. If you get an error while executing a query, rewrite the query and try again.
    
    DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the database.
    
    You have access to the following tables: {table_names}
    
    If the question does not seem related to the database, just return "I don't know" as the answer.
    The output format should be: "SQL Query: <query> Answer: <answer>. If no SQL query is needed, just return the answer.
    When writting the SQL query, use the table names and column names as they are in the database. Dont forget about the schema name if it is needed.`;

    const SQL_SUFFIX = `Begin!
      Question: {input}
      Thought: I should look at the tables and columns in the database to see what I can query.
      {agent_scratchpad}`;

    const fewShotPrompt = new FewShotPromptTemplate({
      exampleSelector,
      examplePrompt: PromptTemplate.fromTemplate(
        "User input: {input} output: {output}"
      ),
      inputVariables: ["input", "dialect", "top_k", "table_names"],
      prefix: SQL_PREFIX,
      suffix: "",
    });

    const fullPrompt = ChatPromptTemplate.fromMessages([
      new SystemMessagePromptTemplate(fewShotPrompt),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const newPrompt = await fullPrompt.partial({
      dialect: sqlToolKit.dialect,
      top_k: "10",
      table_names: tablesWithSchema.join(", "),
    });
    const runnableAgent = await createOpenAIToolsAgent({
      llm,
      tools,
      prompt: newPrompt,
    });
    const agentExecutor = new AgentExecutor({
      agent: runnableAgent,
      tools,
      maxIterations: 100,
    });


    console.log("Invoking agent...");

    const result = await agentExecutor.invoke({
      input: req.body.query,
    });

    console.log("Result obtained");

    const outputParts = result.output.split(/(SQL Query:|Answer:)/);

    // Extract the SQL query and the answer
    const sqlQueryIndex = outputParts.indexOf("SQL Query:") + 1;
    const answerIndex = outputParts.indexOf("Answer:") + 1;

    const sqlQuery =
      sqlQueryIndex < outputParts.length
        ? outputParts[sqlQueryIndex].trim()
        : null;
    const answer =
      answerIndex < outputParts.length ? outputParts[answerIndex].trim() : null;

    examples.push({
      input: req.body.query,
      output: {
        sqlQuery,
        answer,
      },
    });

    console.log("Save result? (Y to save)")

    process.stdin.on("data", (data) => {
      const input = data.toString().trim();
      if ((input === "Y" || input === "y") && answer != "I don't know.") {
        fs.writeFileSync("./src/examples.js", `export const examples = ${JSON.stringify(examples, null, 2)
          }`);
        console.log("Result saved");
      } else {
        console.log("Result not saved");
      }
    });

    console.log("Sending response...")
    res.status(200).send({ sqlQuery, answer });

  } catch (e) {
    res.status(500).send(e.toString());
  }
});

app.post("/ping", (req, res) => {
  connect(req.body)
    .then(() => {
      res.status(200).send("Connected");
    })
    .catch((e) => {
      res.status(500).send(e.toString());
    });
});

app.get("*", (req, res) => {
  res.send("Hello, World!");
});

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});
