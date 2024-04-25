import express from "express";
import cors from "cors";
import { DataSource } from "typeorm";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "@langchain/core/prompts";
import { LlamaCpp } from "@langchain/community/llms/llama_cpp";
import { createReactAgent, AgentExecutor } from "langchain/agents";
import { SqlToolkit, createSqlAgent } from "langchain/agents/toolkits/sql";
import { AIMessage } from "@langchain/core/messages";
import { SqlDatabase } from "langchain/sql_db";

import { pull } from "langchain/hub"

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
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.post("/", async (req, res) => {
  try {
    console.log("Creating database connection...");

    const datasource = new DataSource({
      type: req.body.databaseType,
      host: req.body.host,
      port: req.body.port,
      username: req.body.username,
      password: req.body.password,
      database: req.body.database,
      schema: req.body.schema,
      synchronize: true,
    });

    console.log("Connecting to database");

    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: datasource,
    });
    console.log("Connected to database");

    const llamaPath = "/home/febe/llama2/llama.cpp/models/7B/gguf-llama2-q4_0.bin"

    const llm = new LlamaCpp({ modelPath: llamaPath });
    const sqlToolKit = new SqlToolkit(db, llm);
    const tools = sqlToolKit.getTools();
    const tool_names = tools.map((tool) => tool.name);

    console.log("Creating agent...");

    const SQL_PREFIX = `You are an agent designed to interact with a SQL database.
  Given an input question, create a syntactically correct {dialect} query to run, then look at the results of the query and return the answer and the sql query used to get the answer.
  Unless the user specifies a specific number of examples they wish to obtain, always limit your query to at most {top_k} results using the LIMIT clause.
  You can order the results by a relevant column to return the most interesting examples in the database.
  Never query for all the columns from a specific table, only ask for a the few relevant columns given the question.
  You have access to tools for interacting with the database.
  Only use the below tools.
  Only use the information returned by the below tools to construct your final answer.
  You MUST double check your query before executing it. If you get an error while executing a query, rewrite the query and try again.
  The format of the output should be "SQL Query: <query>" and "Answer: <answer>. If a SQL query is not needed, return "SQL Query: N/A" and "Answer: <answer>".
  
  DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the database.
  
  If the question does not seem related to the database, just return "I don't know" as the answer.`;
    const SQL_SUFFIX = `Begin!
  
  Question: {input}
  Thought: I should look at the tables in the database to see what I can query.
  {agent_scratchpad}`;

    // const prompt = ChatPromptTemplate.fromMessages([
    //   ["system", SQL_PREFIX],
    //   HumanMessagePromptTemplate.fromTemplate("{input}"),
    //   new AIMessage(SQL_SUFFIX.replace("{agent_scratchpad}", "")),
    //   new MessagesPlaceholder("agent_scratchpad"),
    // ]);


    // const newPrompt = await prompt.partial({
    //   dialect: sqlToolKit.dialect,
    //   top_k: "10",
    // });

    // const runnableAgent = await createReactAgent({
    //   llm,
    //   tools,
    //   prompt: newPrompt,
    // });

    // const agentExecutor = new AgentExecutor({
    //   agent: runnableAgent,
    //   tools,
    // });

    const agent = createSqlAgent(llm, sqlToolKit);

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      handleParsingErrors: "Check your output and make sure it conforms!"
    });


    console.log("Invoking agent...");

    const result = await agentExecutor.invoke({
      input: req.body.query,
    });
    console.log("Result obtained");
    console.log(result);

    // const outputParts = result.output.split(/(SQL Query:|Answer:)/);

    // // Extract the SQL query and the answer
    // const sqlQueryIndex = outputParts.indexOf("SQL Query:") + 1;
    // const answerIndex = outputParts.indexOf("Answer:") + 1;

    // const sqlQuery =
    //   sqlQueryIndex < outputParts.length
    //     ? outputParts[sqlQueryIndex].trim()
    //     : null;
    // const answer =
    //   answerIndex < outputParts.length ? outputParts[answerIndex].trim() : null;

    // res.status(200).send({ sqlQuery, answer });

    res.status(200).send(result);
  } catch (e) {
    console.log(e);
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
