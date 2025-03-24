// const OPENAI_EMBEDDING_MODEL = "text-embedding-3-large";
//
// export async function getCommitEmbeddings(commits: string[]): Promise<number[][]> {
//     if (!process.env.OPENAI_API_KEY) {
//         throw new Error("OPENAI_API_KEY is not defined in environment variables.");
//     }
//
//     const response = await fetch("https://api.openai.com/v1/embeddings", {
//         method: "POST",
//         headers: {
//             "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
//             "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//             input: commits,
//             model: OPENAI_EMBEDDING_MODEL,
//         }),
//     });
//
//     if (!response.ok) {
//         const err = await response.json();
//         console.error("Error from OpenAI embedding API:", err);
//         throw new Error("Failed to fetch embeddings");
//     }
//
//     const data = await response.json();
//     return data.data.map((obj: any) => obj.embedding);
// }