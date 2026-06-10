import { createInterface } from "node:readline/promises";
import { argv, stdin as input, stdout as output } from "node:process";

import { defaultQuestion, rawContextTokenBudget } from "./config.js";
import { buildRecords, createHierarchicalIndex } from "./indexer.js";
import type { HierarchicalIndex } from "./models.js";
import { answerQuestion } from "./retrieval.js";

export function getCliQuestion(arguments_: string[]): string | null {
  const questionFlagIndex = arguments_.indexOf("--question");

  if (questionFlagIndex === -1) {
    return null;
  }

  return arguments_[questionFlagIndex + 1] ?? defaultQuestion;
}

export function printAnswer(question: string, index: HierarchicalIndex): void {
  const answer = answerQuestion(question, index);
  console.log("\nAnswer:");
  console.log(answer);
}

export async function main(): Promise<void> {
  console.log("Building hierarchical summary index");
  const [documentRecords, chunkRecords] = buildRecords();
  const index = createHierarchicalIndex(documentRecords, chunkRecords);

  console.log("\nIndex ready");
  console.log(`Documents: ${documentRecords.length}`);
  console.log(`Chunks: ${chunkRecords.length}`);
  console.log(`Raw context budget: ${rawContextTokenBudget} approx tokens`);

  const cliQuestion = getCliQuestion(argv.slice(2));

  if (cliQuestion !== null) {
    console.log(`\nQuestion: ${cliQuestion}`);
    printAnswer(cliQuestion, index);
    return;
  }

  const reader = createInterface({ input, output });

  while (true) {
    const question = (await reader.question("\nQuestion: ")).trim();

    if (["q", "quit", "exit"].includes(question.toLowerCase())) {
      break;
    }

    printAnswer(question, index);
  }

  reader.close();
}
