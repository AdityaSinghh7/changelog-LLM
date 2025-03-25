"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {useRouter} from "next/navigation";
// import { groupCommitsBySimilarityLocal, batchAndGroupAllCommits } from "@/app/utils/groupCommits";
import {Commit, ChangelogEntry, CommitGroup} from "@/app/types";


export default function ChangelogPage(){
    const { data: session, status } = useSession();
    const router = useRouter();
    const [commits, setCommits] = useState<Commit[]>([]);
    const [filteredCommits, setFilteredCommits] = useState<Commit[]>([]);
    const [repoList, setRepoList] = useState<string[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string>("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [changelogSummary, setChangelogSummary] = useState<ChangelogEntry[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const summariesPerPage = 10;
    const paginatedSummaries = changelogSummary.slice(
        (currentPage - 1) * summariesPerPage,
        currentPage * summariesPerPage
    );
    const [cache, setCache] = useState<Record<string, ChangelogEntry[]>>({});

    const githubUsername = session?.user?.login;
    const accessToken = (session as any)?.accessToken;

    const groupCommitsViaAPI = async (
        commits: Commit[],
        similarityThreshold = 0.9,
        maxCommits = 100
    ): Promise<CommitGroup[]> => {
        const response = await fetch("/api/embedding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commits, similarityThreshold, maxCommits }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Embedding API failed: ${err}`);
        }

        const { groups } = await response.json();
        return groups;
    };

    const summarizeCommitGroups = async (groups: CommitGroup[]) => {
        const response = await fetch("/api/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                commitGroups: groups.map((group) => ({
                    startDate: group.startDate,
                    repository: group.repository,
                    endDate: group.endDate,
                    commits: group.commits.map((c) => ({
                        message: c.commit.message,
                        link: c.html_url,
                    })),
                })),
            }),
        });

        // const { summary } = await response.json();
        // for (let i = 0; i < summary.length; i++) {
        //     await new Promise((resolve) => setTimeout(resolve, 100)); // slight delay
        //     setChangelogSummary((prev) => [...prev, summary[i]]);
        // }

        if (!response.body) {
            throw new Error("❌ Response body is null (stream not supported)");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let partial = "";
        const results: ChangelogEntry[] = [];

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            partial += decoder.decode(value, { stream: true });
            const lines = partial.split("\n");

            // keep incomplete line for next chunk
            partial = lines.pop() || "";

            for (const line of lines) {
                try {
                    const parsed: ChangelogEntry = JSON.parse(line);
                    results.push(parsed);
                    setChangelogSummary((prev) => [...prev, parsed]); // incremental rendering
                } catch (err) {
                    console.warn("⚠️ Skipping invalid JSON chunk:", line);
                }
            }
        }

        return results;
    };

    useEffect(() => {
        console.log(JSON.parse(localStorage.getItem("selectedRepos") || "[]"))
        const repos = JSON.parse(localStorage.getItem("selectedRepos") || "[]");
        setRepoList(repos);
    }, []);

    useEffect(() => {
        if (githubUsername && repoList.length > 0) {
            fetchCommits();
        }
    }, [repoList, githubUsername]);

    const fetchCommits = async () => {
        setLoading(true);
        setError("");
        try {
            const allCommits: Commit[] = [];
            const headers = {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "changelog-generator",
            };
            for (const repo of repoList) {
                try {
                    console.log(`🔍 Fetching branches for repo: ${repo}`);
                    const branchRes = await fetch(`https://api.github.com/repos/${githubUsername}/${repo}/branches`, {
                        headers,
                    });
                    const remaining = branchRes.headers.get("X-RateLimit-Remaining") ?? "unknown";
                    const limit = branchRes.headers.get("X-RateLimit-Limit") ?? "unknown";
                    const resetHeader = branchRes.headers.get("X-RateLimit-Reset");

                    let resetTime = "unknown";
                    if (resetHeader) {
                        const resetDate = new Date(parseInt(resetHeader) * 1000);
                        if (!isNaN(resetDate.getTime())) {
                            resetTime = resetDate.toLocaleTimeString();
                        }
                    }

                    console.log(`📊 GitHub Rate Limit: ${remaining}/${limit} - Resets at ${resetTime}`);

                    if (!branchRes.ok) {
                        const errorText = await branchRes.text();
                        console.error(`⚠️ Error fetching branches for repo ${repo}: ${branchRes.status} - ${errorText}`);
                        continue;
                    }

                    const branches = await branchRes.json();

                    for (const branch of branches) {
                        const commitsRes = await fetch(
                            `https://api.github.com/repos/${githubUsername}/${repo}/commits?sha=${branch.name}`,
                            { headers }
                        );

                        if (!commitsRes.ok) {
                            const errorText = await commitsRes.text();
                            console.error(`⚠️ Error fetching commits for ${repo} on branch ${branch.name}: ${commitsRes.status} - ${errorText}`);
                            continue;
                        }
                        const remaining = commitsRes.headers.get("X-RateLimit-Remaining") ?? "unknown";
                        const limit = commitsRes.headers.get("X-RateLimit-Limit") ?? "unknown";
                        const resetHeader = commitsRes.headers.get("X-RateLimit-Reset");

                        let resetTime = "unknown";
                        if (resetHeader) {
                            const resetDate = new Date(parseInt(resetHeader) * 1000);
                            if (!isNaN(resetDate.getTime())) {
                                resetTime = resetDate.toLocaleTimeString();
                            }
                        }

                        console.log(`📊 GitHub Rate Limit: ${remaining}/${limit} - Resets at ${resetTime}`);
                        const commitsData: Commit[] = await commitsRes.json();

                        const enriched = commitsData.map((commit) => ({
                            ...commit,
                            repository: repo,
                            branch: branch.name,
                        }));

                        allCommits.push(...enriched);
                }
                }
                catch (err) {
                    console.error(`Failed to fetch branches or commits for repo ${repo}:`, err);
                }
            }
            console.log("✅ Total commits fetched:", allCommits.length);
            const sorted = allCommits.sort(
                (a, b) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()
            );
            setCommits(sorted);
            const filtered = selectedRepo
                ? sorted.filter(c => c.repository === selectedRepo)
                : sorted;
            setFilteredCommits(filtered);
            if (filtered.length > 0) {
                const grouped = await groupCommitsViaAPI(filtered, 0.9, filtered.length);
                setChangelogSummary([]);
                const summary = await summarizeCommitGroups(grouped);
                setCache((prev) => ({ ...prev, ["all"]: summary }));
                setChangelogSummary(summary);
            } else {
                setChangelogSummary([]);
            }
        } catch (e) {
            console.error("🔥 Unexpected error while fetching commits:", e);
            setError("Failed to fetch commits from GitHub.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let filtered = [...commits];

        if (selectedRepo) {
            filtered = filtered.filter((c) => c.repository === selectedRepo);
        }

        if (search) {
            filtered = filtered.filter((c) =>
                c.commit.message.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (startDate) {
            filtered = filtered.filter(
                (c) => new Date(c.commit.author.date) >= new Date(startDate + "T00:00:00")
            );
        }

        if (endDate) {
            filtered = filtered.filter(
                (c) => new Date(c.commit.author.date) <= new Date(endDate + "T23:59:59")
            );
        }

        setFilteredCommits(filtered);
    }, [selectedRepo, search, search, startDate, endDate]);


    useEffect(() => {
        const runFilteredSummarization = async () => {
            if (!filteredCommits.length) {
                setChangelogSummary([]);
                return;
            }

            const filterKey = JSON.stringify({ selectedRepo, search, startDate, endDate });

            if (cache[filterKey]) {
                setChangelogSummary(cache[filterKey]);
                setCurrentPage(1);
                return;
            }

            if (cache["all"]) {
                const allSummaries = cache["all"];

                // Filter based on selectedRepo, search, startDate, endDate
                const filtered = allSummaries.filter(entry => {
                    const matchRepo = selectedRepo ? entry.title.includes(selectedRepo) : true;
                    const matchSearch = search ? entry.bullets.some(b => b.toLowerCase().includes(search.toLowerCase())) : true;
                    const matchDate = (!startDate || new Date(entry.dateRange.split(" - ")[1]) >= new Date(startDate + "T00:00:00")) &&
                        (!endDate || new Date(entry.dateRange.split(" - ")[0]) <= new Date(endDate + "T23:59:59"));
                    return matchRepo && matchSearch && matchDate;
                });

                setChangelogSummary(filtered);
                setCurrentPage(1);
                return;
            }


            setLoading(true);
            try {
                const grouped = await groupCommitsViaAPI(filteredCommits, 0.9, filteredCommits.length);
                const summary = await summarizeCommitGroups(grouped);
                setCache({ all: summary });
                setChangelogSummary(summary);
                setCurrentPage(1);
            } catch (e) {
                console.error("🔥 Error summarizing filtered commits:", e);
                setError("Failed to generate summaries.");
            } finally {
                setLoading(false);
            }
        };

        runFilteredSummarization();
    }, [filteredCommits]);

    return (
        <div className="p-6 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">📝 Changelog</h1>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                >
                    ← Back to Dashboard
                </button>
            </div>

            {loading && <p>Loading commits...</p>}
            {error && <p className="text-red-500">{error}</p>}

            <div className="flex flex-wrap gap-4 mb-4">
                <select
                    className="border px-3 py-2 rounded"
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                >
                    <option value="">All Repositories</option>
                    {repoList.map((repo) => (
                        <option key={repo} value={repo}>{repo}</option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="Search commit messages..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border px-3 py-2 rounded w-64"
                />

                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border px-3 py-2 rounded text-white bg-gray-500"
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border px-3 py-2 rounded text-white bg-gray-500"
                />
            </div>
            {/* ✅ AI Changelog Summary Section */}
            {changelogSummary.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-2xl font-semibold mb-4">📦 AI-Generated Changelog Summary</h2>

                    <div className="space-y-6">
                        {paginatedSummaries.map((entry, index) => (
                            <div key={index} className="border border-gray-300 bg-white shadow-md rounded-lg p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-gray-800">{entry.title}</h3>
                                    <span className="text-sm text-gray-500">{entry.dateRange}</span>
                                </div>

                                <ul className="list-disc pl-5 text-gray-700 mb-3">
                                    {entry.bullets.map((bullet, i) => (
                                        <li key={i} className="text-sm">{bullet}</li>
                                    ))}
                                </ul>

                                <div className="flex flex-wrap gap-2">
                                    {entry.links.map((link, i) => (
                                        <a
                                            key={i}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-500 underline hover:text-blue-700"
                                        >
                                            View Commit {i + 1} ↗
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* ✅ Pagination Controls */}
                        <div className="flex justify-center mt-6 gap-2 flex-wrap">
                            {Array.from({ length: Math.ceil(changelogSummary.length / summariesPerPage) }).map((_, i) => (
                                <button
                                    key={i}
                                    className={`px-3 py-1 rounded-md ${
                                        currentPage === i + 1
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-200 hover:bg-gray-300"
                                    }`}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}