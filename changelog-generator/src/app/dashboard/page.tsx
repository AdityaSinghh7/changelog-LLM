"use client";

import {signOut, useSession} from "next-auth/react";
import { useRouter } from "next/navigation";
import {useEffect, useState} from "react";

export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    const [showModal, setShowModal] = useState(false);
    const [repos, setRepos] = useState<{name: string; id : number}[]>([]);
    const [selectedRepos, setSelectedRepos] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const githubUsername = session?.user?.login;
    const accessToken = session?.accessToken;
    // console.log("From here " + githubUsername);
    useEffect(() => {
        if ((showModal || repos.length === 0) && githubUsername) {
            setLoading(true);
            fetch(`https://api.github.com/user/repos`, {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                    "User-Agent": "next-auth",
                },
            })
                .then(async (res) => {
                    const remaining = res.headers.get("X-RateLimit-Remaining") ?? "unknown";
                    const limit = res.headers.get("X-RateLimit-Limit") ?? "unknown";
                    const resetHeader = res.headers.get("X-RateLimit-Reset");

                    let resetTime = "unknown";
                    if (resetHeader) {
                        const resetDate = new Date(parseInt(resetHeader) * 1000);
                        if (!isNaN(resetDate.getTime())) {
                            resetTime = resetDate.toLocaleTimeString();
                        }
                    }

                    console.log(`📊 GitHub Rate Limit: ${remaining}/${limit} - Resets at ${resetTime}`);
                    const data = await res.json();
                    const simplified = data.map((repo: any) => ({
                        name: repo.name,
                        id: repo.id,
                    }));
                    setRepos(simplified);
                    setLoading(false);

                })
                .catch((err) => {
                    console.error("Error fetching repos:", err);
                    setLoading(false);
                });
        }
    }, [showModal, githubUsername]);


    const handleCheckbox = (id: number) => {
        setSelectedRepos((prev) =>
            prev.includes(id)
                ? prev.filter((repoId) => repoId !== id)
                : [...prev, id]
        );
    };

    const handleSubmit = () => {
        const selected = repos.filter((repo) => selectedRepos.includes(repo.id));
        const repoNames = selected.map((repo) => repo.name);
        localStorage.setItem("selectedRepos", JSON.stringify(repoNames));
        // console.log("Selected repositories:", selected);
        // Here you could send to an API route or pass to OpenAI summarizer
        setShowModal(false);
        router.push("/changelog");
    };

    const handleAllSubmit = () => {
        const allRepoNames = repos.map((repo) => repo.name);
        localStorage.setItem("selectedRepos", JSON.stringify(allRepoNames));
        router.push("/changelog");
    };

    if (status === "loading") return <div className="p-6">Loading...</div>;

    return (
        <div className="min-h-screen p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <button
                    onClick={() => signOut({
                        callbackUrl: "/",
                        redirect: true,
                    })}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Sign Out
                </button>
            </div>

            <div className="space-y-4">
                <div className="p-4 border rounded">
                    <h2 className="text-xl font-semibold mb-2">Option 1</h2>
                    <p>Generate changelog for all public repositories</p>
                    <button
                        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        onClick={handleAllSubmit}
                    >
                        Generate for All Repos
                    </button>
                </div>

                <div className="p-4 border rounded">
                    <h2 className="text-xl font-semibold mb-2">Option 2</h2>
                    <p>Generate changelog for selected repositories</p>
                    <button
                        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        onClick={() => setShowModal(true)}
                    >
                        Select Repositories
                    </button>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white text-black p-6 rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-bold mb-4">Select Repositories</h3>

                        {loading ? (
                            <p>Loading repositories...</p>
                        ) : (
                            <>
                                {repos.map((repo) => (
                                    <div key={repo.id} className="flex items-center overflow-auto cursor-pointer mb-2">
                                        <input
                                            type="checkbox"
                                            id={`repo-${repo.id}`}
                                            checked={selectedRepos.includes(repo.id)}
                                            onChange={() => handleCheckbox(repo.id)}
                                            className="mr-2"
                                        />
                                        <label htmlFor={`repo-${repo.id}`}>{repo.name}</label>
                                    </div>
                                ))}
                            </>
                        )}

                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
