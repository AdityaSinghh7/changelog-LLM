export interface Commit {
    sha: string;
    html_url: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
    repository?: string;
    branch?: string;
}

export interface CommitGroup {
    commits: Commit[];
    startDate: string;
    endDate: string;
    repository: string;
}

export interface ChangelogEntry {
    title: string;
    dateRange: string;
    bullets: string[];
    links: string[];
}