import express from "express";
import {chain} from "./database.js";

export const app = express();
app.use(express.text());

app.get("/", async (req, res) => {
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

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
