import { useEffect, useState, type FormEvent } from "react";
import type { Board, BoardShare, BoardShareUpdate } from "~/types";
import { Button, Dialog, Select, TextInput } from "~/components";
import { API } from "~/services";

interface SettingsDialogProps {
  open: boolean;
  board: Board | null;
  shares: BoardShare[];
  onClose: () => void;
  onUpdate: (board: Board, boardShares: BoardShare[]) => void;
}

function SettingsDialog({ open, board, shares, onClose, onUpdate }: SettingsDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shareUpdates, setShareUpdates] = useState<BoardShareUpdate[]>([]);
  const [submittingAddShare, setSubmittingAddShare] = useState(false);
  const [submittingDialog, setSubmittingDialog] = useState(false);
  const loading = submittingAddShare || submittingDialog;

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setName(board ? board.name : "");
    setShareUpdates(shares);
  }, [open, board, shares]);

  const handleSave = async () => {
    if (!board) return;

    setSubmittingDialog(true);
    try {
      const updatedBoard = await API.renameBoard(board.id, name);
      if (updatedBoard.error !== null) {
        alert(`Error updating board: ${updatedBoard.error}`);
        return;
      }

      const updatedShares = await API.updateBoardShares(board.id, shareUpdates);
      if (updatedShares.error !== null) {
        alert(`Error updating board shares: ${updatedShares.error}`);
        return;
      }

      onUpdate(updatedBoard.data, updatedShares.data);
      onClose();
    } finally {
      setSubmittingDialog(false);
    }
  };

  const handleAddShare = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !board) return;
    setSubmittingAddShare(true);
    try {
      const res = await API.shareBoard(board.id, email);
      if (res.error !== null) {
        alert(`Error sharing board: ${res.error}`);
        return;
      }

      setShareUpdates((prev) => [...prev, res.data]);
      setEmail("");
    } finally {
      setSubmittingAddShare(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <Dialog.Title>Settings</Dialog.Title>
      <Dialog.Content>
        <div>
          <h6 className="text-lg font-bold mb-1">Board name</h6>
          <TextInput
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            value={name}
            size="sm"
          />
        </div>
        <div className="mt-4">
          <h6 className="text-lg font-bold mb-1">Shares</h6>
          <form className="flex items-center gap-2 mb-2" onSubmit={handleAddShare}>
            <TextInput
              required
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Add user by email"
              disabled={loading}
              size="sm"
            />
            <Button type="submit" disabled={loading} loading={submittingAddShare} size="sm">
              Add
            </Button>
          </form>
          {shareUpdates.map((share) => (
            <div
              key={share.user.id}
              className="flex items-center justify-between py-2 border-b border-gray-200"
            >
              <div className="flex flex-col">
                <span className="font-semibold">{share.user.name}</span>
                <span className="text-sm">{share.user.email}</span>
              </div>
              <Select
                size="sm"
                disabled={loading}
                value={share.permission}
                onChange={(v) => {
                  setShareUpdates((prev) =>
                    prev.map((s) => (s.user.id === share.user.id ? { ...s, permission: v } : s)),
                  );
                }}
                options={[
                  {
                    value: "viewer",
                    label: "Viewer",
                  },
                  {
                    value: "editor",
                    label: "Editor",
                  },
                  {
                    value: "remove",
                    label: "Remove",
                  },
                ]}
              />
            </div>
          ))}
        </div>
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.Button onClick={handleSave} size="sm" disabled={loading} loading={submittingDialog}>
          Done
        </Dialog.Button>
      </Dialog.Footer>
    </Dialog>
  );
}

export { SettingsDialog, type SettingsDialogProps };
