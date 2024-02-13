import express from "express";
import {chain} from "./database.js";
import cors from "cors";

export const app = express();
app.use(express.text());
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.post("/", async (req, res) => {
  try {
    const result = await chain.invoke({
      question: req.body,
    });
    res.status(200).send(result);
  } catch (e) {
    res.status(500).send(e);
  }
});

app.get("*", (req, res) => {
  res.send("Hello, World!");
});

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});
