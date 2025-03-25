'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import {useEffect} from "react";
import {useRouter} from "next/navigation";

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if(status === 'authenticated'){
            router.replace('/dashboard');
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center p-6">
                <p>Loading session...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-6">
            <h1 className="text-3xl font-bold mb-4">Sign In</h1>
            <button
                onClick={() => signIn("github",
                    {
                        callbackUrl: '/dashboard',
                        prompt: 'login',
                    })
            }
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
            >
                Sign in with GitHub
            </button>
        </div>
    );
}
