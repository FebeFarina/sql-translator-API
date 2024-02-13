import {ChatOpenAI} from "@langchain/openai";
import {createSqlQueryChain} from "langchain/chains/sql_db";
import {SqlDatabase} from "langchain/sql_db";
import {DataSource} from "typeorm";
import {QuerySqlTool} from "langchain/tools/sql";
import {PromptTemplate} from "@langchain/core/prompts";
import {StringOutputParser} from "@langchain/core/output_parsers";
import {RunnablePassthrough, RunnableSequence} from "@langchain/core/runnables";

const datasource = new DataSource({
  type: "postgres",
  host: "winhost",
  port: 5432,
  username: "sql-translator-user",
  password: "sql-translator-user",
  database: "movies",
  schema: "movies",
  synchronize: true,
});

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: datasource,
});

const llm = new ChatOpenAI({modelName: "gpt-4", temperature: 0});

const executeQuery = new QuerySqlTool(db);
const writeQuery = await createSqlQueryChain({
  llm,
  db,
  dialect: "postgres",
});

const answerPrompt =
  PromptTemplate.fromTemplate(`Given the following user question, corresponding SQL query, and SQL result, answer the user question.

Question: {question}
SQL Query: {query}
SQL Result: {result}
Answer: `);

const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser());

export const chain = RunnableSequence.from([
  RunnablePassthrough.assign({query: writeQuery}).assign({
    result: (i) => executeQuery.invoke(i.query),
  }),
  answerChain,
]);
