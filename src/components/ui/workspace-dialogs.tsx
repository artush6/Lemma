import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "./alert-dialog";

type Request = { kind: "text" | "confirm"; title: string; initial?: string };
export function useWorkspaceDialogs() {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");
  const resolve = useRef<((result: string | boolean | null) => void) | null>(null);
  const finish = (result: string | boolean | null) => {
    resolve.current?.(result);
    resolve.current = null;
    setRequest(null);
  };
  useEffect(
    () => () => {
      resolve.current?.(null);
    },
    [],
  );
  const ask = (title: string, initial = "") =>
    new Promise<string | null>((done) => {
      resolve.current?.(null);
      resolve.current = (result) => done(typeof result === "string" ? result : null);
      setValue(initial);
      setRequest({ kind: "text", title, initial });
    });
  const confirm = (title: string) =>
    new Promise<boolean>((done) => {
      resolve.current?.(null);
      resolve.current = (result) => done(result === true);
      setRequest({ kind: "confirm", title });
    });
  const dialogs = (
    <>
      <Dialog
        open={request?.kind === "text"}
        onOpenChange={(open) => {
          if (!open) finish(null);
        }}
      >
        <DialogContent className="workspace-dialog" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{request?.title}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) finish(value.trim());
            }}
          >
            <Input
              aria-label={request?.title || "Name"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => finish(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!value.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={request?.kind === "confirm"}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <AlertDialogContent className="workspace-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
            <AlertDialogDescription>{request?.title}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => finish(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => finish(true)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
  return { ask, confirm, dialogs };
}
