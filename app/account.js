"use client";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { useEffect } from "react";
export default function Account({ onUser }) {
  const { user, isLoaded } = useUser();
  useEffect(() => {
    if (isLoaded) onUser(user?.id || null);
  }, [user?.id, isLoaded, onUser]);
  return user ? (
    <UserButton />
  ) : (
    <SignInButton mode="modal">
      <button className="secondary small">Sign in</button>
    </SignInButton>
  );
}
