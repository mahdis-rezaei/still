import { Link, useRoute, useLocation } from "wouter";
import { AppNav } from "@/components/app-nav";
import {
  useCollection,
  useDeleteCollection,
  useRemoveFromCollection,
  KIND_LABEL,
  type CollectionItem,
} from "@/lib/use-collections";

function longDate(d: string | null): string {
  if (!d) return "Undated";
  const parsed = new Date(d + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ItemCard({
  item,
  onRemove,
}: {
  item: CollectionItem;
  onRemove: () => void;
}) {
  return (
    <div className="border border-border rounded-2xl bg-surface/70 p-6">
      <div className="flex items-start justify-between gap-4 mb-2">
        <span className="font-sans text-xs text-faint-ink">
          {longDate(item.entryDate)}
        </span>
        <button
          onClick={onRemove}
          className="font-sans text-xs text-faint-ink hover:text-soft-ink transition-colors"
        >
          remove
        </button>
      </div>
      {item.title && item.title.trim() && (
        <p className="font-display text-lg text-deep-brown mb-1">{item.title}</p>
      )}
      <p className="font-body text-ink leading-relaxed whitespace-pre-wrap">
        {item.excerpt}
      </p>
      <Link
        href={`/library/${item.entryId}`}
        className="inline-block mt-4 font-sans text-sm text-accent-sepia hover:text-deep-brown border-b border-accent-sepia/40 pb-0.5 transition-colors"
      >
        Read the full page →
      </Link>
    </div>
  );
}

export default function CollectionDetail() {
  const [, params] = useRoute("/collections/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ?? "";
  const { data, isLoading } = useCollection(id);
  const del = useDeleteCollection();
  const removeItem = useRemoveFromCollection();

  async function deleteCollection() {
    await del.mutateAsync(id);
    setLocation("/collections");
  }

  const isPair = data?.kind === "pair" && data.items.length === 2;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <AppNav />
      <main className="flex-1 w-full max-w-[760px] mx-auto px-6 py-12 md:py-16">
        <Link
          href="/collections"
          className="font-sans text-sm text-soft-ink hover:text-ink transition-colors"
        >
          ← Collections
        </Link>

        {isLoading || !data ? (
          <p className="font-sans text-sm text-faint-ink mt-10">Opening…</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4 mt-6 mb-8">
              <div>
                <p className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-1">
                  {KIND_LABEL[data.kind]}
                </p>
                <h1 className="font-display text-4xl text-deep-brown">
                  {data.name}
                </h1>
              </div>
              <button
                onClick={deleteCollection}
                className="font-sans text-xs text-faint-ink hover:text-soft-ink transition-colors shrink-0"
              >
                delete collection
              </button>
            </div>

            {data.items.length === 0 ? (
              <p className="font-body text-soft-ink">
                This collection is empty. Open a page and add it from the
                “Collections” control.
              </p>
            ) : isPair ? (
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <p className="font-sans text-xs uppercase tracking-[0.2em] text-accent-sepia mb-3">
                    Before
                  </p>
                  <ItemCard
                    item={data.items[0]}
                    onRemove={() =>
                      removeItem.mutate({
                        collectionId: id,
                        entryId: data.items[0].entryId,
                      })
                    }
                  />
                </div>
                <div>
                  <p className="font-sans text-xs uppercase tracking-[0.2em] text-accent-sepia mb-3">
                    After
                  </p>
                  <ItemCard
                    item={data.items[1]}
                    onRemove={() =>
                      removeItem.mutate({
                        collectionId: id,
                        entryId: data.items[1].entryId,
                      })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {data.items.map((item) => (
                  <ItemCard
                    key={item.entryId}
                    item={item}
                    onRemove={() =>
                      removeItem.mutate({ collectionId: id, entryId: item.entryId })
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
