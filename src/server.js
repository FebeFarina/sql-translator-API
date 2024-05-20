import express from "express";
import cors from "cors";
import "dotenv/config";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { DataSource } from "typeorm";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage } from "@langchain/core/messages";
import { SqlToolkit, createSqlAgent } from "langchain/agents/toolkits/sql";
import { SqlDatabase } from "langchain/sql_db";
import { loadEvaluator } from "langchain/evaluation";
import e from "express";

const connect = async (params) => {
  const datasource = new DataSource({
    type: params.databaseType,
    host: params.host,
    port: params.port,
    username: params.username,
    password: params.password,
    database: params.database,
    schema: params.schema,
    synchronize: true,
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
    const startTimestamp = Date.now();
    console.log("Creating database connection...");

    const datasource = new DataSource({
      type: req.body.databaseInfo.databaseType,
      host: req.body.databaseInfo.host,
      port: req.body.databaseInfo.port,
      username: req.body.databaseInfo.username,
      password: req.body.databaseInfo.password,
      database: req.body.databaseInfo.database,
      schema: req.body.databaseInfo.schema,
      synchronize: true,
    });

    console.log("Connecting to database");

    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: datasource,
    });
    console.log("Connected to database");
    const llm = new ChatOpenAI(
      {
        temperature: 0,
        model: "gpt-4o  ",
      }
    );
    const sqlToolKit = new SqlToolkit(db, llm);
    const tools = sqlToolKit.getTools();

    console.log("Creating agent...");

    const SQL_PREFIX = `You are an agent designed to interact with a SQL database.
  Given an input question, create a syntactically correct {dialect} query to run, then look at the results of the query and return the answer and the sql query used to get the answer.
  Unless the user specifies a specific number of examples they wish to obtain, always limit your query to at most {top_k} results using the LIMIT clause.
  You can order the results by a relevant column to return the most interesting examples in the database.
  Never query for all the columns from a specific table, only ask for a the few relevant columns given the question.
  You have access to tools for interacting with the database.
  Only use the below tools.
  Only use the information returned by the below tools to construct your final answer.
  You MUST double check your query before executing it. If you get an error while executing a query, rewrite the query and try again.`

      + req.body.customPrompt +

      `DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the database.
  
  If the question does not seem related to the database, just return "I don't know" as the answer.
  The format of the output should ALWAYS be "SQL Query: <query>" and "Answer: <answer>. If a SQL query is not needed, return "SQL Query: N/A" and "Answer: <answer>".
  `;
    const SQL_SUFFIX = `Begin!
  
  Question: {input}
  Thought: I should look at the tables in the database to see what I can query.
  {agent_scratchpad}`;

    const sqlAgent = createSqlAgent(
      llm,
      sqlToolKit,
      {
        prefix: SQL_PREFIX,
      }
    );


    // const prompt = ChatPromptTemplate.fromMessages([
    //   ["system", SQL_PREFIX],
    //   HumanMessagePromptTemplate.fromTemplate("{input}"),
    //   new AIMessage(SQL_SUFFIX.replace("{agent_scratchpad}", "")),
    //   new MessagesPlaceholder("agent_scratchpad"),
    // ]);

    // console.log("Prompt created");

    // const newPrompt = await prompt.partial({
    //   dialect: sqlToolKit.dialect,
    //   top_k: "10",
    // });

    // console.log("Prompt created");

    // const runnableAgent = await createOpenAIToolsAgent({
    //   llm,
    //   tools,
    //   prompt: newPrompt,
    // });

    // console.log("Agent created");

    // const agentExecutor = new AgentExecutor({
    //   agent: runnableAgent,
    //   tools,
    // });

    console.log("Invoking agent...");

    const result = await sqlAgent.invoke({ input: req.body.query });
    //const result = await agentExecutor.invoke({ input: req.body.query });
    console.log("Result obtained");
    console.log(result.intermediateSteps)
    console.log(result.output)

    // const chain = await loadEvaluator("trajectory");

    // const evaluation = await chain.evaluateAgentTrajectory({
    //   prediction: result.output,
    //   input: req.body.query,
    //   agentTrajectory: result.intermediateSteps,
    // });

    // console.log("Evaluation obtained");
    // console.log(evaluation);

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


    const executionTime = Date.now() - startTimestamp;
    res.status(200).send({ sqlQuery, answer, executionTime });
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