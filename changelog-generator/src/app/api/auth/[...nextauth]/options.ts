import NextAuth from "next-auth";
import GithubProvider, {GithubProfile} from "next-auth/providers/github"
import type {NextAuthOptions} from "next-auth";

const clientId = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    throw new Error("No client id or client secret provided for OAuth2.0 flow");
}

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: clientId,
            clientSecret: clientSecret,
            profile(profile : GithubProfile) {
                return{
                    id: profile.id.toString(),
                    name: profile.name,
                    userName: profile.login,
                    email: profile.email,
                    image: profile.avatar_url
                }
            }
        })
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, account, profile }) {

            if (account?.access_token) {
                token.accessToken = account.access_token;
            }


            if (profile) {
                token.login = (profile as any).userName;
            }


            if (!token.login && token.accessToken) {
                try {
                    const res = await fetch("https://api.github.com/user", {
                        headers: {
                            Authorization: `Bearer ${token.accessToken}`,
                            "User-Agent": "next-auth",
                        },
                    });

                    const githubUser = await res.json();
                    console.log("📦 githubUser fallback:", githubUser);
                    token.login = githubUser.login;
                } catch (err) {
                    console.error("❌ Failed to fetch GitHub login from token", err);
                }
            }

            console.log("🐛 profile in jwt callback:", profile);
            console.log("🧪 token.login is now:", token.login);
            return token;
        },
        async session({ session, token }) {
            if (token?.login) {
                session.user.login = token.login as string;
            }
            if (token?.accessToken) {
                session.accessToken = token.accessToken as string;
            }
            return session;
        },

    }
}
