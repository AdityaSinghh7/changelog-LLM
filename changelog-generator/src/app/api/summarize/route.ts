import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
    try {
        const { commitGroups } = await request.json();

        if (!commitGroups || !Array.isArray(commitGroups) || commitGroups.length === 0) {
            return NextResponse.json(
                { error: "Please provide valid grouped commit data." },
                { status: 400 }
            );
        }

        // const summaries = [];
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                for (const group of commitGroups) {
                    const {startDate, endDate, commits, repository}: {
                        startDate: string;
                        endDate: string;
                        commits: { message: string; link: string }[];
                        repository: string;
                    } = group;
                    if (!commits || commits.length === 0) continue;
                    console.log("Repository name: ", repository);

                    const prompt = `
You are an assistant that writes clean and structured changelogs based on developer commit messages.

This changelog is for the repository: **${repository}**
Summarize the following commit messages (from ${startDate} to ${endDate}) into:
- A short group title including the repository name: **${repository}**.
- if group has >5 commits, generate 4–5 bullets, otherwise stick to 2–3.
- A date range
- Links to each commit

Return only valid JSON in this format:

{
  "title": "Short title",
  "dateRange": "${startDate} - ${endDate}",
  "bullets": ["summary bullet 1", "summary bullet 2"],
  "links": [${commits.map(c => `"${c.link}"`).join(", ")}]
}

Commit Messages:
${commits.map((c, i) => `${i + 1}. ${c.message}`).join("\n")}
`;
                    try {
                        const completion = await openai.chat.completions.create({
                            messages: [{role: "user", content: prompt}],
                            model: "gpt-4o",
                            max_tokens: 800,
                            temperature: 0.5,
                        });

                        const content = completion.choices[0].message.content;
                        const cleaned = content?.trim().replace(/^```json/, "").replace(/```$/, "");

                        try {
                            const parsed = JSON.parse(cleaned || "{}");
                            // summaries.push(parsed);
                            controller.enqueue(encoder.encode(JSON.stringify(parsed) + "\n"));
                        } catch (err) {
                            console.warn("❌ Failed to parse JSON for group. Raw:", content);
                        }
                    } catch (err) {
                        console.warn("❌ OpenAI generation failed for group:", err);
                    }
                }
                controller.close();
            },
        });
        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache",
            },
        });
        } catch (error) {
        console.error("Error generating summary:", error);
        return NextResponse.json({ error: "Failed to generate summary." }, { status: 500 });
    }
}
