import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            login?: string; // GitHub username
        };
        accessToken?: string;
    }

    interface User {
        login?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        login?: string;
    }
}