import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { cosineSimilarity } from "@/app/utils/similarity";
import type { Commit, CommitGroup } from "@/app/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "text-embedding-3-large";

export async function POST(req: NextRequest) {
    try {
        const { commits, similarityThreshold, maxCommits } = await req.json();

        const selected = commits.slice(0, maxCommits);
        const messages = selected.map((c: Commit) => c.commit.message);

        const embeddingResponse = await openai.embeddings.create({
            model: MODEL,
            input: messages,
        });

        const embeddings = embeddingResponse.data.map((d) => d.embedding);
        const groups: CommitGroup[] = [];

        let currentGroup: Commit[] = [];
        let currentRepo = "";
        let lastEmbedding: number[] | null = null;

        for (let i = 0; i < selected.length; i++) {
            const commit = selected[i];
            const embedding = embeddings[i];
            const isSameRepo = commit.repository === currentRepo;
            const isSimilar =
                lastEmbedding && cosineSimilarity(lastEmbedding, embedding) >= similarityThreshold;

            if (currentGroup.length > 0 && (!isSameRepo || !isSimilar)) {
                const sorted = [...currentGroup].sort(
                    (a, b) => new Date(a.commit.author.date).getTime() - new Date(b.commit.author.date).getTime()
                );
                groups.push({
                    commits: sorted,
                    startDate: sorted[0].commit.author.date,
                    endDate: sorted[sorted.length - 1].commit.author.date,
                    repository: currentRepo,
                });

                currentGroup = [];
                lastEmbedding = null;
            }

            currentGroup.push(commit);
            lastEmbedding = embedding;
            currentRepo = commit.repository || "";
        }

        if (currentGroup.length > 0) {
            const sorted = [...currentGroup].sort(
                (a, b) => new Date(a.commit.author.date).getTime() - new Date(b.commit.author.date).getTime()
            );
            groups.push({
                commits: sorted,
                startDate: sorted[0].commit.author.date,
                endDate: sorted[sorted.length - 1].commit.author.date,
                repository: currentRepo,
            });
        }

        return NextResponse.json({ groups });
    } catch (err) {
        console.error("❌ /api/embedding error:", err);
        return NextResponse.json({ error: "Failed to group commits" }, { status: 500 });
    }
}