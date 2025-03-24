export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error("Vectors must be the same length");

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] ** 2;
        magB += b[i] ** 2;
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}