"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  // Redirect to /new-image on component mount
  useEffect(() => {
    router.replace("/new-image");
  }, [router]);

  return null; // Return nothing as we're redirecting
}
