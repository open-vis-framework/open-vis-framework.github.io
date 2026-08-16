"use client";

import { useState } from "react";
import { Input, Button } from "@/components/form";

type Author = { key: number };

let nextKey = 1;

// Authors are free-text credits (name/affiliation/ORCID/email), not
// necessarily platform accounts - see docs/adr/0004-visualization-sheets.md.
// Submitted as repeated form fields (authorName, authorAffiliation, ...);
// the server action zips them back together by index via FormData.getAll().
export function AuthorsField() {
  const [authors, setAuthors] = useState<Author[]>([{ key: 0 }]);

  return (
    <div className="flex flex-col gap-3">
      {authors.map((author, i) => (
        <div
          key={author.key}
          className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 p-3 dark:border-gray-800"
        >
          <Input name="authorName" placeholder="Name" required={i === 0} />
          <Input name="authorAffiliation" placeholder="Affiliation (optional)" />
          <Input name="authorOrcid" placeholder="ORCID iD (optional)" />
          <Input name="authorEmail" type="email" placeholder="Email (optional)" />
          {authors.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setAuthors((prev) => prev.filter((a) => a.key !== author.key))
              }
              className="col-span-2 justify-self-start text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        onClick={() => setAuthors((prev) => [...prev, { key: nextKey++ }])}
      >
        + Add another author
      </Button>
    </div>
  );
}
