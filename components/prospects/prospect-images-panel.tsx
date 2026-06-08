"use client";

import { Camera, ImagePlus } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { uploadProspectImage } from "@/app/prospects/[id]/actions";

type ProspectImageItem = {
  id: string;
  fileName: string;
  originalFileName: string | null;
  notes: string | null;
  createdAt: string;
  signedUrl: string | null;
};

const initialState: { error?: string; success?: string } = {};

export function ProspectImagesPanel({
  canModify,
  images,
  prospectId
}: {
  canModify: boolean;
  images: ProspectImageItem[];
  prospectId: string;
}) {
  const [state, formAction] = useFormState(uploadProspectImage, initialState);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-soft lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Images</h2>
          <p className="mt-1 text-sm text-muted">
            Photos terrain, croquis, plans ou visuels rattaches au prospect.
          </p>
        </div>
        <span className="rounded-md bg-background px-3 py-1 text-sm font-medium text-muted">
          {images.length} image(s)
        </span>
      </div>

      {canModify ? (
        <form action={formAction} className="mt-5 grid gap-3 rounded-md border border-border p-4 md:grid-cols-[1fr_1fr_auto]">
          <input name="prospect_id" type="hidden" value={prospectId} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Photo ou image</span>
            <input
              accept="image/*"
              capture="environment"
              className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              name="image"
              required
              type="file"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Note</span>
            <input
              className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              name="notes"
              placeholder="Ex : photo showroom, detail facade..."
            />
          </label>
          <SubmitButton />
          {state?.error ? (
            <p className="text-sm font-medium text-red-600 md:col-span-3">{state.error}</p>
          ) : null}
          {state?.success ? (
            <p className="text-sm font-medium text-emerald-700 md:col-span-3">{state.success}</p>
          ) : null}
        </form>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.length ? (
          images.map((image) => (
            <article className="overflow-hidden rounded-md border border-border bg-white" key={image.id}>
              {image.signedUrl ? (
                <a href={image.signedUrl} rel="noreferrer" target="_blank">
                  <img
                    alt={image.notes ?? image.fileName}
                    className="aspect-[4/3] w-full object-cover"
                    src={image.signedUrl}
                  />
                </a>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-background text-muted">
                  <Camera size={28} />
                </div>
              )}
              <div className="space-y-1 p-3 text-sm">
                <p className="break-words font-medium">{image.fileName}</p>
                <p className="text-xs text-muted">{formatDateTime(image.createdAt)}</p>
                {image.notes ? <p className="text-muted">{image.notes}</p> : null}
              </div>
            </article>
          ))
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border text-center text-sm text-muted sm:col-span-2 lg:col-span-3">
            <div>
              <ImagePlus className="mx-auto mb-2" size={24} />
              Aucune image rattachee a ce prospect.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 md:mt-6"
      disabled={pending}
      type="submit"
    >
      <Camera size={17} />
      {pending ? "Envoi..." : "Ajouter"}
    </button>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
