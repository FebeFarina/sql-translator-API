import express from "express";
import {getAgent} from "./database.js";
import cors from "cors";
import {DataSource} from "typeorm";

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
  console.log("hola");
  try {
    const agent = await getAgent(req.body.databaseInfo);

    console.log("Invoking agent...");

    const result = await agent.invoke({
      input: req.body.query,
    });
    console.log("Result obtained");
    res.status(200).send(result);
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
