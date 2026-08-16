"use client";

import { useState } from "react";
import { Input } from "@/components/form";

export function VizSourceField() {
  const [source, setSource] = useState<"file" | "url">("file");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-300">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="vizSourceType"
            value="file"
            checked={source === "file"}
            onChange={() => setSource("file")}
          />
          Upload a file
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="vizSourceType"
            value="url"
            checked={source === "url"}
            onChange={() => setSource("url")}
          />
          Link to a hosted/interactive visualization
        </label>
      </div>

      {source === "file" ? (
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          required
          className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700 dark:text-gray-400 dark:file:bg-gray-100 dark:file:text-gray-900 dark:hover:file:bg-white"
        />
      ) : (
        <Input
          name="vizUrl"
          type="url"
          placeholder="https://observablehq.com/@you/your-viz"
          required
        />
      )}
    </div>
  );
}
