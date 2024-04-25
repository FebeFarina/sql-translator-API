import express from "express";
import cors from "cors";
import { DataSource } from "typeorm";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { SqlToolkit } from "langchain/agents/toolkits/sql";
import { AIMessage } from "@langchain/core/messages";
import { SqlDatabase } from "langchain/sql_db";

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
      schema: req.body.databaseInfo.schema,
    });

    console.log("Connecting to database");

    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: datasource,
    });

    console.log(db.allTables.map((t) => t.tableName));

    const llm = new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 });
    const sqlToolKit = new SqlToolkit(db, llm);
    const tools = sqlToolKit.getTools();
    const SQL_PREFIX = `You are an agent designed to interact with a SQL database.
    Given an input question, create a syntactically correct {dialect} query to run, then look at the results of the query and return the answer and the sql query used to get the answer.
    Unless the user specifies a specific number of examples they wish to obtain, always limit your query to at most {top_k} results using the LIMIT clause.
    You can order the results by a relevant column to return the most interesting examples in the database.
    Never query for all the columns from a specific table, only ask for a the few relevant columns given the question.
    You have access to tools for interacting with the database.
    Only use the below tools.
    Only use the information returned by the below tools to construct your final answer.
    You MUST double check your query before executing it. If you get an error while executing a query, rewrite the query and try again.
    The format of the output should be "SQL Query: <query>" and "Answer: <answer>. 
    The query should be a valid SQL query that can be run on the database.
    If a SQL query is not needed, return "SQL Query: N/A" and "Answer: <answer>".
    Don't forget to take into account the database schema when constructing your query.
    DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the database.
    
    DO NOT ANSWER with any thoughts or comments about the question or the query. Just answer the question and provide the SQL query used to get the answer.`;
    const SQL_SUFFIX = `Begin!
    
    Question: {input}
    Thought: I should look at the tables in the database to see what I can query.
    {agent_scratchpad}`;
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SQL_PREFIX],
      HumanMessagePromptTemplate.fromTemplate("{input}"),
      new AIMessage(SQL_SUFFIX.replace("{agent_scratchpad}", "")),
      new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const newPrompt = await prompt.partial({
      dialect: sqlToolKit.dialect,
      top_k: "10",
    });
    const runnableAgent = await createOpenAIToolsAgent({
      llm,
      tools,
      prompt: newPrompt,
    });
    const agentExecutor = new AgentExecutor({
      agent: runnableAgent,
      tools,
      maxIterations: 30,
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

    res.status(200).send({ sqlQuery, answer });
  } catch (e) {
    res.status(500).send(e);
  }
});

app.post("/ping", (req, res) => {
  connect(req.body)
    .then(() => {
      res.status(200).send("Connected");
    })
    .catch((e) => {
      res.status(500).send(e);
    });
});

app.get("*", (req, res) => {
  res.send("Hello, World!");
});

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});
