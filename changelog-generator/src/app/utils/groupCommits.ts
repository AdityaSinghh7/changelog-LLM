// import { getCommitEmbeddings } from "./embedding";
// import { cosineSimilarity } from "./similarity";
// import type { Commit, CommitGroup } from "@/app/types";
//
// export function groupCommitsBySimilarityLocal(
//     commits: Commit[],
//     embeddings: number[][],
//     similarityThreshold = 0.85
// ): CommitGroup[] {
//     const groups: CommitGroup[] = [];
//     let currentGroup: Commit[] = [];
//     let currentRepo = "";
//     let lastEmbedding: number[] | null = null;
//
//     for (let i = 0; i < commits.length; i++) {
//         const commit = commits[i];
//         const embedding = embeddings[i];
//         const isSameRepo = commit.repository === currentRepo;
//         const isSimilar =
//             lastEmbedding && cosineSimilarity(lastEmbedding, embedding) >= similarityThreshold;
//
//         if (currentGroup.length > 0 && (!isSameRepo || !isSimilar)) {
//             const sortedGroup = [...currentGroup].sort((a, b) =>
//                 new Date(a.commit.author.date).getTime() - new Date(b.commit.author.date).getTime()
//             );
//
//             groups.push({
//                 commits: sortedGroup,
//                 startDate: sortedGroup[0].commit.author.date,
//                 endDate: sortedGroup[sortedGroup.length - 1].commit.author.date,
//                 repository: currentRepo,
//             });
//
//             currentGroup = [];
//             lastEmbedding = null;
//         }
//
//         currentGroup.push(commit);
//         lastEmbedding = embedding;
//         currentRepo = commit.repository || "";
//     }
//
//     if (currentGroup.length > 0) {
//         const sortedGroup = [...currentGroup].sort((a, b) =>
//             new Date(a.commit.author.date).getTime() - new Date(b.commit.author.date).getTime()
//         );
//         groups.push({
//             commits: sortedGroup,
//             startDate: sortedGroup[0].commit.author.date,
//             endDate: sortedGroup[sortedGroup.length - 1].commit.author.date,
//             repository: currentRepo,
//         });
//     }
//
//     return groups;
// }
//
// // export async function batchAndGroupAllCommits(
// //     commits: Commit[],
// //     similarityThreshold = 0.85,
// //     batchSize = 10
// // ): Promise<CommitGroup[]> {
// //     const allGroups: CommitGroup[] = [];
// //
// //     for (let i = 0; i < commits.length; i += batchSize) {
// //         const batch = commits.slice(i, i + batchSize);
// //         if (batch.length === 0) continue;
// //
// //         const grouped = await groupCommitsBySimilarity(batch, similarityThreshold, batch.length);
// //         allGroups.push(...grouped);
// //     }
// //
// //     return allGroups;
// // }