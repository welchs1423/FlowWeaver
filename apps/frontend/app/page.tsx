export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-6 text-center px-6">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          FlowWeaver
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-md">
          Node-based workflow automation tool. Build, connect, and automate your
          processes visually.
        </p>
        <span className="inline-block rounded-full bg-zinc-200 dark:bg-zinc-800 px-4 py-1 text-sm text-zinc-600 dark:text-zinc-300">
          Under construction
        </span>
      </main>
    </div>
  );
}
