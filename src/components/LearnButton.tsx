"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

interface LearnButtonProps {
  isAuthed: boolean;
}

export function LearnButton({ isAuthed }: LearnButtonProps) {
  const coursesQuery = api.course.list.useQuery();

  const handleLearnClick = () => {
    const coursesSection = document.getElementById('courses');
    coursesSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isAuthed) {
    // Not authenticated - scroll to courses section
    return (
      <button onClick={handleLearnClick} className="hover:underline">
        Learn
      </button>
    );
  }

  // Authenticated user
  if (coursesQuery.data && coursesQuery.data.length > 0) {
    // Has courses - go to first course
    return (
      <Link href={`/learn?course=${coursesQuery.data[0].slug}`}>
        Learn
      </Link>
    );
  } else {
    // No courses - scroll to courses section
    return (
      <button onClick={handleLearnClick} className="hover:underline">
        Learn
      </button>
    );
  }
}
